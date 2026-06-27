import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  Param,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { WaitingListService } from './waiting-list.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('api/v1/appointments/waiting-list')
@UseGuards(ClerkAuthGuard)
export class WaitingListController {
  constructor(
    private readonly waitingListService: WaitingListService,
    private readonly prisma: PrismaService,
  ) {}

  private async getSalonId(req: any): Promise<string> {
    let salonId = req.user?.salonId;
    if (!salonId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { clerkId: req.user.sub },
      });
      if (!dbUser)
        throw new UnauthorizedException('User record not found in database.');
      salonId = dbUser.salonId;
    }
    return salonId;
  }

  @Get()
  async getWaitingList(@Req() req: any) {
    const salonId = await this.getSalonId(req);
    return this.waitingListService.getWaitingList(salonId);
  }

  @Post()
  async addToWaitingList(
    @Req() req: any,
    @Body()
    body: {
      customerId: string;
      serviceId: string;
      staffId?: string | null;
      requestedStartTime: string;
      priority?: number;
    },
  ) {
    const salonId = await this.getSalonId(req);

    if (!body.customerId || !body.serviceId || !body.requestedStartTime) {
      throw new BadRequestException('Missing customerId, serviceId, or requestedStartTime.');
    }

    const requestedStartTimeDate = new Date(body.requestedStartTime);

    return this.waitingListService.addToWaitingList({
      salonId,
      customerId: body.customerId,
      serviceId: body.serviceId,
      staffId: body.staffId,
      requestedStartTime: requestedStartTimeDate,
      priority: body.priority,
    });
  }

  @Delete(':id')
  async removeFromWaitingList(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    return this.waitingListService.removeFromWaitingList(id, salonId);
  }

  @Post(':id/promote')
  async promoteWaitlistEntry(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    return this.waitingListService.promoteWaitlistEntry(id, salonId);
  }
}
