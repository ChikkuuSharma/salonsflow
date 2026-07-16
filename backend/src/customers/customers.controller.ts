import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { SalonId } from '../auth/salon-id.decorator';

@Controller('api/v1/customers')
@UseGuards(ClerkAuthGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  async findAll(
    @SalonId() salonId: string,
    @Query('search') search?: string,
    @Query('segment') segment?: string,
  ) {
    if (
      segment &&
      !['all_customers', 'inactive_30_days', 'frequent_visitors'].includes(
        segment,
      )
    ) {
      throw new BadRequestException(
        'Invalid segment value. Choose from: all_customers, inactive_30_days, frequent_visitors',
      );
    }

    return this.customersService.findAll(salonId, search, segment);
  }

  @Get(':id')
  async findOne(@SalonId() salonId: string, @Param('id') id: string) {
    const customer = await this.customersService.findOne(salonId, id);
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${id} not found under this salon.`,
      );
    }
    return customer;
  }

  @Post('offline')
  async createOffline(
    @SalonId() salonId: string,
    @Body() dto: {
      name: string;
      phone: string;
      gender?: string;
      dateOfBirth?: string;
      visitDate: string;
      serviceId: string;
      amountPaid?: number;
      staffId?: string;
      source: string;
      notes?: string;
    },
  ) {
    return this.customersService.createOffline(salonId, dto);
  }

  @Get('unified/:id')
  async findUnified(@SalonId() salonId: string, @Param('id') id: string) {
    const customer = await this.customersService.findUnified(salonId, id);
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${id} not found under this salon.`,
      );
    }
    return customer;
  }
}
