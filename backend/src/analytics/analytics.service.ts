import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(salonId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const appointmentsToday = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startTime: {
          gte: today,
          lte: endOfToday,
        },
      },
      include: {
        service: true,
      },
    });

    const activeAppointments = appointmentsToday.filter(
      (appt) => appt.status !== 'CANCELLED' && appt.status !== 'NO_SHOW',
    );

    const todayRevenue = activeAppointments.reduce(
      (acc, curr) => acc + (curr.service?.price || 0),
      0,
    );
    const count = activeAppointments.length;

    // AI Handled chats mock
    const aiHandledChats = await this.prisma.message.count({
      where: {
        conversation: { salonId },
        direction: 'OUTBOUND',
        timestamp: { gte: today },
      },
    });

    // New Customers mock
    const newCustomers = await this.prisma.customer.count({
      where: {
        salonId,
        createdAt: { gte: today },
      },
    });

    // Missed calls metrics
    const totalMissedCalls = await this.prisma.missedCall.count({
      where: { salonId },
    });
    const missedCallBookings = await this.prisma.missedCall.count({
      where: { salonId, status: 'BOOKED' },
    });
    const missedCallConversionRate =
      totalMissedCalls > 0
        ? Math.round((missedCallBookings / totalMissedCalls) * 100)
        : 0;

    // Reviews metrics
    const reviewRequestsSent = await this.prisma.reviewCampaign.count({
      where: { salonId, sentAt: { not: null } },
    });
    const reviewLinkClicks = await this.prisma.reviewCampaign.count({
      where: { salonId, clickedAt: { not: null } },
    });
    const estimatedReviewsGenerated = Math.round(reviewLinkClicks * 0.4);

    const reviewsCollected = await this.prisma.reviewCampaign.count({
      where: { salonId, rating: { not: null } },
    });

    const ratingAggregate = await this.prisma.reviewCampaign.aggregate({
      where: { salonId, rating: { not: null } },
      _avg: { rating: true },
    });
    const averageRating = ratingAggregate._avg.rating
      ? parseFloat(ratingAggregate._avg.rating.toFixed(1))
      : 0.0;

    const reviewConversionRate = reviewRequestsSent > 0
      ? Math.round((reviewsCollected / reviewRequestsSent) * 100)
      : 0;

    const positiveReviewsCount = await this.prisma.reviewCampaign.count({
      where: { salonId, rating: { gte: 4 } },
    });
    const positiveReviewRate = reviewsCollected > 0
      ? Math.round((positiveReviewsCount / reviewsCollected) * 100)
      : 0;

    const negativeReviewsCount = await this.prisma.reviewCampaign.count({
      where: { salonId, rating: { lte: 3 } },
    });
    const resolvedNegativeReviewsCount = await this.prisma.reviewCampaign.count({
      where: { salonId, rating: { lte: 3 }, resolved: true },
    });
    const negativeReviewRecoveryRate = negativeReviewsCount > 0
      ? Math.round((resolvedNegativeReviewsCount / negativeReviewsCount) * 100)
      : 0;

    // Rebookings metrics
    const rebookings = await this.prisma.rebookingRecommendation.findMany({
      where: { salonId, status: 'BOOKED' },
      include: { service: true },
    });
    const rebookingsGenerated = rebookings.length;
    const rebookingRevenueRecovered = rebookings.reduce(
      (sum, rec) => sum + (rec.service?.price || 0),
      0,
    );
    const customersDueForRebooking =
      await this.prisma.rebookingRecommendation.count({
        where: {
          salonId,
          dueDate: { lte: new Date() },
          status: { in: ['PENDING', 'APPROVED', 'SENT'] },
        },
      });

    // Language Distribution
    const languageDistribution = {
      english: await this.prisma.conversation.count({
        where: { salonId, language: 'ENGLISH' },
      }),
      hindi: await this.prisma.conversation.count({
        where: { salonId, language: 'HINDI' },
      }),
      hinglish: await this.prisma.conversation.count({
        where: { salonId, language: 'HINGLISH' },
      }),
    };

    // Conversion Rate by Language
    const getConversionRate = async (lang: string) => {
      const total = await this.prisma.conversation.count({
        where: { salonId, language: lang },
      });
      if (total === 0) return 0;
      const converted = await this.prisma.conversation.count({
        where: {
          salonId,
          language: lang,
          customer: {
            appointments: {
              some: {
                status: { in: ['CONFIRMED', 'COMPLETED', 'PENDING'] },
              },
            },
          },
        },
      });
      return Math.round((converted / total) * 100);
    };

    const conversionRateByLanguage = {
      english: await getConversionRate('ENGLISH'),
      hindi: await getConversionRate('HINDI'),
      hinglish: await getConversionRate('HINGLISH'),
    };

    // Top Phrases
    const recentInboundMessages = await this.prisma.message.findMany({
      where: {
        conversation: { salonId },
        direction: 'INBOUND',
      },
      select: { content: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'and',
      'a',
      'an',
      'to',
      'for',
      'in',
      'of',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'this',
      'that',
      'with',
      'my',
      'your',
      'me',
      'him',
      'her',
      'us',
      'them',
      'hai',
      'hoon',
      'tha',
      'thi',
      'the',
      'ko',
      'ki',
      'ka',
      'ke',
      'kya',
      'kab',
      'kaha',
      'kahan',
      'kaise',
      'kon',
      'kaun',
      'kyu',
      'kyun',
      'toh',
      'to',
      'se',
      'me',
      'mein',
      'par',
      'ek',
      'do',
      'teen',
      'chaar',
      'paanch',
      'aur',
      'ya',
      'na',
      'nahi',
      'nahin',
      'haan',
      'han',
      'ji',
      'acha',
      'accha',
      'thik',
      'theek',
      'abhi',
      'chalega',
      'karo',
      'gaya',
      'gaye',
      'gayi',
      'raha',
      'rahe',
      'rahi',
      'want',
      'please',
      'plz',
      'do',
      'kar',
      'karo',
      'appointment',
      'booking',
      'book',
    ]);
    const wordCounts: { [key: string]: number } = {};
    for (const msg of recentInboundMessages) {
      const words = msg.content
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .split(/\s+/);
      for (const word of words) {
        if (word && word.length > 2 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      }
    }
    let topPhrases = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    if (topPhrases.length === 0) {
      topPhrases = ['haircut', 'kal', 'price', 'aaj', 'appointment'];
    }

    return {
      todayRevenue,
      appointmentsToday: count,
      aiHandledChats,
      newCustomers,
      // Phase-2 Growth Metrics
      totalMissedCalls,
      missedCallConversionRate,
      missedCallBookings,
      reviewRequestsSent,
      reviewLinkClicks,
      estimatedReviewsGenerated,
      reviewsCollected,
      averageRating,
      reviewConversionRate,
      positiveReviewRate,
      negativeReviewRecoveryRate,
      rebookingsGenerated,
      rebookingRevenueRecovered,
      customersDueForRebooking,
      // Multilingual Metrics
      languageDistribution,
      conversionRateByLanguage,
      topPhrases,
    };
  }

  async getUcisMetrics(salonId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: { salonId },
      include: { service: true }
    });

    const customers = await this.prisma.customer.findMany({
      where: { salonId }
    });

    let onlineRevenue = 0;
    let offlineRevenue = 0;

    appointments.forEach((appt) => {
      const isOffline = appt.bookingSource && appt.bookingSource.startsWith('OFFLINE_');
      const revenue = appt.amountPaid !== null && appt.amountPaid !== undefined 
        ? appt.amountPaid 
        : (appt.service?.price || 0);

      if (isOffline) {
        offlineRevenue += revenue;
      } else {
        onlineRevenue += revenue;
      }
    });

    const totalRevenue = onlineRevenue + offlineRevenue;
    const onlineRatio = totalRevenue > 0 ? parseFloat(((onlineRevenue / totalRevenue) * 100).toFixed(1)) : 0;
    const offlineRatio = totalRevenue > 0 ? parseFloat(((offlineRevenue / totalRevenue) * 100).toFixed(1)) : 0;

    const acquisitionCounts: Record<string, number> = {
      walk_in: 0,
      whatsapp: 0,
      google: 0,
      instagram: 0,
      referral: 0,
      phone: 0,
      facebook: 0,
      other: 0
    };

    customers.forEach((cust) => {
      const src = (cust.source || 'WHATSAPP').toLowerCase();
      if (src.includes('walk_in') || src.includes('walkin')) {
        acquisitionCounts.walk_in++;
      } else if (src.includes('whatsapp')) {
        acquisitionCounts.whatsapp++;
      } else if (src.includes('google')) {
        acquisitionCounts.google++;
      } else if (src.includes('instagram')) {
        acquisitionCounts.instagram++;
      } else if (src.includes('referral')) {
        acquisitionCounts.referral++;
      } else if (src.includes('phone')) {
        acquisitionCounts.phone++;
      } else if (src.includes('facebook')) {
        acquisitionCounts.facebook++;
      } else {
        acquisitionCounts.other++;
      }
    });

    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CONFIRMED');
    const totalCompletedRevenue = completedAppointments.reduce((sum, a) => {
      return sum + (a.amountPaid !== null && a.amountPaid !== undefined ? a.amountPaid : (a.service?.price || 0));
    }, 0);
    const ticketSize = completedAppointments.length > 0 ? parseFloat((totalCompletedRevenue / completedAppointments.length).toFixed(2)) : 0;

    const customerVisitCounts: Record<string, number> = {};
    completedAppointments.forEach((a) => {
      customerVisitCounts[a.customerId] = (customerVisitCounts[a.customerId] || 0) + 1;
    });

    const activeCustomerCount = Object.keys(customerVisitCounts).length;
    const repeatCustomerCount = Object.values(customerVisitCounts).filter(count => count >= 2).length;
    const repeatCustomerRate = activeCustomerCount > 0 ? parseFloat(((repeatCustomerCount / activeCustomerCount) * 100).toFixed(1)) : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCustomers = new Set(
      completedAppointments
        .filter(a => a.startTime >= thirtyDaysAgo)
        .map(a => a.customerId)
    );
    const totalCustomersWithVisits = Object.keys(customerVisitCounts).length;
    let retentionRate = 0;
    if (totalCustomersWithVisits > 0) {
      retentionRate = parseFloat(((recentCustomers.size / totalCustomersWithVisits) * 100).toFixed(1));
    }

    return {
      revenue: {
        online: onlineRevenue,
        offline: offlineRevenue,
        ratio: { online: onlineRatio, offline: offlineRatio }
      },
      acquisition: acquisitionCounts,
      averages: {
        ticketSize,
        repeatCustomerRate,
        retentionRate
      }
    };
  }

  async getStaffUtilization(salonId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const staffList = await this.prisma.staff.findMany({
      where: { salonId },
    });

    const results = [];

    for (const staff of staffList) {
      const todayAppointments = await this.prisma.appointment.findMany({
        where: {
          salonId,
          staffId: staff.id,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          startTime: { gte: today, lte: endOfToday },
        },
        include: { service: true },
      });

      const todayBookedMinutes = todayAppointments.reduce((sum, appt) => {
        return sum + (appt.durationMins ?? appt.service?.durationMins ?? 0);
      }, 0);

      const todayWorkingMinutes = 480; // 8 hours
      const todayUtilization = parseFloat(((todayBookedMinutes / todayWorkingMinutes) * 100).toFixed(1));

      const monthlyAppointments = await this.prisma.appointment.findMany({
        where: {
          salonId,
          staffId: staff.id,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          startTime: { gte: thirtyDaysAgo, lte: endOfToday },
        },
        include: { service: true },
      });

      const monthlyBookedMinutes = monthlyAppointments.reduce((sum, appt) => {
        return sum + (appt.durationMins ?? appt.service?.durationMins ?? 0);
      }, 0);

      const monthlyWorkingMinutes = 14400; // 30 days * 8 hours
      const monthlyUtilization = parseFloat(((monthlyBookedMinutes / monthlyWorkingMinutes) * 100).toFixed(1));

      results.push({
        staffId: staff.id,
        staffName: staff.name,
        isAvailable: staff.isAvailable,
        todayBookedMinutes,
        todayUtilizationRate: todayUtilization > 100 ? 100 : todayUtilization,
        monthlyBookedMinutes,
        monthlyUtilizationRate: monthlyUtilization > 100 ? 100 : monthlyUtilization,
        totalAppointmentsCount: monthlyAppointments.length,
      });
    }

    return results;
  }

  async getRecoveryMetrics(salonId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: { salonId, status: { in: ['CONFIRMED', 'COMPLETED'] } },
      include: { service: true },
    });

    const conflictLogs = await this.prisma.auditLog.findMany({
      where: { salonId, action: 'BOOKING_CONFLICT' },
      select: { details: true, createdAt: true },
    });

    const waitlistConversions = await this.prisma.waitingList.count({
      where: { salonId, status: 'BOOKED' },
    });

    const cancellations = await this.prisma.auditLog.count({
      where: { salonId, action: 'CANCELLED_APPOINTMENT' },
    });

    const cancellationRecoveryRate = cancellations > 0
      ? Math.round((waitlistConversions / cancellations) * 100)
      : 0;

    let recoveredBookings = 0;
    let revenueSaved = 0;

    const waitlistBookedAppointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        bookingSource: 'ONLINE_AI',
      },
      include: { service: true },
    });
    
    const waitlistRevenue = waitlistBookedAppointments.reduce((sum, appt) => sum + (appt.service?.price || 0), 0);
    revenueSaved += waitlistRevenue;

    const lostBookings = conflictLogs.length;

    for (const appt of appointments) {
      if (appt.bookingSource === 'ONLINE_AI') continue;

      const customerConflict = conflictLogs.find((log: any) => {
        const details = log.details as any;
        return details?.customerId === appt.customerId &&
               new Date(log.createdAt).getTime() < new Date(appt.createdAt).getTime() &&
               new Date(appt.createdAt).getTime() - new Date(log.createdAt).getTime() < 3600000;
      });

      if (customerConflict) {
        recoveredBookings++;
        revenueSaved += appt.service?.price || 0;
      }
    }

    return {
      lostBookings,
      recoveredBookings,
      waitlistConversions,
      cancellationRecoveryRate,
      revenueSaved,
    };
  }
}
