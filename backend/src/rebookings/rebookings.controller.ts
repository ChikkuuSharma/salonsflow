import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RebookingsService } from './rebookings.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/rebookings')
@UseGuards(ClerkAuthGuard)
export class RebookingsController {
  constructor(
    private readonly rebookingsService: RebookingsService,
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

  @Post('rules')
  async upsertRule(
    @Req() req: any,
    @Body('serviceId') serviceId: string,
    @Body('intervalDays') intervalDays: number,
  ) {
    const salonId = await this.getSalonId(req);

    if (!serviceId) {
      throw new BadRequestException('serviceId is required');
    }
    if (intervalDays === undefined || intervalDays <= 0) {
      throw new BadRequestException('intervalDays must be greater than 0');
    }

    return this.rebookingsService.upsertRule(salonId, serviceId, intervalDays);
  }

  @Get('rules')
  async getRules(@Req() req: any) {
    const salonId = await this.getSalonId(req);
    return this.rebookingsService.getRules(salonId);
  }

  @Get('services')
  async getServices(@Req() req: any) {
    const salonId = await this.getSalonId(req);
    return this.prisma.service.findMany({
      where: { salonId },
    });
  }

  @Patch('services/:id')
  async updateService(
    @Req() req: any,
    @Param('id') id: string,
    @Body('durationMins') durationMins: number,
  ) {
    const salonId = await this.getSalonId(req);

    if (!id) {
      throw new BadRequestException('Service ID is required.');
    }
    if (durationMins === undefined || durationMins <= 0) {
      throw new BadRequestException('durationMins must be greater than 0.');
    }

    // IDOR containment check
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service || service.salonId !== salonId) {
      throw new BadRequestException('Invalid service ID or access denied.');
    }

    return this.prisma.service.update({
      where: { id },
      data: { durationMins },
    });
  }

  @Get('recommendations')
  async getRecommendations(@Req() req: any) {
    const salonId = await this.getSalonId(req);
    return this.rebookingsService.getRecommendations(salonId);
  }

  @Post('recommendations/:id/approve')
  async approveRecommendation(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    return this.rebookingsService.approveRecommendation(salonId, id);
  }
}
