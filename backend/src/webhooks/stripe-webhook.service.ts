import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle incoming Stripe subscription created or updated event
   */
  async handleSubscriptionCreatedOrUpdated(subscription: any) {
    const stripeCustomerId = subscription.customer;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const stripeStatus = subscription.status;
    const priceId = subscription.items?.data?.[0]?.price?.id;

    // Resolve salonId from metadata or DB lookup
    let salonId = subscription.metadata?.salonId;

    if (!salonId) {
      this.logger.warn(
        `salonId missing from subscription metadata. Attempting DB lookup by stripeCustomerId: ${stripeCustomerId}`,
      );
      const existingSub = await this.prisma.subscription.findFirst({
        where: { stripeCustomerId },
      });
      if (existingSub) {
        salonId = existingSub.salonId;
      }
    }

    if (!salonId) {
      const errorMsg = `Unable to resolve salonId for Stripe customer: ${stripeCustomerId}`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    const plan = this.mapPriceToPlan(priceId);
    const status = this.mapStatus(stripeStatus);

    this.logger.log(
      `Syncing subscription for salon ${salonId}: plan=${plan}, status=${status}, currentPeriodEnd=${currentPeriodEnd}`,
    );

    return this.prisma.subscription.upsert({
      where: { salonId },
      update: {
        plan,
        status,
        stripeCustomerId,
        currentPeriodEnd,
      },
      create: {
        salonId,
        plan,
        status,
        stripeCustomerId,
        currentPeriodEnd,
      },
    });
  }

  /**
   * Handle Stripe subscription deleted event
   */
  async handleSubscriptionDeleted(subscription: any) {
    const stripeCustomerId = subscription.customer;
    let salonId = subscription.metadata?.salonId;

    if (!salonId) {
      const existingSub = await this.prisma.subscription.findFirst({
        where: { stripeCustomerId },
      });
      if (existingSub) {
        salonId = existingSub.salonId;
      }
    }

    if (!salonId) {
      this.logger.warn(
        `Unable to resolve salonId for deleted Stripe customer: ${stripeCustomerId}`,
      );
      return;
    }

    this.logger.log(`Cancelling subscription for salon ${salonId}`);

    return this.prisma.subscription.upsert({
      where: { salonId },
      update: {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: null,
      },
      create: {
        salonId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: null,
      },
    });
  }

  private mapPriceToPlan(priceId?: string): SubscriptionPlan {
    const id = (priceId || '').toLowerCase();
    if (id.includes('pro')) {
      return SubscriptionPlan.PRO;
    }
    if (id.includes('basic')) {
      return SubscriptionPlan.BASIC;
    }
    return SubscriptionPlan.FREE;
  }

  private mapStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.GRACE_PERIOD;
      case 'canceled':
      case 'unpaid':
      case 'incomplete_expired':
        return SubscriptionStatus.CANCELED;
      default:
        return SubscriptionStatus.CANCELED;
    }
  }
}
