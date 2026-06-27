import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all customers under a specific Salon, with search and segment support
   */
  async findAll(salonId: string, searchTerm?: string, segment?: string) {
    this.logger.log(
      `Fetching customers for salon: ${salonId} (search: ${searchTerm || 'none'}, segment: ${segment || 'none'})`,
    );

    const whereConditions: any[] = [{ salonId }];

    if (segment === 'inactive_30_days') {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      whereConditions.push({
        OR: [
          {
            lastVisit: {
              lte: cutoffDate,
            },
          },
          {
            AND: [{ lastVisit: null }, { createdAt: { lte: cutoffDate } }],
          },
        ],
      });
    } else if (segment === 'frequent_visitors') {
      whereConditions.push({
        totalVisits: {
          gte: 5,
        },
      });
    }

    if (searchTerm) {
      whereConditions.push({
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    return this.prisma.customer.findMany({
      where: {
        AND: whereConditions,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Fetch detailed customer profile including spend insights and active conversation chats
   */
  async findOne(salonId: string, id: string) {
    this.logger.log(`Fetching customer detail: ${id} for salon: ${salonId}`);

    // Check if the customer exists globally first to detect unauthorized cross-tenant attempts
    const globalCustomer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (globalCustomer && globalCustomer.salonId !== salonId) {
      await this.prisma.logSecurityEvent(
        salonId,
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        {
          entity: 'Customer',
          targetId: id,
          action: 'findOne',
        },
      );
      throw new NotFoundException(
        `Customer with ID ${id} not found under this salon.`,
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id, salonId },
      include: {
        appointments: {
          include: {
            service: true,
          },
          orderBy: {
            startTime: 'desc',
          },
        },
        conversations: {
          include: {
            messages: {
              orderBy: {
                timestamp: 'asc',
              },
            },
          },
        },
      },
    });

    if (!customer) return null;

    // Dynamically calculate spend aggregates
    const totalSpend = customer.appointments.reduce(
      (sum, appt) => sum + (appt.service?.price || 0),
      0,
    );

    return {
      ...customer,
      totalSpend,
    };
  }

  /**
   * Create or update offline customer and log a completed visit
   */
  async createOffline(
    salonId: string,
    dto: {
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
    this.logger.log(`Recording offline visit for phone ${dto.phone} in salon: ${salonId}`);

    // Clean phone number
    const normalizedPhone = dto.phone.trim();

    // 1. Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: { salonId, phone: normalizedPhone },
    });

    if (customer) {
      // Update customer details if they are provided but empty in db
      const updateData: any = {};
      if (dto.name && customer.name !== dto.name) updateData.name = dto.name;
      if (dto.gender && !customer.gender) updateData.gender = dto.gender.toUpperCase();
      if (dto.dateOfBirth && !customer.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
      if (dto.notes && !customer.notes) updateData.notes = dto.notes;
      if (dto.source && customer.source === 'WHATSAPP') updateData.source = dto.source.toUpperCase();

      if (Object.keys(updateData).length > 0) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: updateData,
        });
      }
    } else {
      customer = await this.prisma.customer.create({
        data: {
          salonId,
          name: dto.name,
          phone: normalizedPhone,
          gender: dto.gender ? dto.gender.toUpperCase() : null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          notes: dto.notes || null,
          source: dto.source ? dto.source.toUpperCase() : 'WALK_IN',
        },
      });
    }

    // 2. Fetch service
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, salonId },
    });
    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found under this salon.`);
    }

    // 3. Determine bookingSource from source
    let bookingSource = 'OFFLINE_OTHER';
    const upperSource = dto.source.toUpperCase();
    if (upperSource === 'WALK_IN' || upperSource === 'WALKIN') {
      bookingSource = 'OFFLINE_WALKIN';
    } else if (upperSource === 'PHONE') {
      bookingSource = 'OFFLINE_PHONE';
    } else if (upperSource === 'DESK') {
      bookingSource = 'OFFLINE_DESK';
    } else {
      bookingSource = 'OFFLINE_OTHER';
    }

    // 4. Calculate timing
    const startTime = dto.visitDate ? new Date(dto.visitDate) : new Date();
    const duration = service.durationMins || 30;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const amountPaid = dto.amountPaid !== undefined ? dto.amountPaid : service.price;

    // 5. Create Completed Appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        salonId,
        customerId: customer.id,
        serviceId: dto.serviceId,
        staffId: dto.staffId || null,
        startTime,
        endTime,
        status: 'COMPLETED',
        bookingSource,
        amountPaid,
        notes: dto.notes || null,
      },
    });

    // 6. Recalculate customer metrics (totalVisits, lastVisit)
    const appointments = await this.prisma.appointment.findMany({
      where: { customerId: customer.id, salonId },
      orderBy: { startTime: 'desc' },
    });

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalVisits: appointments.length,
        lastVisit: appointments[0]?.startTime || null,
      },
    });

    return {
      success: true,
      customerId: customer.id,
      appointmentId: appointment.id,
      merged: appointments.length > 1,
    };
  }

  /**
   * Fetch a unified customer profile with rich analytics
   */
  async findUnified(salonId: string, id: string) {
    this.logger.log(`Fetching unified customer profile for: ${id} under salon: ${salonId}`);

    const globalCustomer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (globalCustomer && globalCustomer.salonId !== salonId) {
      await this.prisma.logSecurityEvent(
        salonId,
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        {
          entity: 'Customer',
          targetId: id,
          action: 'findUnified',
        },
      );
      throw new NotFoundException(`Customer with ID ${id} not found under this salon.`);
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id, salonId },
      include: {
        appointments: {
          include: {
            service: true,
            staff: true,
          },
          orderBy: {
            startTime: 'desc',
          },
        },
      },
    });

    if (!customer) return null;

    const appointments = customer.appointments;
    const totalVisits = appointments.length;

    let totalRevenue = 0;
    const serviceCounts: Record<string, number> = {};
    const staffCounts: Record<string, number> = {};
    let onlineCount = 0;
    let offlineCount = 0;
    const visitDates: Date[] = [];

    appointments.forEach((appt) => {
      const revenue = appt.amountPaid !== null && appt.amountPaid !== undefined 
        ? appt.amountPaid 
        : (appt.service?.price || 0);
      totalRevenue += revenue;

      if (appt.service) {
        serviceCounts[appt.service.name] = (serviceCounts[appt.service.name] || 0) + 1;
      }

      if (appt.staff) {
        staffCounts[appt.staff.name] = (staffCounts[appt.staff.name] || 0) + 1;
      }

      const isOffline = appt.bookingSource && appt.bookingSource.startsWith('OFFLINE_');
      if (isOffline) {
        offlineCount++;
      } else {
        onlineCount++;
      }

      visitDates.push(new Date(appt.startTime));
    });

    const preferredServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 3);

    const preferredStaff = Object.entries(staffCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 2);

    let bookingFrequencyDays = 30;
    if (visitDates.length >= 2) {
      const sortedDates = [...visitDates].sort((a, b) => a.getTime() - b.getTime());
      let totalDiffMs = 0;
      for (let i = 1; i < sortedDates.length; i++) {
        totalDiffMs += sortedDates[i].getTime() - sortedDates[i - 1].getTime();
      }
      const avgDiffMs = totalDiffMs / (sortedDates.length - 1);
      bookingFrequencyDays = Math.round(avgDiffMs / (24 * 60 * 60 * 1000));
    }

    const onlineRatio = totalVisits > 0 ? parseFloat(((onlineCount / totalVisits) * 100).toFixed(1)) : 0;
    const offlineRatio = totalVisits > 0 ? parseFloat(((offlineCount / totalVisits) * 100).toFixed(1)) : 0;

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      gender: customer.gender,
      dateOfBirth: customer.dateOfBirth,
      notes: customer.notes,
      source: customer.source,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      appointments: appointments,
      metrics: {
        totalVisits,
        totalRevenue,
        lastVisit: customer.lastVisit,
        preferredServices,
        preferredStaff,
        lifetimeValue: totalRevenue,
        bookingFrequencyDays,
        onlineRatio,
        offlineRatio,
      },
    };
  }
}
