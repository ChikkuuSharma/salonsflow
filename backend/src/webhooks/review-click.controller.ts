import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as express from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/webhooks/review-click')
export class ReviewClickController {
  private readonly logger = new Logger(ReviewClickController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get(':campaignId')
  async trackReviewClick(
    @Param('campaignId') campaignId: string,
    @Res() res: express.Response,
  ) {
    try {
      const campaign = await this.prisma.reviewCampaign.findUnique({
        where: { id: campaignId },
        include: { salon: true },
      });

      if (!campaign) {
        this.logger.warn(`ReviewCampaign with ID ${campaignId} not found.`);
        return res.redirect('https://www.google.com');
      }

      // Update click statistics
      await this.prisma.reviewCampaign.update({
        where: { id: campaignId },
        data: {
          clickedAt: new Date(),
          completed: true,
        },
      });

      this.logger.log(
        `Tracked click for ReviewCampaign ${campaignId}. Redirecting to Google Review link.`,
      );

      const redirectUrl =
        campaign.salon.googleReviewLink || 'https://www.google.com';
      return res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (error) {
      this.logger.error(`Error tracking review click: ${error.message}`);
      return res.redirect('https://www.google.com');
    }
  }
}
