import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

@Controller('api/v1/reviews')
@UseGuards(ClerkAuthGuard)
export class ReviewsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

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

  @Get('campaigns')
  async getCampaigns(@Req() req: any) {
    const salonId = await this.getSalonId(req);
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
    @Req() req: any,
    @Param('campaignId') campaignId: string,
    @Body() body: { notes?: string },
  ) {
    const salonId = await this.getSalonId(req);
    return this.reviewsService.resolveCampaign(campaignId, salonId, body.notes);
  }
}
