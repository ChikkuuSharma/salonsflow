import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SalonsService {
  private readonly logger = new Logger(SalonsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch active salon details, including subscription details
   */
  async getSalonWithSubscription(salonId: string) {
    this.logger.log(`Fetching salon profile and subscription for: ${salonId}`);

    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        subscription: true,
      },
    });

    if (salon && !salon.subscription) {
      // Return a default mock/fallback FREE subscription if no record exists yet
      return {
        ...salon,
        subscription: {
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: null,
        },
      };
    }

    return salon;
  }

  /**
   * Update salon fields (name, address, aiPrompt)
   */
  async updateSalon(
    salonId: string,
    data: {
      name?: string;
      address?: string;
      homeBookingFee?: number;
      aiPrompt?: string;
      googleReviewLink?: string;
      reviewDelayMins?: number;
      rebookingAutoSend?: boolean;
      whatsappPhoneNumberId?: string;
      whatsappAccessToken?: string;
      whatsappBusinessAccountId?: string;
      instagramPageId?: string;
      instagramAccessToken?: string;
      isProfileComplete?: boolean;
    },
  ) {
    this.logger.log(`Updating salon properties for: ${salonId}`);

    return this.prisma.salon.update({
      where: { id: salonId },
      data,
      include: {
        subscription: true,
      },
    });
  }
}
