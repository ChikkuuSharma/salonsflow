import { Controller, Get, Post, Body, BadRequestException, Param, Query, NotFoundException } from '@nestjs/common';
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

  private publicSalonsCache: { data: any[]; expiresAt: number } | null = null;

  @Get('api/v1/public/salons')
  async getPublicSalons(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('category') category?: string,
  ) {
    const isDefaultQuery =
      (!q || !q.trim()) &&
      (!city || city === 'ALL' || !city.trim()) &&
      (!category || category === 'ALL' || !category.trim());

    const now = Date.now();
    if (isDefaultQuery && this.publicSalonsCache && this.publicSalonsCache.expiresAt > now) {
      return this.publicSalonsCache.data;
    }

    const whereClause: any = {};
    const andConditions: any[] = [];

    if (city && city.trim() !== '' && city !== 'ALL') {
      const c = city.trim();
      andConditions.push({
        OR: [
          { ownerCity: { contains: c, mode: 'insensitive' } },
          { address: { contains: c, mode: 'insensitive' } },
        ],
      });
    }

    if (category && category.trim() !== '' && category !== 'ALL') {
      andConditions.push({
        businessCategory: category.trim(),
      });
    }

    if (q && q.trim() !== '') {
      const queryStr = q.trim();
      andConditions.push({
        OR: [
          { name: { contains: queryStr, mode: 'insensitive' } },
          { address: { contains: queryStr, mode: 'insensitive' } },
          { ownerCity: { contains: queryStr, mode: 'insensitive' } },
          { services: { some: { name: { contains: queryStr, mode: 'insensitive' } } } },
        ],
      });
    }

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
    }

    let salons = await this.prisma.salon.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        address: true,
        ownerCity: true,
        businessCategory: true,
        homeBookingFee: true,
        openingTime: true,
        closingTime: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            durationMins: true,
            gender: true,
          },
          orderBy: { price: 'asc' },
        },
        _count: {
          select: {
            staff: { where: { isAvailable: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (salons.length === 0 && isDefaultQuery) {
      try {
        const totalCount = await this.prisma.salon.count();
        if (totalCount === 0) {
          const created = await this.prisma.salon.create({
            data: {
              name: 'Demo Styling Studio',
              whatsappNumber: '+91 99999 88888',
              address: '101, Luxury Arcade, Bandra West, Mumbai',
              ownerCity: 'Mumbai',
              businessCategory: 'UNISEX_SALON',
              homeBookingFee: 150.00,
              isProfileComplete: true,
              openingTime: '09:00',
              closingTime: '21:00',
              aiPrompt: 'Welcome to Demo Styling Studio!',
            },
          });

          await this.prisma.staff.createMany({
            data: [
              { salonId: created.id, name: 'Rahul (Master Stylist)', isAvailable: true },
              { salonId: created.id, name: 'Priya (Nail & Skin Expert)', isAvailable: true },
            ],
          });

          await this.prisma.service.createMany({
            data: [
              { salonId: created.id, name: 'Classic Haircut & Styling', price: 450, durationMins: 45, gender: 'UNISEX', isActive: true },
              { salonId: created.id, name: 'Royal Hair Spa & Deep Conditioning', price: 1200, durationMins: 60, gender: 'UNISEX', isActive: true },
              { salonId: created.id, name: 'Beard Trimming & Styling', price: 250, durationMins: 30, gender: 'MEN', isActive: true },
              { salonId: created.id, name: 'Gel Polish & Nail Art', price: 799, durationMins: 45, gender: 'WOMEN', isActive: true },
              { salonId: created.id, name: 'Glitz Facial & Skin Glow', price: 1800, durationMins: 75, gender: 'UNISEX', isActive: true },
            ],
          });

          salons = await this.prisma.salon.findMany({
            where: whereClause,
            select: {
              id: true,
              name: true,
              whatsappNumber: true,
              address: true,
              ownerCity: true,
              businessCategory: true,
              homeBookingFee: true,
              openingTime: true,
              closingTime: true,
              services: {
                where: { isActive: true },
                select: { id: true, name: true, price: true, durationMins: true, gender: true },
                orderBy: { price: 'asc' },
              },
              _count: {
                select: { staff: { where: { isAvailable: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
        }
      } catch (err) {
        // Fallback gracefully
      }
    }

    let demoCount = 0;
    const result: any[] = [];

    for (const s of salons) {
      const isDemo =
        s.name.toLowerCase().includes('demo styling studio') ||
        s.name.toLowerCase().includes('elegance salon') ||
        s.name.toLowerCase().includes('elegance barber') ||
        s.whatsappNumber === '+91 99999 88888' ||
        s.whatsappNumber === '+919876543210';

      if (isDemo) {
        demoCount++;
        if (demoCount > 1) continue;
      }

      const prices = s.services.map((srv) => Number(srv.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 299;

      result.push({
        id: s.id,
        name: s.name,
        whatsappNumber: s.whatsappNumber,
        address: s.address || 'Address not specified',
        ownerCity: s.ownerCity || 'Mumbai',
        businessCategory: s.businessCategory || 'UNISEX_SALON',
        homeBookingFee: Number(s.homeBookingFee || 0),
        openingTime: s.openingTime || '10:00',
        closingTime: s.closingTime || '20:00',
        services: s.services,
        serviceCount: s.services.length,
        staffCount: s._count?.staff || 0,
        minPrice,
        rating: 4.8,
        reviewCount: 42,
      });
    }

    if (isDefaultQuery) {
      this.publicSalonsCache = {
        data: result,
        expiresAt: now + 15000,
      };
    }

    return result;
  }

  @Get('api/v1/public/salons/:salonId/catalog')
  async getPublicSalonCatalog(@Param('salonId') salonId: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
        staff: {
          where: { isAvailable: true },
        },
      },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return {
      id: salon.id,
      name: salon.name,
      address: salon.address,
      ownerCity: salon.ownerCity,
      whatsappNumber: salon.whatsappNumber,
      businessCategory: salon.businessCategory,
      homeBookingFee: Number(salon.homeBookingFee || 0),
      openingTime: salon.openingTime || '10:00',
      closingTime: salon.closingTime || '20:00',
      googleReviewLink: salon.googleReviewLink,
      services: salon.services,
      staff: salon.staff,
    };
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
