import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/reviews')
@UseGuards(ClerkAuthGuard)
export class ReviewsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get('campaigns')
  async getCampaigns(@SalonId() salonId: string) {
    return this.prisma.reviewCampaign.findMany({
      where: { salonId },
      include: {
        customer: true,
        appointment: {
          include: {
            service: true,
            staff: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  @Patch('resolve/:campaignId')
  async resolveReview(
    @SalonId() salonId: string,
    @Param('campaignId') campaignId: string,
    @Body() body: { notes?: string },
  ) {
    return this.reviewsService.resolveCampaign(campaignId, salonId, body.notes);
  }
}
