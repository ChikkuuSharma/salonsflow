import {
  Controller,
  Get,
  Put,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SalonsService } from './salons.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

@Controller('api/v1/salons')
@UseGuards(ClerkAuthGuard)
export class SalonsController {
  private readonly logger = new Logger(SalonsController.name);

  constructor(
    private readonly salonsService: SalonsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to extract active tenant salonId securely from the session token
   */
  private async getSalonId(req: any): Promise<string> {
    let salonId = req.user?.salonId;
    if (!salonId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { clerkId: req.user.sub },
      });
      if (!dbUser) {
        throw new UnauthorizedException('User record not found in database.');
      }
      salonId = dbUser.salonId;
    }
    return salonId;
  }

  @Get('me')
  async getMe(@Req() req: any) {
    const salonId = await this.getSalonId(req);
    return this.salonsService.getSalonWithSubscription(salonId);
  }

  @Get('me/user')
  async getMeUser(@Req() req: any) {
    const dbUser = await this.prisma.user.findUnique({
      where: { clerkId: req.user.sub },
    });
    if (!dbUser) {
      throw new UnauthorizedException('User record not found in database.');
    }
    return dbUser;
  }

  @Put('me')
  async updateMe(
    @Req() req: any,
    @Body('name') name?: string,
    @Body('address') address?: string,
    @Body('whatsappNumber') whatsappNumber?: string,
    @Body('homeBookingFee') homeBookingFee?: number,
    @Body('aiPrompt') aiPrompt?: string,
    @Body('googleReviewLink') googleReviewLink?: string,
    @Body('reviewDelayMins') reviewDelayMins?: number,
    @Body('rebookingAutoSend') rebookingAutoSend?: boolean,
    @Body('whatsappPhoneNumberId') whatsappPhoneNumberId?: string,
    @Body('whatsappAccessToken') whatsappAccessToken?: string,
    @Body('whatsappBusinessAccountId') whatsappBusinessAccountId?: string,
    @Body('instagramPageId') instagramPageId?: string,
    @Body('instagramAccessToken') instagramAccessToken?: string,
    @Body('isProfileComplete') isProfileComplete?: boolean,
  ) {
    const salonId = await this.getSalonId(req);

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

    return this.salonsService.updateSalon(salonId, {
      name,
      address,
      whatsappNumber,
      homeBookingFee,
      aiPrompt,
      googleReviewLink,
      reviewDelayMins,
      rebookingAutoSend,
      whatsappPhoneNumberId,
      whatsappAccessToken,
      whatsappBusinessAccountId,
      instagramPageId,
      instagramAccessToken,
      isProfileComplete,
    });
  }
}
