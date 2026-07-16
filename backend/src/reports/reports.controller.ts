import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { ReportType } from '@prisma/client';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/reports')
@UseGuards(ClerkAuthGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  /**
   * Get all reports for the current salon
   */
  @Get()
  async getReports(@SalonId() salonId: string) {
    return this.prisma.businessReport.findMany({
      where: { salonId },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Get report preferences settings
   */
  @Get('settings')
  async getSettings(@SalonId() salonId: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        dailyReportTime: true,
        dailyReportsEnabled: true,
        weeklyReportsEnabled: true,
        monthlyReportsEnabled: true,
      },
    });

    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }

  /**
   * Update report preferences settings
   */
  @Put('settings')
  async updateSettings(
    @SalonId() salonId: string,
    @Body('dailyReportTime') dailyReportTime?: string,
    @Body('dailyReportsEnabled') dailyReportsEnabled?: boolean,
    @Body('weeklyReportsEnabled') weeklyReportsEnabled?: boolean,
    @Body('monthlyReportsEnabled') monthlyReportsEnabled?: boolean,
  ) {
    if (dailyReportTime && !/^\d{2}:\d{2}$/.test(dailyReportTime)) {
      throw new BadRequestException('dailyReportTime must be in HH:MM format');
    }

    return this.prisma.salon.update({
      where: { id: salonId },
      data: {
        ...(dailyReportTime !== undefined ? { dailyReportTime } : {}),
        ...(dailyReportsEnabled !== undefined ? { dailyReportsEnabled } : {}),
        ...(weeklyReportsEnabled !== undefined ? { weeklyReportsEnabled } : {}),
        ...(monthlyReportsEnabled !== undefined ? { monthlyReportsEnabled } : {}),
      },
      select: {
        dailyReportTime: true,
        dailyReportsEnabled: true,
        weeklyReportsEnabled: true,
        monthlyReportsEnabled: true,
      },
    });
  }

  /**
   * Trigger immediate generation and delivery of a report for testing/troubleshooting
   */
  @Post('trigger/:type')
  async triggerReport(@SalonId() salonId: string, @Param('type') type: string) {
    const uppercaseType = type.toUpperCase();
    if (![ReportType.DAILY, ReportType.WEEKLY, ReportType.MONTHLY].includes(uppercaseType as any)) {
      throw new BadRequestException('Invalid report type. Must be DAILY, WEEKLY, or MONTHLY');
    }

    const reportType = uppercaseType as ReportType;
    const now = new Date();
    const istTime = this.reportsService.getISTDate(now);
    
    // Set proper date alignment
    let targetDate = new Date(istTime);
    targetDate.setHours(0, 0, 0, 0);

    if (reportType === ReportType.WEEKLY) {
      // align to previous Monday
      const day = targetDate.getDay();
      const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      targetDate.setDate(diff);
    } else if (reportType === ReportType.MONTHLY) {
      // align to 1st of month
      targetDate.setDate(1);
    }

    try {
      this.logger.log(`Manual trigger of ${reportType} Report requested by user for salon: ${salonId}`);
      // If manually triggered, we allow overwriting or deleting an existing pending/failed report for today
      const existing = await this.prisma.businessReport.findUnique({
        where: {
          salonId_type_date: {
            salonId,
            type: reportType,
            date: targetDate,
          },
        },
      });

      if (existing) {
        // Delete to allow fresh regeneration
        await this.prisma.businessReport.delete({ where: { id: existing.id } });
      }

      return await this.reportsService.generateAndSendReport(salonId, reportType, targetDate);
    } catch (err) {
      this.logger.error(`Failed to trigger report manually: ${err.message}`);
      throw new BadRequestException(err.message);
    }
  }

  /**
   * Manually retry delivery of a failed report
   */
  @Post('retry/:reportId')
  async retryReport(@SalonId() salonId: string, @Param('reportId') reportId: string) {
    const report = await this.prisma.businessReport.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');
    if (report.salonId !== salonId) {
      throw new UnauthorizedException('Unauthorized access to report logs.');
    }

    try {
      this.logger.log(`Manual retry request for report ${reportId}`);
      return await this.reportsService.sendReportMessage(reportId);
    } catch (err) {
      this.logger.error(`Manual retry failed for report ${reportId}: ${err.message}`);
      throw new BadRequestException(err.message);
    }
  }
}
