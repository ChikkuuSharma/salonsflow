import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('api/v1/appointments')
@UseGuards(ClerkAuthGuard)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Securely extract SalonId with User fallback lookup
   */
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

  /**
   * Fetch scheduled appointments, with optional date filtering
   */
  @Get()
  async findAll(@Req() req: any, @Query('date') date?: string) {
    const salonId = await this.getSalonId(req);
    return this.appointmentsService.findAll(salonId, date);
  }

  @Get('staff')
  async getStaff(@Req() req: any) {
    const salonId = await this.getSalonId(req);
    return this.prisma.staff.findMany({
      where: { salonId },
      include: {
        staffServices: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  @Post('staff')
  async createStaff(
    @Req() req: any,
    @Body() body: { name: string; isAvailable?: boolean },
  ) {
    const salonId = await this.getSalonId(req);
    if (!body.name) {
      throw new BadRequestException('Name is required.');
    }
    return this.prisma.staff.create({
      data: {
        salonId,
        name: body.name,
        isAvailable: body.isAvailable ?? true,
      },
    });
  }

  @Patch('staff/:id')
  async updateStaff(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; isAvailable?: boolean },
  ) {
    const salonId = await this.getSalonId(req);
    const staff = await this.prisma.staff.findFirst({
      where: { id, salonId },
    });
    if (!staff) {
      throw new BadRequestException('Staff member not found.');
    }
    return this.prisma.staff.update({
      where: { id },
      data: {
        name: body.name,
        isAvailable: body.isAvailable,
      },
    });
  }

  @Delete('staff/:id')
  async deleteStaff(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    const staff = await this.prisma.staff.findFirst({
      where: { id, salonId },
    });
    if (!staff) {
      throw new BadRequestException('Staff member not found.');
    }
    
    return this.prisma.$transaction(async (tx) => {
      // 1. Set staffId to null in appointments (retains client booking history)
      await tx.appointment.updateMany({
        where: { staffId: id, salonId },
        data: { staffId: null },
      });

      // 2. Set staffId to null in waiting list
      await tx.waitingList.updateMany({
        where: { staffId: id, salonId },
        data: { staffId: null },
      });

      // 3. Clean up staff commissions
      await tx.commission.deleteMany({
        where: { staffId: id, salonId },
      });

      // 4. Clean up qualified services
      await tx.staffService.deleteMany({
        where: { staffId: id },
      });

      // 5. Delete staff member record
      return tx.staff.delete({
        where: { id },
      });
    });
  }

  @Get('staff/:id/services')
  async getStaffServices(@Req() req: any, @Param('id') id: string) {
    const salonId = await this.getSalonId(req);
    const staff = await this.prisma.staff.findFirst({
      where: { id, salonId },
    });
    if (!staff) {
      throw new BadRequestException('Staff member not found.');
    }
    const mappings = await this.prisma.staffService.findMany({
      where: { staffId: id },
    });
    return mappings.map((m) => m.serviceId);
  }

  @Post('staff/:id/services')
  async updateStaffServices(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { serviceIds: string[] },
  ) {
    const salonId = await this.getSalonId(req);
    const staff = await this.prisma.staff.findFirst({
      where: { id, salonId },
    });
    if (!staff) {
      throw new BadRequestException('Staff member not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.staffService.deleteMany({
        where: { staffId: id },
      });

      if (body.serviceIds && body.serviceIds.length > 0) {
        const validServices = await tx.service.findMany({
          where: { id: { in: body.serviceIds }, salonId },
        });

        if (validServices.length !== body.serviceIds.length) {
          throw new BadRequestException('Some service IDs are invalid or do not belong to your salon.');
        }

        await tx.staffService.createMany({
          data: body.serviceIds.map((serviceId) => ({
            staffId: id,
            serviceId,
          })),
        });
      }

      return { success: true };
    });
  }

  /**
   * Dynamically schedule an appointment manually from the Dashboard
   */
  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      customerId: string;
      serviceId: string;
      startTime: string;
      staffId?: string;
      durationMins?: number;
    },
  ) {
    const salonId = await this.getSalonId(req);

    if (!body.customerId || !body.serviceId || !body.startTime) {
      throw new BadRequestException(
        'Missing customerId, serviceId, or startTime parameter.',
      );
    }

    // Validate IDOR containment
    const [customer, service] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: body.customerId } }),
      this.prisma.service.findUnique({ where: { id: body.serviceId } }),
    ]);

    if (!customer || customer.salonId !== salonId) {
      throw new BadRequestException('Invalid customer ID.');
    }
    if (!service || service.salonId !== salonId) {
      throw new BadRequestException('Invalid service ID.');
    }

    if (body.staffId) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: body.staffId },
      });
      if (!staff || staff.salonId !== salonId) {
        throw new BadRequestException('Invalid staff ID.');
      }
    }

    const startTimeDate = new Date(body.startTime);

    return this.appointmentsService.createAppointment({
      salonId,
      customerId: body.customerId,
      serviceId: body.serviceId,
      startTime: startTimeDate,
      staffId: body.staffId,
      durationMins: body.durationMins,
    });
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      startTime?: string;
      durationMins?: number;
      staffId?: string | null;
    },
  ) {
    const salonId = await this.getSalonId(req);
    const startTimeDate = body.startTime ? new Date(body.startTime) : undefined;

    return this.appointmentsService.updateAppointment(id, salonId, {
      startTime: startTimeDate,
      durationMins: body.durationMins,
      staffId: body.staffId,
    });
  }
}
