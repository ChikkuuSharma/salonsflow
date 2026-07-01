import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common';
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

  @Post('api/v1/public/bookings')
  async createPublicBooking(
    @Body()
    body: {
      name: string;
      phone: string;
      date: string;
      time: string;
      haircut: string;
      notes?: string;
    },
  ) {
    if (!body.name || !body.phone || !body.date || !body.time || !body.haircut) {
      throw new BadRequestException('name, phone, date, time, and haircut are required.');
    }

    const salon = await this.prisma.salon.findFirst();
    if (!salon) {
      throw new BadRequestException('No salon is registered in the system.');
    }
    const salonId = salon.id;

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
        startTime,
        endTime,
        status: 'PENDING',
        bookingSource: 'ONLINE_AI',
        notes: body.notes || `Booked via AI Style Lab. Suggested style: ${body.haircut}.`,
      },
    });
  }
}
