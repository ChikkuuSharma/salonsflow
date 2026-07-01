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
}
