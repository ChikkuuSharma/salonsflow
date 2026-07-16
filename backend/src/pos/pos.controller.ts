import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { SalonId } from '../auth/salon-id.decorator';
import { UserId } from '../auth/user-id.decorator';

@Controller('api/v1/pos')
@UseGuards(ClerkAuthGuard)
export class PosController {
  constructor(
    private readonly posService: PosService,
  ) {}

  @Post('invoice')
  async logDrawerAction(
    @SalonId() salonId: string,
    @UserId() userId: string,
    @Body() dto: { amount: number; actionType: string; notes?: string },
  ) {
    return this.posService.logDrawerAction(salonId, userId, dto);
  }

  @Get('drawer-logs')
  async getDrawerLogs(
    @SalonId() salonId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.posService.getDrawerLogs(salonId, { startDate, endDate });
  }

  @Get('drawer-summary')
  async getDrawerSummary(@SalonId() salonId: string) {
    return this.posService.getDrawerSummary(salonId);
  }

  @Post('checkout')
  async checkoutAppointment(
    @SalonId() salonId: string,
    @UserId() userId: string,
    @Body() dto: { appointmentId: string; amountPaid: number; paymentMode: string; notes?: string },
  ) {
    return this.posService.checkoutAppointment(salonId, userId, dto);
  }
}
