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
import { CommissionsService } from './commissions.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/commissions')
@UseGuards(ClerkAuthGuard)
export class CommissionsController {
  constructor(
    private readonly commissionsService: CommissionsService,
    private readonly prisma: PrismaService,
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

  @Post()
  async setCommission(
    @Req() req: any,
    @Body() dto: { staffId: string; serviceId: string; ratePercent: number },
  ) {
    const salonId = await this.getSalonId(req);
    return this.commissionsService.setCommission(salonId, dto);
  }

  @Get('payouts')
  async getPayouts(
    @Req() req: any,
    @Query('staffId') staffId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const salonId = await this.getSalonId(req);
    return this.commissionsService.calculatePayouts(salonId, {
      staffId,
      startDate,
      endDate,
    });
  }
}
