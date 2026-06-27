import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('api/v1/analytics')
@UseGuards(ClerkAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  async getMetrics(@Req() req: any) {
    const salonId = req.user.salonId; // Derived from authenticated JWT
    return this.analyticsService.getDashboardMetrics(salonId);
  }

  @Get('ucis')
  async getUcisMetrics(@Req() req: any) {
    const salonId = req.user.salonId;
    return this.analyticsService.getUcisMetrics(salonId);
  }

  @Get('staff-utilization')
  async getStaffUtilization(@Req() req: any) {
    const salonId = req.user.salonId;
    return this.analyticsService.getStaffUtilization(salonId);
  }

  @Get('recovery-metrics')
  async getRecoveryMetrics(@Req() req: any) {
    const salonId = req.user.salonId;
    return this.analyticsService.getRecoveryMetrics(salonId);
  }
}
