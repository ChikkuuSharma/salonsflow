import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/pos')
@UseGuards(ClerkAuthGuard)
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly prisma: PrismaService,
  ) {}

  private async getUserInfo(req: any): Promise<{ salonId: string; userId: string }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { clerkId: req.user.sub },
    });
    if (!dbUser) {
      throw new UnauthorizedException('User record not found in database.');
    }
    return { salonId: dbUser.salonId, userId: dbUser.id };
  }

  @Post('invoice')
  async logDrawerAction(
    @Req() req: any,
    @Body() dto: { amount: number; actionType: string; notes?: string },
  ) {
    const { salonId, userId } = await this.getUserInfo(req);
    return this.posService.logDrawerAction(salonId, userId, dto);
  }

  @Get('drawer-logs')
  async getDrawerLogs(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { salonId } = await this.getUserInfo(req);
    return this.posService.getDrawerLogs(salonId, { startDate, endDate });
  }

  @Get('drawer-summary')
  async getDrawerSummary(@Req() req: any) {
    const { salonId } = await this.getUserInfo(req);
    return this.posService.getDrawerSummary(salonId);
  }

  @Post('checkout')
  async checkoutAppointment(
    @Req() req: any,
    @Body() dto: { appointmentId: string; amountPaid: number; paymentMode: string; notes?: string },
  ) {
    const { salonId, userId } = await this.getUserInfo(req);
    return this.posService.checkoutAppointment(salonId, userId, dto);
  }
}
