import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Post,
  Body,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/customers')
@UseGuards(ClerkAuthGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to securely extract and validate active tenant SalonId
   */
  private async getSalonId(req: any): Promise<string> {
    let salonId = req.user?.salonId;
    if (!salonId) {
      // Fallback in case Clerk session token doesn't carry custom claims
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
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('segment') segment?: string,
  ) {
    const salonId = await this.getSalonId(req);

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
  async findOne(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
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
    @Req() req: any,
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
    const salonId = await this.getSalonId(req);
    return this.customersService.createOffline(salonId, dto);
  }

  @Get('unified/:id')
  async findUnified(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    const customer = await this.customersService.findUnified(salonId, id);
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${id} not found under this salon.`,
      );
    }
    return customer;
  }
}
