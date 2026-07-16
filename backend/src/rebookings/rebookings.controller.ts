import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RebookingsService } from './rebookings.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/rebookings')
@UseGuards(ClerkAuthGuard)
export class RebookingsController {
  constructor(
    private readonly rebookingsService: RebookingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('rules')
  async upsertRule(
    @SalonId() salonId: string,
    @Body('serviceId') serviceId: string,
    @Body('intervalDays') intervalDays: number,
  ) {
    if (!serviceId) {
      throw new BadRequestException('serviceId is required');
    }
    if (intervalDays === undefined || intervalDays <= 0) {
      throw new BadRequestException('intervalDays must be greater than 0');
    }

    return this.rebookingsService.upsertRule(salonId, serviceId, intervalDays);
  }

  @Get('rules')
  async getRules(@SalonId() salonId: string) {
    return this.rebookingsService.getRules(salonId);
  }

  @Get('services')
  async getServices(@SalonId() salonId: string) {
    return this.prisma.service.findMany({
      where: { salonId },
    });
  }

  @Patch('services/:id')
  async updateService(
    @SalonId() salonId: string,
    @Param('id') id: string,
    @Body('durationMins') durationMins: number,
  ) {
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
  async getRecommendations(@SalonId() salonId: string) {
    return this.rebookingsService.getRecommendations(salonId);
  }

  @Post('recommendations/:id/approve')
  async approveRecommendation(@SalonId() salonId: string, @Param('id') id: string) {
    return this.rebookingsService.approveRecommendation(salonId, id);
  }
}
