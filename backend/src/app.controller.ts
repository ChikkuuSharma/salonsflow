import { Controller, Get, Post, Body, BadRequestException, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SubscriptionPlan, LeadStatus } from '@prisma/client';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('diagnostics')
  async getDiagnostics() {
    const [salons, users, sessions, messages, logs] = await Promise.all([
      this.prisma.salon.findMany({ take: 5 }),
      this.prisma.user.findMany({ take: 5 }),
      this.prisma.whatsAppSession.findMany({
        select: { id: true, salonId: true, key: true, createdAt: true, updatedAt: true }
      }),
      this.prisma.message.findMany({ take: 15, orderBy: { timestamp: 'desc' } }),
      this.prisma.auditLog.findMany({ take: 15, orderBy: { createdAt: 'desc' } })
    ]);
    return { salons, users, sessions, messages, logs };
  }

  @Post('api/v1/public/leads')
  async createPublicLead(
    @Body()
    body: {
      name: string;
      phone: string;
      email?: string;
      salonName?: string;
      city?: string;
      demoStatus?: string;
      notes?: string;
    },
  ) {
    if (!body.name || !body.phone) {
      throw new BadRequestException('name and phone are required fields.');
    }

    return this.prisma.lead.create({
      data: {
        leadName: body.name,
        salonName: body.salonName || null,
        phone: body.phone,
        city: body.city || null,
        interestedPlan: SubscriptionPlan.FREE,
        demoStatus: body.demoStatus || 'NONE',
        status: LeadStatus.NEW,
        notes: body.notes || (body.email ? `Public signup email: ${body.email}` : 'Public signup lead.'),
      },
    });
  }

  @Get('api/v1/public/salons')
  async getPublicSalons() {
    let salons = await this.prisma.salon.findMany({
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        address: true,
        ownerCity: true,
        businessCategory: true,
        homeBookingFee: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasDemo = salons.some(
      (s) =>
        s.name === 'Demo Styling Studio' ||
        s.whatsappNumber === '+91 99999 88888',
    );

    if (!hasDemo) {
      try {
        const created = await this.prisma.salon.create({
          data: {
            name: 'Demo Styling Studio',
            whatsappNumber: '+91 99999 88888',
            address: '101, Luxury Arcade, Bandra West, Mumbai',
            ownerCity: 'Mumbai',
            businessCategory: 'UNISEX_SALON',
            homeBookingFee: 150.00,
            isProfileComplete: true,
          },
        });

        await this.prisma.staff.createMany({
          data: [
            {
              salonId: created.id,
              name: 'Rahul (Master Stylist)',
              isAvailable: true,
            },
            {
              salonId: created.id,
              name: 'Priya (Nail & Skin Expert)',
              isAvailable: true,
            },
          ],
        });

        salons = await this.prisma.salon.findMany({
          select: {
            id: true,
            name: true,
            whatsappNumber: true,
            address: true,
            ownerCity: true,
            businessCategory: true,
            homeBookingFee: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        // Fallback gracefully
      }
    }

    return salons;
  }

  @Get('api/v1/public/salons/:salonId/staff')
  async getPublicSalonStaff(@Param('salonId') salonId: string) {
    return this.prisma.staff.findMany({
      where: { salonId, isAvailable: true },
      select: {
        id: true,
        name: true,
        isAvailable: true,
      },
    });
  }

  @Post('api/v1/public/bookings')
  async createPublicBooking(
    @Body()
    body: {
      name: string;
      phone: string;
      date: string;
      time: string;
      haircut: string;
      salonId?: string;
      staffId?: string;
      notes?: string;
    },
  ) {
    if (!body.name || !body.phone || !body.date || !body.time || !body.haircut) {
      throw new BadRequestException('name, phone, date, time, and haircut are required.');
    }

    let salonId: string | undefined;
    if (body.salonId) {
      const targetSalon = await this.prisma.salon.findUnique({
        where: { id: body.salonId },
      });
      if (targetSalon) {
        salonId = targetSalon.id;
      }
    }

    if (!salonId) {
      const defaultSalon = await this.prisma.salon.findFirst();
      if (!defaultSalon) {
        throw new BadRequestException('No salon is registered in the system.');
      }
      salonId = defaultSalon.id;
    }

    let staffId: string | null = null;
    if (body.staffId) {
      const targetStaff = await this.prisma.staff.findUnique({
        where: { id: body.staffId },
      });
      if (targetStaff && targetStaff.salonId === salonId) {
        staffId = targetStaff.id;
      }
    }

    let customer = await this.prisma.customer.findFirst({
      where: { salonId, phone: body.phone },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          salonId,
          name: body.name,
          phone: body.phone,
          source: 'ONLINE_AI',
        },
      });
    }

    let service = await this.prisma.service.findFirst({
      where: { salonId, name: body.haircut },
    });
    if (!service) {
      service = await this.prisma.service.create({
        data: {
          salonId,
          name: body.haircut,
          price: 499.0,
          durationMins: 45,
          isActive: true,
        },
      });
    }

    const startTime = new Date(`${body.date}T${body.time}:00`);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid date or time format.');
    }
    const duration = service.durationMins || 45;
    const endTime = new Date(startTime.getTime() + duration * 60000);

    return this.prisma.appointment.create({
      data: {
        salonId,
        customerId: customer.id,
        serviceId: service.id,
        staffId,
        startTime,
        endTime,
        status: 'PENDING',
        bookingSource: 'ONLINE_AI',
        notes: body.notes || `Booked via AI Style Lab. Suggested style: ${body.haircut}.`,
      },
    });
  }
}
