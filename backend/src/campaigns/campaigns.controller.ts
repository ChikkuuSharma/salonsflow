import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/campaigns')
@UseGuards(ClerkAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(
    @SalonId() salonId: string,
    @Body('name') name: string,
    @Body('content') content: string,
    @Body('targetSegment') targetSegment: string,
  ) {
    // Gating check
    const subscription = await this.prisma.subscription.findUnique({
      where: { salonId },
    });

    const isPremium =
      subscription?.plan === SubscriptionPlan.BASIC ||
      subscription?.plan === SubscriptionPlan.PRO;
    const isActive = subscription?.status === SubscriptionStatus.ACTIVE;

    if (!isPremium || !isActive) {
      throw new ForbiddenException(
        'Marketing campaigns are only available on BASIC or PRO subscription plans. Please upgrade to create campaigns.',
      );
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new BadRequestException('Campaign name is required.');
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      throw new BadRequestException('Campaign content is required.');
    }
    if (
      !targetSegment ||
      !['all_customers', 'inactive_30_days', 'frequent_visitors'].includes(
        targetSegment,
      )
    ) {
      throw new BadRequestException(
        'Invalid target segment value. Choose from: all_customers, inactive_30_days, frequent_visitors',
      );
    }

    return this.campaignsService.create(
      salonId,
      name.trim(),
      content.trim(),
      targetSegment,
    );
  }

  @Get()
  async findAll(@SalonId() salonId: string) {
    return this.campaignsService.findAll(salonId);
  }
}
