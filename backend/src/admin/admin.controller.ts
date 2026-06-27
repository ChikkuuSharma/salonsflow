import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { Role, SubscriptionPlan, SubscriptionStatus, LeadStatus } from '@prisma/client';

@Controller('api/v1/admin')
@UseGuards(ClerkAuthGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly remindersService: RemindersService,
  ) {}

  /**
   * Helper to verify if the requesting user has the SUPER_ADMIN role
   */
  private async checkSuperAdmin(req: any): Promise<void> {
    const clerkId = req.user?.sub;
    if (!clerkId) {
      throw new UnauthorizedException('Authentication token sub claims missing.');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser || dbUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied. Super Admin role required.');
    }
  }

  /**
   * Fetch platform-wide statistics for the Super Admin Dashboard
   */
  @Get('dashboard')
  async getDashboardStats(@Req() req: any) {
    await this.checkSuperAdmin(req);

    const [salons, subscriptions, totalAppointments, totalMessages] = await Promise.all([
      this.prisma.salon.findMany({
        include: { subscription: true },
      }),
      this.prisma.subscription.findMany(),
      this.prisma.appointment.count(),
      this.prisma.message.count(),
    ]);

    const totalSalons = salons.length;
    
    // Status counts
    const activeCount = subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE).length;
    const suspendedCount = subscriptions.filter((s) => s.status === SubscriptionStatus.SUSPENDED).length;
    const trialCount = subscriptions.filter((s) => s.status === SubscriptionStatus.TRIAL).length;
    const graceCount = subscriptions.filter((s) => s.status === SubscriptionStatus.GRACE_PERIOD).length;
    const expiredCount = subscriptions.filter((s) => s.status === SubscriptionStatus.EXPIRED).length;

    // Monthly actual revenue (from currently ACTIVE subscriptions)
    const basicActive = subscriptions.filter((s) => s.plan === SubscriptionPlan.BASIC && s.status === SubscriptionStatus.ACTIVE).length;
    const proActive = subscriptions.filter((s) => s.plan === SubscriptionPlan.PRO && s.status === SubscriptionStatus.ACTIVE).length;
    const monthlyRevenue = basicActive * 3000 + proActive * 5000;

    // Expected Revenue (signed-up paid accounts, regardless of active or grace/suspended status)
    const totalBasic = subscriptions.filter((s) => s.plan === SubscriptionPlan.BASIC).length;
    const totalPro = subscriptions.filter((s) => s.plan === SubscriptionPlan.PRO).length;
    const expectedRevenue = totalBasic * 3000 + totalPro * 5000;

    // Overdue payments (non-paying overdue statuses: grace_period + expired + suspended on paid tiers)
    const overdueSubscriptions = subscriptions.filter(
      (s) => ['GRACE_PERIOD', 'SUSPENDED', 'EXPIRED'].includes(s.status) && s.plan !== SubscriptionPlan.FREE
    );
    const overduePayments = overdueSubscriptions.reduce((acc, s) => {
      const price = s.plan === SubscriptionPlan.PRO ? 5000 : s.plan === SubscriptionPlan.BASIC ? 3000 : 0;
      return acc + price;
    }, 0);

    // Trial Conversion Rate
    const conversionRate = totalSalons > 0 
      ? Math.round(((totalBasic + totalPro) / totalSalons) * 100)
      : 0;

    return {
      totalSalons,
      totalActiveSalons: activeCount + trialCount + graceCount,
      totalSuspendedSalons: suspendedCount,
      monthlyRevenue,
      expectedRevenue,
      overduePayments,
      trialAccounts: trialCount,
      conversionRate,
      totalAppointments,
      totalWhatsAppMessages: totalMessages,
      activeSubscriptions: {
        FREE: subscriptions.filter((s) => s.plan === SubscriptionPlan.FREE).length,
        TRIAL: trialCount,
        BASIC: totalBasic,
        PRO: totalPro,
        GRACE_PERIOD: graceCount,
        SUSPENDED: suspendedCount,
        EXPIRED: expiredCount,
      },
    };
  }

  /**
   * List all salon vendors (tenants) along with their status and usage metrics
   */
  @Get('salons')
  async getSalons(@Req() req: any) {
    await this.checkSuperAdmin(req);

    const salons = await this.prisma.salon.findMany({
      include: {
        subscription: true,
        _count: {
          select: {
            customers: true,
            appointments: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedSalons = await Promise.all(
      salons.map(async (salon) => {
        const messageCount = await this.prisma.message.count({
          where: { conversation: { salonId: salon.id } },
        });

        const voiceNoteCount = await this.prisma.voiceNote.count({
          where: { message: { conversation: { salonId: salon.id } } },
        });

        // Compute AI and WhatsApp costs
        const openaiUsageCost = (voiceNoteCount * 1.50) + (messageCount * 0.15);
        const whatsappUsageCost = messageCount * 0.30;
        const estimatedMonthlyCost = openaiUsageCost + whatsappUsageCost;

        const plan = salon.subscription?.plan || SubscriptionPlan.FREE;
        const planPrice = plan === SubscriptionPlan.PRO ? 5000 : plan === SubscriptionPlan.BASIC ? 3000 : 0;
        const estimatedProfit = planPrice - estimatedMonthlyCost;

        return {
          id: salon.id,
          name: salon.name,
          whatsappNumber: salon.whatsappNumber,
          address: salon.address,
          createdAt: salon.createdAt,
          
          // Complete owner profile fields
          ownerName: salon.ownerName,
          ownerMobile: salon.ownerMobile,
          ownerAlternateMobile: salon.ownerAlternateMobile,
          ownerEmail: salon.ownerEmail,
          ownerAddress: salon.ownerAddress,
          ownerCity: salon.ownerCity,
          ownerState: salon.ownerState,
          ownerCountry: salon.ownerCountry,
          gstNumber: salon.gstNumber,
          businessCategory: salon.businessCategory,

          subscription: salon.subscription || {
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.TRIAL,
            currentPeriodEnd: null,
            openaiUsageCost: 0,
            whatsappUsageCost: 0,
          },
          costs: {
            openaiUsageCost,
            whatsappUsageCost,
            estimatedMonthlyCost,
            estimatedProfit,
          },
          metrics: {
            totalCustomers: salon._count.customers,
            totalAppointments: salon._count.appointments,
            totalUsers: salon._count.users,
          },
        };
      })
    );

    return mappedSalons;
  }

  /**
   * Manually override a salon's subscription level
   */
  @Patch('salons/:id/subscription')
  async overrideSubscription(
    @Req() req: any,
    @Param('id') salonId: string,
    @Body()
    body: {
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      currentPeriodEnd?: string;
    },
  ) {
    await this.checkSuperAdmin(req);

    if (!body.plan || !body.status) {
      throw new BadRequestException('plan and status parameters are required.');
    }

    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      throw new NotFoundException('Salon vendor not found.');
    }

    const currentPeriodEndDate = body.currentPeriodEnd
      ? new Date(body.currentPeriodEnd)
      : null;

    const updatedSubscription = await this.prisma.subscription.upsert({
      where: { salonId },
      update: {
        plan: body.plan,
        status: body.status,
        currentPeriodEnd: currentPeriodEndDate,
      },
      create: {
        salonId,
        plan: body.plan,
        status: body.status,
        currentPeriodEnd: currentPeriodEndDate,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        salonId,
        action: 'SUPER_ADMIN_SUBSCRIPTION_OVERRIDE',
        details: {
          plan: body.plan,
          status: body.status,
          currentPeriodEnd: body.currentPeriodEnd,
          executedBy: req.user.sub,
        },
      },
    });

    return updatedSubscription;
  }

  /**
   * Subscription Control Action triggers (Feature 4)
   */
  @Patch('salons/:id/subscription/action')
  async performSubscriptionAction(
    @Req() req: any,
    @Param('id') salonId: string,
    @Body()
    body: {
      action: 'UPGRADE' | 'DOWNGRADE' | 'EXTEND' | 'ADD_TRIAL_DAYS' | 'SUSPEND' | 'REACTIVATE';
      plan?: SubscriptionPlan;
      days?: number;
    },
  ) {
    await this.checkSuperAdmin(req);

    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      include: { subscription: true },
    });

    if (!salon) {
      throw new NotFoundException('Salon vendor not found.');
    }

    const currentSub = salon.subscription || {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.TRIAL,
      currentPeriodEnd: null,
    };

    let updatedPlan = currentSub.plan;
    let updatedStatus = currentSub.status;
    let updatedPeriodEnd = currentSub.currentPeriodEnd ? new Date(currentSub.currentPeriodEnd) : null;

    const action = body.action;
    const previousValue = { plan: currentSub.plan, status: currentSub.status, currentPeriodEnd: currentSub.currentPeriodEnd };

    if (action === 'UPGRADE' || action === 'DOWNGRADE') {
      if (!body.plan) throw new BadRequestException('plan parameter is required.');
      updatedPlan = body.plan;
      if (['SUSPENDED', 'EXPIRED', 'CANCELED'].includes(updatedStatus) || updatedStatus === SubscriptionStatus.TRIAL) {
        updatedStatus = SubscriptionStatus.ACTIVE;
      }
    } else if (action === 'EXTEND') {
      const days = body.days || 30;
      const baseDate = updatedPeriodEnd && updatedPeriodEnd.getTime() > Date.now() ? updatedPeriodEnd : new Date();
      updatedPeriodEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
      if (updatedStatus === SubscriptionStatus.EXPIRED || updatedStatus === SubscriptionStatus.SUSPENDED) {
        updatedStatus = SubscriptionStatus.ACTIVE;
      }
    } else if (action === 'ADD_TRIAL_DAYS') {
      const days = body.days || 14;
      const baseDate = updatedPeriodEnd && updatedPeriodEnd.getTime() > Date.now() ? updatedPeriodEnd : new Date();
      updatedPeriodEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
      updatedStatus = SubscriptionStatus.TRIAL;
    } else if (action === 'SUSPEND') {
      updatedStatus = SubscriptionStatus.SUSPENDED;
    } else if (action === 'REACTIVATE') {
      updatedStatus = SubscriptionStatus.ACTIVE;
      if (!updatedPeriodEnd || updatedPeriodEnd.getTime() < Date.now()) {
        updatedPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      throw new BadRequestException('Invalid subscription action.');
    }

    const updatedSub = await this.prisma.subscription.upsert({
      where: { salonId },
      update: {
        plan: updatedPlan,
        status: updatedStatus,
        currentPeriodEnd: updatedPeriodEnd,
      },
      create: {
        salonId,
        plan: updatedPlan,
        status: updatedStatus,
        currentPeriodEnd: updatedPeriodEnd,
      },
    });

    const newValue = { plan: updatedSub.plan, status: updatedSub.status, currentPeriodEnd: updatedSub.currentPeriodEnd };

    // Record Audit Log (Feature 5)
    await this.prisma.auditLog.create({
      data: {
        salonId,
        action: `SUPER_ADMIN_SUBSCRIPTION_${action}`,
        details: {
          previousValue,
          newValue,
          executedBy: req.user.sub,
        },
      },
    });

    return updatedSub;
  }

  /**
   * Update Salon Owner Profile (Feature 3)
   */
  @Patch('salons/:id/profile')
  async updateSalonProfile(
    @Req() req: any,
    @Param('id') salonId: string,
    @Body()
    body: {
      name?: string;
      whatsappNumber?: string;
      address?: string;
      ownerName?: string;
      ownerMobile?: string;
      ownerAlternateMobile?: string;
      ownerEmail?: string;
      ownerAddress?: string;
      ownerCity?: string;
      ownerState?: string;
      ownerCountry?: string;
      gstNumber?: string;
      businessCategory?: string;
    },
  ) {
    await this.checkSuperAdmin(req);

    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      throw new NotFoundException('Salon vendor not found.');
    }

    const updatedSalon = await this.prisma.salon.update({
      where: { id: salonId },
      data: {
        name: body.name,
        whatsappNumber: body.whatsappNumber,
        address: body.address,
        ownerName: body.ownerName,
        ownerMobile: body.ownerMobile,
        ownerAlternateMobile: body.ownerAlternateMobile,
        ownerEmail: body.ownerEmail,
        ownerAddress: body.ownerAddress,
        ownerCity: body.ownerCity,
        ownerState: body.ownerState,
        ownerCountry: body.ownerCountry,
        gstNumber: body.gstNumber,
        businessCategory: body.businessCategory,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        salonId,
        action: 'SUPER_ADMIN_PROFILE_UPDATE',
        details: {
          updatedFields: body,
          executedBy: req.user.sub,
        },
      },
    });

    return updatedSalon;
  }

  /**
   * Trigger the expiration checks manually for testing & validation (NFR / QA trigger)
   */
  @Post('subscriptions/check-expirations')
  async triggerExpirationsCheck(@Req() req: any) {
    await this.checkSuperAdmin(req);
    await this.remindersService.runExpirationCheck();
    return { success: true, message: 'Overdue checks and suspension sequence triggered successfully.' };
  }

  /**
   * Lead Management Module - Fetch all leads (Feature 7)
   */
  @Get('leads')
  async getLeads(@Req() req: any) {
    await this.checkSuperAdmin(req);
    return this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lead Management Module - Create new lead
   */
  @Post('leads')
  async createLead(
    @Req() req: any,
    @Body()
    body: {
      leadName: string;
      salonName?: string;
      phone: string;
      city?: string;
      interestedPlan?: SubscriptionPlan;
      demoStatus?: string;
      status?: LeadStatus;
      followUpDate?: string;
      notes?: string;
    },
  ) {
    await this.checkSuperAdmin(req);

    if (!body.leadName || !body.phone) {
      throw new BadRequestException('leadName and phone are required fields.');
    }

    const followUp = body.followUpDate ? new Date(body.followUpDate) : null;

    return this.prisma.lead.create({
      data: {
        leadName: body.leadName,
        salonName: body.salonName,
        phone: body.phone,
        city: body.city,
        interestedPlan: body.interestedPlan || SubscriptionPlan.FREE,
        demoStatus: body.demoStatus || 'NONE',
        status: body.status || LeadStatus.NEW,
        followUpDate: followUp,
        notes: body.notes,
      },
    });
  }

  /**
   * Lead Management Module - Update lead
   */
  @Patch('leads/:id')
  async updateLead(
    @Req() req: any,
    @Param('id') leadId: string,
    @Body()
    body: {
      leadName?: string;
      salonName?: string;
      phone?: string;
      city?: string;
      interestedPlan?: SubscriptionPlan;
      demoStatus?: string;
      status?: LeadStatus;
      followUpDate?: string;
      notes?: string;
    },
  ) {
    await this.checkSuperAdmin(req);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead prospect record not found.');
    }

    const followUp = body.followUpDate !== undefined
      ? (body.followUpDate ? new Date(body.followUpDate) : null)
      : undefined;

    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        leadName: body.leadName,
        salonName: body.salonName,
        phone: body.phone,
        city: body.city,
        interestedPlan: body.interestedPlan,
        demoStatus: body.demoStatus,
        status: body.status,
        followUpDate: followUp,
        notes: body.notes,
      },
    });
  }

  /**
   * Lead Management Module - Delete lead
   */
  @Delete('leads/:id')
  async deleteLead(@Req() req: any, @Param('id') leadId: string) {
    await this.checkSuperAdmin(req);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead prospect record not found.');
    }

    return this.prisma.lead.delete({
      where: { id: leadId },
    });
  }
}

class NotFoundException extends BadRequestException {}
