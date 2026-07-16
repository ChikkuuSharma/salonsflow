import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/commissions')
@UseGuards(ClerkAuthGuard)
export class CommissionsController {
  constructor(
    private readonly commissionsService: CommissionsService,
  ) {}

  @Post()
  async setCommission(
    @SalonId() salonId: string,
    @Body() dto: { staffId: string; serviceId: string; ratePercent: number },
  ) {
    return this.commissionsService.setCommission(salonId, dto);
  }

  @Get('payouts')
  async getPayouts(
    @SalonId() salonId: string,
    @Query('staffId') staffId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.commissionsService.calculatePayouts(salonId, {
      staffId,
      startDate,
      endDate,
    });
  }
}
