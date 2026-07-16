import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SalonsService } from './salons.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { SalonId } from '../auth/salon-id.decorator';
import { UserId } from '../auth/user-id.decorator';

@Controller('api/v1/salons')
@UseGuards(ClerkAuthGuard)
export class SalonsController {
  private readonly logger = new Logger(SalonsController.name);

  constructor(
    private readonly salonsService: SalonsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async getMe(@SalonId() salonId: string) {
    return this.salonsService.getSalonWithSubscription(salonId);
  }

  @Get('me/user')
  async getMeUser(@UserId() userId: string) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!dbUser) {
      throw new UnauthorizedException('User record not found in database.');
    }
    return dbUser;
  }

  @Put('me')
  async updateMe(
    @SalonId() salonId: string,
    @Body()
    body: {
      name?: string;
      address?: string;
      whatsappNumber?: string;
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
      openingTime?: string;
      closingTime?: string;
    },
  ) {
    const { aiPrompt } = body;

    // Gating check if modifying aiPrompt
    if (aiPrompt !== undefined) {
      const salon = await this.salonsService.getSalonWithSubscription(salonId);
      const plan = salon?.subscription?.plan;
      const status = salon?.subscription?.status;

      const isPremiumPlan =
        plan === SubscriptionPlan.BASIC || plan === SubscriptionPlan.PRO;
      const isActiveStatus = status === SubscriptionStatus.ACTIVE;

      if (!isPremiumPlan || !isActiveStatus) {
        this.logger.warn(
          `Unauthorized attempt by FREE/Inactive salon ${salonId} to customize AI receptionist settings.`,
        );
        throw new ForbiddenException(
          'Customizing AI Receptionist settings is a premium feature. Please upgrade your subscription plan.',
        );
      }
    }

    return this.salonsService.updateSalon(salonId, body);
  }
}
