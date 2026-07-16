import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WaitingListService } from './waiting-list.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/appointments/waiting-list')
@UseGuards(ClerkAuthGuard)
export class WaitingListController {
  constructor(
    private readonly waitingListService: WaitingListService,
  ) {}

  @Get()
  async getWaitingList(@SalonId() salonId: string) {
    return this.waitingListService.getWaitingList(salonId);
  }

  @Post()
  async addToWaitingList(
    @SalonId() salonId: string,
    @Body()
    body: {
      customerId: string;
      serviceId: string;
      staffId?: string | null;
      requestedStartTime: string;
      priority?: number;
    },
  ) {
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
  async removeFromWaitingList(@SalonId() salonId: string, @Param('id') id: string) {
    return this.waitingListService.removeFromWaitingList(id, salonId);
  }

  @Post(':id/promote')
  async promoteWaitlistEntry(@SalonId() salonId: string, @Param('id') id: string) {
    return this.waitingListService.promoteWaitlistEntry(id, salonId);
  }
}
