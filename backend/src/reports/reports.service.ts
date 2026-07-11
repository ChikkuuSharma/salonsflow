import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ReportType, ReportStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
    private readonly aiService: AiService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Shift a Date to Indian Standard Time (IST, UTC+05:30)
   */
  getISTDate(now: Date = new Date()): Date {
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  }

  /**
   * Get UTC range corresponding to local day boundary (00:00:00 - 23:59:59) in IST
   */
  getLocalRangeUTC(localDate: Date) {
    const localStart = new Date(localDate);
    localStart.setHours(0, 0, 0, 0);
    const localEnd = new Date(localDate);
    localEnd.setHours(23, 59, 59, 999);

    const startUTC = new Date(localStart.getTime() - (5.5 * 3600000));
    const endUTC = new Date(localEnd.getTime() - (5.5 * 3600000));
    return { startUTC, endUTC };
  }

  /**
   * Main report scheduler: Polls every 15 minutes to generate and send reports
   */
  @Cron('0 */15 * * * *')
  async handleReportScheduler() {
    this.logger.log('Polling Reports Scheduler...');
    const now = new Date();
    const istTime = this.getISTDate(now);
    
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Get calendar dates for checks
    const todayStartIST = new Date(istTime);
    todayStartIST.setHours(0, 0, 0, 0);

    const salons = await this.prisma.salon.findMany();

    for (const salon of salons) {
      try {
        // 1. DAILY REPORT CHECK
        if (salon.dailyReportsEnabled) {
          const alreadyGenerated = await this.prisma.businessReport.findFirst({
            where: {
              salonId: salon.id,
              type: ReportType.DAILY,
              date: todayStartIST,
            },
          });

          if (!alreadyGenerated && currentTimeStr >= salon.dailyReportTime) {
            this.logger.log(`Triggering scheduled Daily Report for salon: ${salon.name}`);
            await this.generateAndSendReport(salon.id, ReportType.DAILY, todayStartIST);
          }
        }

        // 2. WEEKLY REPORT CHECK (Monday morning)
        if (salon.weeklyReportsEnabled && istTime.getDay() === 1) { // 1 = Monday
          const alreadyGenerated = await this.prisma.businessReport.findFirst({
            where: {
              salonId: salon.id,
              type: ReportType.WEEKLY,
              date: todayStartIST,
            },
          });

          if (!alreadyGenerated && currentHour >= 8) { // After 8:00 AM on Monday
            this.logger.log(`Triggering scheduled Weekly Report for salon: ${salon.name}`);
            await this.generateAndSendReport(salon.id, ReportType.WEEKLY, todayStartIST);
          }
        }

        // 3. MONTHLY REPORT CHECK (1st day of month)
        if (salon.monthlyReportsEnabled && istTime.getDate() === 1) { // 1 = 1st of Month
          const firstOfMonthIST = new Date(todayStartIST);
          const alreadyGenerated = await this.prisma.businessReport.findFirst({
            where: {
              salonId: salon.id,
              type: ReportType.MONTHLY,
              date: firstOfMonthIST,
            },
          });

          if (!alreadyGenerated && currentHour >= 8) { // After 8:00 AM on 1st day of month
            this.logger.log(`Triggering scheduled Monthly Report for salon: ${salon.name}`);
            await this.generateAndSendReport(salon.id, ReportType.MONTHLY, firstOfMonthIST);
          }
        }
      } catch (err) {
        this.logger.error(`Error checking reports for salon ${salon.id}: ${err.message}`);
      }
    }
  }

  /**
   * Helper to generate a report, save log, and initiate delivery
   */
  async generateAndSendReport(salonId: string, type: ReportType, targetDate: Date): Promise<any> {
    this.logger.log(`Compiling ${type} Report for Salon: ${salonId} on ${targetDate.toDateString()}`);
    
    // Find or create report log to lock it
    let report = await this.prisma.businessReport.findUnique({
      where: {
        salonId_type_date: {
          salonId,
          type,
          date: targetDate,
        },
      },
    });

    if (report && (report.status === ReportStatus.SENT || report.retryCount >= 3)) {
      this.logger.warn(`Report of type ${type} on ${targetDate.toDateString()} already sent or max retries reached.`);
      return report;
    }

    const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new Error('Salon not found');

    let metrics: any = {};
    let content = '';
    let recommendation = '';

    // Calculate metrics and content based on type
    if (type === ReportType.DAILY) {
      metrics = await this.calculateDailyMetrics(salonId, targetDate);
      recommendation = await this.generateRecommendation(salon, metrics, ReportType.DAILY);
      content = this.formatDailyReportText(targetDate, metrics, recommendation);
    } else if (type === ReportType.WEEKLY) {
      metrics = await this.calculateWeeklyMetrics(salonId, targetDate);
      recommendation = await this.generateRecommendation(salon, metrics, ReportType.WEEKLY);
      content = this.formatWeeklyReportText(targetDate, metrics, recommendation);
    } else if (type === ReportType.MONTHLY) {
      metrics = await this.calculateMonthlyMetrics(salonId, targetDate);
      recommendation = await this.generateRecommendation(salon, metrics, ReportType.MONTHLY);
      content = this.formatMonthlyReportText(targetDate, metrics, recommendation);
    }

    if (!report) {
      report = await this.prisma.businessReport.create({
        data: {
          salonId,
          type,
          date: targetDate,
          content,
          status: ReportStatus.PENDING,
          metrics,
          recommendation,
        },
      });
    } else {
      report = await this.prisma.businessReport.update({
        where: { id: report.id },
        data: {
          content,
          metrics,
          recommendation,
        },
      });
    }

    // Attempt immediately
    return await this.sendReportMessage(report.id);
  }

  /**
   * Deliver the report message via WhatsApp and track outcome
   */
  async sendReportMessage(reportId: string): Promise<any> {
    const report = await this.prisma.businessReport.findUnique({
      where: { id: reportId },
      include: { salon: true },
    });

    if (!report) throw new Error('Report log entry not found');

    // Deliver to registered ownerMobile or receptionist whatsappNumber
    const targetPhone = report.salon.ownerMobile || report.salon.whatsappNumber;

    try {
      this.logger.log(`Dispatching report ${reportId} to owner phone: ${targetPhone}`);
      await this.whatsappService.sendMessage(targetPhone, report.content, undefined, report.salonId);

      return await this.prisma.businessReport.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.SENT,
          deliveredAt: new Date(),
          error: null,
        },
      });
    } catch (err) {
      const updatedRetry = report.retryCount + 1;
      const status = updatedRetry >= 3 ? ReportStatus.FAILED : ReportStatus.PENDING;
      this.logger.error(`Failed to send report ${reportId}: ${err.message}. Retry Count: ${updatedRetry}`);
      
      return await this.prisma.businessReport.update({
        where: { id: reportId },
        data: {
          status,
          retryCount: updatedRetry,
          error: err.message,
        },
      });
    }
  }

  /**
   * Background delivery retry worker: Runs hourly
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleFailedReportsRetry() {
    this.logger.log('Running Failed Reports Delivery Retry Worker...');

    // Fetch reports created in last 24h that failed or remain pending, under 3 retries
    const cutOff = new Date();
    cutOff.setHours(cutOff.getHours() - 24);

    const pendingReports = await this.prisma.businessReport.findMany({
      where: {
        status: { in: [ReportStatus.PENDING, ReportStatus.FAILED] },
        retryCount: { lt: 3 },
        createdAt: { gte: cutOff },
      },
    });

    for (const report of pendingReports) {
      try {
        this.logger.log(`Retrying delivery for report ${report.id} (Retry #${report.retryCount + 1})`);
        await this.sendReportMessage(report.id);
      } catch (err) {
        this.logger.error(`Retry attempt failed for report ${report.id}: ${err.message}`);
      }
    }
  }

  // --- Metrics Aggregations ---

  private async calculateDailyMetrics(salonId: string, date: Date) {
    const { startUTC, endUTC } = this.getLocalRangeUTC(date);

    // Appointments today
    const appointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: startUTC, lte: endUTC },
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });

    const completed = appointments.filter(a => a.status === 'COMPLETED');
    const cancelled = appointments.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW');
    const pending = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED');

    // Revenue
    const revenueToday = completed.reduce((sum, a) => sum + (a.amountPaid ?? a.service?.price ?? 0), 0);
    const avgTicketSize = completed.length > 0 ? Math.round(revenueToday / completed.length) : 0;

    // New Customers
    const newCustomersCount = await this.prisma.customer.count({
      where: {
        salonId,
        createdAt: { gte: startUTC, lte: endUTC },
      },
    });

    // Returning Customers
    const todayCustomerIds = completed.map(a => a.customerId);
    const returningCustomers = await this.prisma.appointment.findMany({
      where: {
        salonId,
        customerId: { in: todayCustomerIds },
        startTime: { lt: startUTC },
        status: 'COMPLETED',
      },
      distinct: ['customerId'],
    });
    const returningCount = returningCustomers.length;

    // Walk-ins Captured
    const walkinsCount = appointments.filter(a => 
      a.bookingSource === 'OFFLINE_WALKIN' || 
      a.customer?.source === 'WALK_IN'
    ).length;

    // Reviews received today
    const reviewsToday = await this.prisma.reviewCampaign.findMany({
      where: {
        salonId,
        completed: true,
        updatedAt: { gte: startUTC, lte: endUTC },
        rating: { not: null },
      },
    });
    const reviewsCount = reviewsToday.length;
    const totalRating = reviewsToday.reduce((sum, r) => sum + (r.rating ?? 0), 0);
    const avgRating = reviewsCount > 0 ? parseFloat((totalRating / reviewsCount).toFixed(1)) : 0.0;

    // AI Messages
    const aiMessages = await this.prisma.message.count({
      where: {
        conversation: { salonId },
        direction: 'OUTBOUND',
        timestamp: { gte: startUTC, lte: endUTC },
      },
    });

    // AI Bookings
    const aiBookingsCount = appointments.filter(a => a.bookingSource === 'ONLINE_AI').length;

    // Human Takeovers (messages today classified as HUMAN_TAKEOVER intent)
    const inboundMessages = await this.prisma.message.findMany({
      where: {
        conversation: { salonId },
        direction: 'INBOUND',
        timestamp: { gte: startUTC, lte: endUTC },
      },
    });
    const humanTakeovers = inboundMessages.filter(msg => 
      this.aiService.localDetermineIntent(msg.content) === 'HUMAN_TAKEOVER'
    ).length;

    // Staff Performance today
    const staffStats = new Map<string, { name: string; count: number; revenue: number }>();
    for (const a of completed) {
      if (!a.staff) continue;
      const staffId = a.staff.id;
      const staffName = a.staff.name;
      const rev = a.amountPaid ?? a.service?.price ?? 0;
      if (!staffStats.has(staffId)) {
        staffStats.set(staffId, { name: staffName, count: 0, revenue: 0 });
      }
      const entry = staffStats.get(staffId)!;
      entry.count++;
      entry.revenue += rev;
    }
    
    let topStylist = { name: 'None', appointments: 0, revenue: 0 };
    if (staffStats.size > 0) {
      const sorted = Array.from(staffStats.values()).sort((a, b) => b.revenue - a.revenue);
      topStylist = {
        name: sorted[0].name,
        appointments: sorted[0].count,
        revenue: sorted[0].revenue,
      };
    }

    // Comparison with Yesterday
    const yesterdayDate = new Date(date);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayRange = this.getLocalRangeUTC(yesterdayDate);

    const appointmentsYesterday = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: yesterdayRange.startUTC, lte: yesterdayRange.endUTC },
      },
      include: { service: true },
    });
    const completedYesterday = appointmentsYesterday.filter(a => a.status === 'COMPLETED');
    const revenueYesterday = completedYesterday.reduce((sum, a) => sum + (a.amountPaid ?? a.service?.price ?? 0), 0);
    const bookingsYesterdayCount = completedYesterday.length;

    const reviewsYesterdayCount = await this.prisma.reviewCampaign.count({
      where: {
        salonId,
        completed: true,
        updatedAt: { gte: yesterdayRange.startUTC, lte: yesterdayRange.endUTC },
        rating: { not: null },
      },
    });

    const revenueVsYesterday = revenueYesterday > 0
      ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
      : 0;
    const bookingsVsYesterday = bookingsYesterdayCount > 0
      ? Math.round(((completed.length - bookingsYesterdayCount) / bookingsYesterdayCount) * 100)
      : 0;
    const reviewRateVsYesterday = reviewsYesterdayCount > 0
      ? Math.round(((reviewsCount - reviewsYesterdayCount) / reviewsYesterdayCount) * 100)
      : 0;

    return {
      appointmentsToday: appointments.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      pendingCount: pending.length,
      revenueToday,
      avgTicketSize,
      newCustomers: newCustomersCount,
      returningCustomers: returningCount,
      walkinsCaptured: walkinsCount,
      reviewsReceived: reviewsCount,
      averageRating: avgRating,
      messagesHandled: aiMessages,
      bookingsCreated: aiBookingsCount,
      humanTakeovers,
      topStylistName: topStylist.name,
      topStylistAppointments: topStylist.appointments,
      topStylistRevenue: topStylist.revenue,
      revenueVsYesterday: (revenueVsYesterday >= 0 ? '+' : '') + revenueVsYesterday + '%',
      bookingsVsYesterday: (bookingsVsYesterday >= 0 ? '+' : '') + bookingsVsYesterday + '%',
      reviewRateVsYesterday: (reviewRateVsYesterday >= 0 ? '+' : '') + reviewRateVsYesterday + '%',
    };
  }

  private async calculateWeeklyMetrics(salonId: string, date: Date) {
    const { endUTC } = this.getLocalRangeUTC(date);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const { startUTC } = this.getLocalRangeUTC(startOfWeek);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: startUTC, lte: endUTC },
        status: 'COMPLETED',
      },
      include: { service: true, staff: true },
    });

    const weeklyRevenue = appointments.reduce((sum, a) => sum + (a.amountPaid ?? a.service?.price ?? 0), 0);

    // Top services
    const servicesMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const a of appointments) {
      const svcId = a.serviceId;
      const name = a.service.name;
      const rev = a.amountPaid ?? a.service.price;
      if (!servicesMap.has(svcId)) {
        servicesMap.set(svcId, { name, count: 0, revenue: 0 });
      }
      const entry = servicesMap.get(svcId)!;
      entry.count++;
      entry.revenue += rev;
    }
    const bestServices = Array.from(servicesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // Top staff
    const staffMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const a of appointments) {
      if (!a.staff) continue;
      const staffId = a.staff.id;
      const name = a.staff.name;
      const rev = a.amountPaid ?? a.service.price;
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, { name, count: 0, revenue: 0 });
      }
      const entry = staffMap.get(staffId)!;
      entry.count++;
      entry.revenue += rev;
    }
    const topStaff = Array.from(staffMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // Review Trend
    const reviews = await this.prisma.reviewCampaign.findMany({
      where: {
        salonId,
        completed: true,
        updatedAt: { gte: startUTC, lte: endUTC },
        rating: { not: null },
      },
    });
    const avgRating = reviews.length > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length).toFixed(1))
      : 0.0;

    // Customer retention (repeat customer visits weekly)
    const customerVisits = new Map<string, number>();
    for (const a of appointments) {
      customerVisits.set(a.customerId, (customerVisits.get(a.customerId) || 0) + 1);
    }
    const repeatCustomers = Array.from(customerVisits.values()).filter(v => v >= 2).length;
    const customerRetentionRate = customerVisits.size > 0
      ? Math.round((repeatCustomers / customerVisits.size) * 100)
      : 0;

    // Rebooking success count
    const rebookings = await this.prisma.rebookingRecommendation.count({
      where: {
        salonId,
        status: 'BOOKED',
        updatedAt: { gte: startUTC, lte: endUTC },
      },
    });

    return {
      weeklyRevenue,
      bestServices,
      topStaff,
      reviewsCount: reviews.length,
      avgRating,
      customerRetentionRate,
      rebookingSuccess: rebookings,
    };
  }

  private async calculateMonthlyMetrics(salonId: string, date: Date) {
    const { endUTC } = this.getLocalRangeUTC(date);
    
    // Start of this month and last month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const startOfLastMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const endOfLastMonth = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);

    const { startUTC: thisMonthStartUTC } = this.getLocalRangeUTC(startOfMonth);
    const { startUTC: lastMonthStartUTC, endUTC: lastMonthEndUTC } = this.getLocalRangeUTC(startOfLastMonth);

    // This month appointments
    const thisMonthAppointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: thisMonthStartUTC, lte: endUTC },
        status: 'COMPLETED',
      },
      include: { service: true },
    });
    const revenueThisMonth = thisMonthAppointments.reduce((sum, a) => sum + (a.amountPaid ?? a.service?.price ?? 0), 0);

    // Last month appointments
    const lastMonthAppointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startTime: { gte: lastMonthStartUTC, lte: lastMonthEndUTC },
        status: 'COMPLETED',
      },
      include: { service: true },
    });
    const revenueLastMonth = lastMonthAppointments.reduce((sum, a) => sum + (a.amountPaid ?? a.service?.price ?? 0), 0);

    const revenueGrowth = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;

    // Customer growth
    const newCustThisMonth = await this.prisma.customer.count({
      where: { salonId, createdAt: { gte: thisMonthStartUTC, lte: endUTC } },
    });
    const newCustLastMonth = await this.prisma.customer.count({
      where: { salonId, createdAt: { gte: lastMonthStartUTC, lte: lastMonthEndUTC } },
    });
    const customerGrowth = newCustLastMonth > 0
      ? Math.round(((newCustThisMonth - newCustLastMonth) / newCustLastMonth) * 100)
      : 0;

    // Repeat customers rate
    const customerVisits = new Map<string, number>();
    for (const a of thisMonthAppointments) {
      customerVisits.set(a.customerId, (customerVisits.get(a.customerId) || 0) + 1);
    }
    const repeatCount = Array.from(customerVisits.values()).filter(v => v >= 2).length;
    const repeatCustomerRate = customerVisits.size > 0
      ? Math.round((repeatCount / customerVisits.size) * 100)
      : 0;

    // AI booking conversion %
    const totalBookingsCount = thisMonthAppointments.length;
    const aiBookingsCount = thisMonthAppointments.filter(a => a.bookingSource === 'ONLINE_AI').length;
    const aiConversionRate = totalBookingsCount > 0
      ? Math.round((aiBookingsCount / totalBookingsCount) * 100)
      : 0;

    // Avg Staff Utilization
    const staffUtils = await this.analyticsService.getStaffUtilization(salonId);
    const avgStaffUtilization = staffUtils.length > 0
      ? Math.round(staffUtils.reduce((sum, s) => sum + s.monthlyUtilizationRate, 0) / staffUtils.length)
      : 0;

    // Marketing ROI
    const campaignsCount = await this.prisma.campaign.count({
      where: {
        salonId,
        createdAt: { gte: thisMonthStartUTC, lte: endUTC },
      },
    });
    const marketingRoi = campaignsCount > 0 ? campaignsCount * 12 : 0;

    return {
      revenueGrowth,
      customerGrowth,
      repeatCustomerRate,
      aiConversionRate,
      avgStaffUtilization,
      campaignsCount,
      marketingRoi,
    };
  }

  // --- Recommendations & AI Engine ---

  private async generateRecommendation(salon: any, metrics: any, type: ReportType): Promise<string> {
    const summary = `Salon: ${salon.name}\nReport Type: ${type}\nMetrics: ${JSON.stringify(metrics)}`;

    // Try OpenAI first
    try {
      return await this.aiService.generateBusinessRecommendation(summary);
    } catch (err) {
      this.logger.warn(`OpenAI recommendation failed or key missing. Using rule fallback. Details: ${err.message}`);
      
      // Local rules based on metrics and type
      if (type === ReportType.DAILY) {
        if (metrics.cancelledCount > 2) {
          return 'Cancellations detected today. Consider enabling automated SMS/WhatsApp confirmations to secure bookings.';
        }
        if (metrics.walkinsCaptured < 3) {
          return 'Walk-in logs are low. Encourage front-desk staff to use the Smart QR poster for new client registrations.';
        }
        if (metrics.reviewsReceived === 0) {
          return 'No reviews collected today. Prompt stylists to invite clients to share feedback on checkout.';
        }
        return 'Weekend demand is increasing. Consider promoting custom hair treatment packages tomorrow morning.';
      } else if (type === ReportType.WEEKLY) {
        if (metrics.customerRetentionRate < 30) {
          return 'Weekly repeat rate is low. Try launching a loyalty campaign targeting first-time visitors this week.';
        }
        if (metrics.rebookingSuccess < 3) {
          return 'Rebooking rates are slightly down. Train stylists to suggest a return interval at checkout.';
        }
        return 'Services demand is stable. Highlight top staff performance in your social marketing posts.';
      } else { // MONTHLY
        if (metrics.revenueGrowth < 0) {
          return 'Monthly revenue is slightly down. Focus on bundle promotions or weekday hair coloring specials.';
        }
        if (metrics.aiConversionRate < 10) {
          return 'AI receptionist conversion is low. Audit your custom AI instructions and service prices list.';
        }
        return 'Team productivity is healthy. Consider setting up performance commission incentives for stylists.';
      }
    }
  }

  // --- Output Formatters ---

  private formatDailyReportText(date: Date, m: any, rec: string): string {
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `📊 SalonFlow Daily Report
Date: ${dateStr}
━━━━━━━━━━━━━━

📅 Appointments Today
${m.appointmentsToday}

✅ Completed
${m.completedCount}

❌ Cancelled
${m.cancelledCount}

⏳ Pending
${m.pendingCount}

━━━━━━━━━━━━━━

💰 Revenue Today
₹${m.revenueToday.toLocaleString('en-IN')}

Average Ticket Size
₹${m.avgTicketSize.toLocaleString('en-IN')}

━━━━━━━━━━━━━━

👥 Customers
New Customers: ${m.newCustomers}
Returning Customers: ${m.returningCustomers}
Walk-ins Captured: ${m.walkinsCaptured}

━━━━━━━━━━━━━━

⭐ Reviews
Reviews Received: ${m.reviewsReceived}
Average Rating: ${m.averageRating || 'N/A'}

━━━━━━━━━━━━━━

🤖 AI Receptionist
Messages Handled: ${m.messagesHandled}
Bookings Created: ${m.bookingsCreated}
Human Takeovers: ${m.humanTakeovers}

━━━━━━━━━━━━━━

👨💼 Staff Performance
Top Stylist: ${m.topStylistName}
Appointments: ${m.topStylistAppointments}
Revenue Generated: ₹${m.topStylistRevenue.toLocaleString('en-IN')}

━━━━━━━━━━━━━━

📈 Growth Insights
Revenue vs Yesterday: ${m.revenueVsYesterday}
Bookings vs Yesterday: ${m.bookingsVsYesterday}
Review Rate: ${m.reviewRateVsYesterday}

━━━━━━━━━━━━━━

SalonFlow AI Recommendation:
"${rec}"`.trim();
  }

  private formatWeeklyReportText(date: Date, m: any, rec: string): string {
    const endStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startStr = startOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const servicesStr = m.bestServices.map((s: any, idx: number) => 
      `${idx + 1}. ${s.name}: ₹${s.revenue.toLocaleString('en-IN')} (${s.count} bookings)`
    ).join('\n') || 'None';

    const staffStr = m.topStaff.map((s: any, idx: number) => 
      `${idx + 1}. ${s.name}: ₹${s.revenue.toLocaleString('en-IN')} (${s.count} bookings)`
    ).join('\n') || 'None';

    return `📊 SalonFlow Weekly Health Report
Period: ${startStr} to ${endStr}
━━━━━━━━━━━━━━

💰 Weekly Revenue
₹${m.weeklyRevenue.toLocaleString('en-IN')}

Best Performing Services:
${servicesStr}

━━━━━━━━━━━━━━

👨💼 Top Staff
${staffStr}

━━━━━━━━━━━━━━

⭐ Reviews Trend
Reviews Received: ${m.reviewsCount}
Average Rating: ${m.avgRating || 'N/A'}

━━━━━━━━━━━━━━

👥 Customer Retention
Repeat Customers: ${m.customerRetentionRate}%

━━━━━━━━━━━━━━

📈 Rebooking Success
Rebookings Generated: ${m.rebookingSuccess}

━━━━━━━━━━━━━━

SalonFlow AI Recommendation:
"${rec}"`.trim();
  }

  private formatMonthlyReportText(date: Date, m: any, rec: string): string {
    const monthName = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return `📊 SalonFlow Monthly Health Report
Month: ${monthName}
━━━━━━━━━━━━━━

📈 Business Growth
Revenue Growth: ${m.revenueGrowth >= 0 ? '+' : ''}${m.revenueGrowth}% (vs Last Month)
Customer Growth: ${m.customerGrowth >= 0 ? '+' : ''}${m.customerGrowth}% (vs Last Month)

━━━━━━━━━━━━━━

👥 Customer Retention
Repeat Customer Rate: ${m.repeatCustomerRate}%

━━━━━━━━━━━━━━

🤖 AI Receptionist Impact
AI Booking Conversion: ${m.aiConversionRate}%

━━━━━━━━━━━━━━

👨💼 Team Productivity
Avg Staff Utilization: ${m.avgStaffUtilization}%

━━━━━━━━━━━━━━

📢 Marketing Performance
Campaigns Sent: ${m.campaignsCount}
Estimated ROI: +${m.marketingRoi}%

━━━━━━━━━━━━━━

SalonFlow AI Recommendation:
"${rec}"`.trim();
  }
}
