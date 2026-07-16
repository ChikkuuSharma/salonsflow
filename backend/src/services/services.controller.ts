import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/services')
@UseGuards(ClerkAuthGuard)
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
  ) {}

  @Get()
  async findAll(@SalonId() salonId: string) {
    return this.servicesService.findAll(salonId);
  }

  @Get(':id')
  async findOne(@SalonId() salonId: string, @Param('id') id: string) {
    return this.servicesService.findOne(id, salonId);
  }

  @Post()
  async create(
    @SalonId() salonId: string,
    @Body()
    body: {
      name: string;
      price: number;
      durationMins: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.create(salonId, body);
  }

  @Patch(':id')
  async update(
    @SalonId() salonId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      price?: number;
      durationMins?: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.update(id, salonId, body);
  }

  @Delete(':id')
  async remove(@SalonId() salonId: string, @Param('id') id: string) {
    return this.servicesService.remove(id, salonId);
  }
}
