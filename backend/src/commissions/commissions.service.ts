import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async setCommission(
    salonId: string,
    dto: { staffId: string; serviceId: string; ratePercent: number },
  ) {
    const { staffId, serviceId, ratePercent } = dto;

    if (ratePercent < 0 || ratePercent > 100) {
      throw new BadRequestException('Commission rate must be between 0% and 100%');
    }

    // IDOR Protection: Verify that staff and service belong to this salon
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff || staff.salonId !== salonId) {
      throw new BadRequestException('Staff member not found under this salon.');
    }

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.salonId !== salonId) {
      throw new BadRequestException('Service not found under this salon.');
    }

    return this.prisma.commission.upsert({
      where: {
        staffId_serviceId: {
          staffId,
          serviceId,
        },
      },
      update: { ratePercent },
      create: {
        salonId,
        staffId,
        serviceId,
        ratePercent,
      },
    });
  }

  async calculatePayouts(
    salonId: string,
    query: { staffId?: string; startDate?: string; endDate?: string },
  ) {
    const { staffId, startDate, endDate } = query;

    // Build appointment query filters
    const whereClause: any = {
      salonId,
      status: 'COMPLETED',
    };

    if (staffId) {
      whereClause.staffId = staffId;
    }

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) {
        whereClause.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.startTime.lte = new Date(endDate);
      }
    }

    // Fetch all completed appointments matching filters
    const appointments = await this.prisma.appointment.findMany({
      where: whereClause,
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Fetch all commissions for mapping
    const commissions = await this.prisma.commission.findMany({
      where: { salonId },
    });

    // Build index of commission rates: "staffId-serviceId" -> ratePercent
    const commissionMap = new Map<string, number>();
    commissions.forEach((c) => {
      commissionMap.set(`${c.staffId}-${c.serviceId}`, c.ratePercent);
    });

    // Group appointments by staff
    const staffPayoutsMap = new Map<string, {
      staffId: string;
      staffName: string;
      totalBookings: number;
      totalRevenue: number;
      totalEarnings: number;
      bookings: any[];
    }>();

    for (const appt of appointments) {
      if (!appt.staff) continue; // Skip if no staff assigned

      const key = appt.staff.id;
      const ratePercent = commissionMap.get(`${appt.staff.id}-${appt.service.id}`) ?? 0;
      const basePrice = appt.amountPaid ?? appt.service.price;
      const commissionEarned = basePrice * (ratePercent / 100);

      if (!staffPayoutsMap.has(key)) {
        staffPayoutsMap.set(key, {
          staffId: appt.staff.id,
          staffName: appt.staff.name,
          totalBookings: 0,
          totalRevenue: 0,
          totalEarnings: 0,
          bookings: [],
        });
      }

      const staffData = staffPayoutsMap.get(key)!;
      staffData.totalBookings += 1;
      staffData.totalRevenue += basePrice;
      staffData.totalEarnings += commissionEarned;
      staffData.bookings.push({
        id: appt.id,
        customerName: appt.customer.name,
        serviceName: appt.service.name,
        startTime: appt.startTime,
        amountPaid: basePrice,
        ratePercent,
        commissionEarned,
      });
    }

    return Array.from(staffPayoutsMap.values());
  }
}
