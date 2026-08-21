import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/public/appointments')
export class PublicBookingsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Fetch active services, staff, and configurations of a Salon
   */
  @Get('salon/:id')
  async getSalonInfo(@Param('id') id: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id },
      include: {
        services: {
          where: { isActive: true },
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
      openingTime: salon.openingTime || '10:00',
      closingTime: salon.closingTime || '20:00',
      services: salon.services,
      staff: salon.staff,
    };
  }

  /**
   * Fetch dynamic available slots for a given date, service, and staff member
   */
  @Get('slots')
  async getSlots(
    @Query('salonId') salonId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') dateStr: string, // YYYY-MM-DD
    @Query('staffId') staffId?: string,
    @Query('detailed') detailed?: string,
  ) {
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const dayStartUtc = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
    const dayEndUtc = new Date(Date.UTC(yr, mo - 1, dy, 23, 59, 59) - 5.5 * 60 * 60 * 1000);

    // Execute salon lookup, service lookup, and day appointments in a SINGLE parallel Promise.all query
    const [salon, service, dayAppointments] = await Promise.all([
      this.prisma.salon.findUnique({ where: { id: salonId } }),
      this.prisma.service.findUnique({ where: { id: serviceId } }),
      this.prisma.appointment.findMany({
        where: {
          salonId,
          ...(staffId ? { staffId } : {}),
          status: { in: ['CONFIRMED', 'PENDING'] },
          startTime: { lt: dayEndUtc },
          endTime: { gt: dayStartUtc },
        },
      }),
    ]);

    if (!salon) throw new NotFoundException('Salon not found');
    if (!service) throw new NotFoundException('Service not found');

    const openTimeStr = salon.openingTime || '10:00';
    const closeTimeStr = salon.closingTime || '20:00';

    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);

    // Calculate current IST time (UTC +5:30)
    const nowUtc = new Date();
    const nowIst = new Date(nowUtc.getTime() + 5.5 * 60 * 60 * 1000);
    const curYear = nowIst.getUTCFullYear();
    const curMonth = nowIst.getUTCMonth();
    const curDay = nowIst.getUTCDate();
    const curHour = nowIst.getUTCHours();
    const curMin = nowIst.getUTCMinutes();

    const isToday = yr === curYear && (mo - 1) === curMonth && dy === curDay;

    const formatTo12Hour = (hour: number, minute: number) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const displayMin = minute.toString().padStart(2, '0');
      return `${displayHour}:${displayMin} ${ampm}`;
    };

    const slots: string[] = [];
    const intervalMinutes = 15;

    let currentHour = openH;
    let currentMinute = openM;

    while (currentHour < closeH || (currentHour === closeH && currentMinute < closeM)) {
      const isFuture = !isToday || 
        (currentHour > curHour || (currentHour === curHour && currentMinute > curMin));

      if (isFuture) {
        slots.push(formatTo12Hour(currentHour, currentMinute));
      }

      currentMinute += intervalMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    const availableSlots: string[] = [];
    const detailedSlots: Array<{ time: string; isAvailable: boolean }> = [];
    const serviceDurationMs = (service.durationMins || 30) * 60000;

    // Evaluate all 40+ slots IN-MEMORY with 0ms latency
    for (const slotStr of slots) {
      const [tStr, ampm] = slotStr.split(' ');
      let [h, m] = tStr.split(':').map(Number);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;

      const slotStartTime = new Date(Date.UTC(yr, mo - 1, dy, h, m) - 5.5 * 60 * 60 * 1000);
      const slotEndTime = new Date(slotStartTime.getTime() + serviceDurationMs);

      const hasOverlap = dayAppointments.some((appt) => {
        const apptStart = new Date(appt.startTime);
        const apptEnd = new Date(appt.endTime);
        return apptStart < slotEndTime && apptEnd > slotStartTime;
      });

      const isFree = !hasOverlap;
      detailedSlots.push({ time: slotStr, isAvailable: isFree });
      if (isFree) {
        availableSlots.push(slotStr);
      }
    }

    const activeTodayCount = dayAppointments.length;
    const estimatedWaitMins = activeTodayCount * 15;

    if (detailed === 'true') {
      return {
        availableSlots,
        detailedSlots,
        queueInfo: {
          activeAppointmentsAhead: activeTodayCount,
          estimatedWaitMins,
        },
      };
    }

    return availableSlots;
  }

  /**
   * Book appointment publicly (with auto customer lookup/creation)
   */
  @Post()
  async createBooking(
    @Body() body: {
      salonId: string;
      serviceId: string;
      date: string; // YYYY-MM-DD
      time: string; // "03:30 PM" or "15:30"
      staffId?: string;
      customerName: string;
      customerPhone: string;
    },
  ) {
    if (!body.salonId || !body.serviceId || !body.date || !body.time || !body.customerName || !body.customerPhone) {
      throw new BadRequestException('Missing required fields');
    }

    // Clean phone number
    let phone = body.customerPhone.trim().replace(/[^0-9]/g, '');
    if (!phone.startsWith('+')) {
      if (phone.length === 10) {
        phone = '+91' + phone;
      } else {
        phone = '+' + phone;
      }
    }

    // 1. Locate or create customer record
    let customer = await this.prisma.customer.findFirst({
      where: { salonId: body.salonId, phone },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          salonId: body.salonId,
          name: body.customerName,
          phone,
          source: 'ONLINE_WHATSAPP',
        },
      });
    }

    // 2. Locate service
    const service = await this.prisma.service.findFirst({
      where: { id: body.serviceId, salonId: body.salonId },
    });
    if (!service) throw new NotFoundException('Service not found');

    // 3. Parse date and time
    let hour = 12;
    let minute = 0;
    const timeClean = body.time.trim();
    if (timeClean.toUpperCase().includes('AM') || timeClean.toUpperCase().includes('PM')) {
      const [timePart, ampm] = timeClean.split(' ');
      const [h, m] = timePart.split(':').map(Number);
      hour = h;
      minute = m;
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
    } else {
      const [h, m] = timeClean.split(':').map(Number);
      hour = h;
      minute = m;
    }

    const [yr, mo, dy] = body.date.split('-').map(Number);
    const startTime = new Date(Date.UTC(yr, mo - 1, dy, hour, minute) - 5.5 * 60 * 60 * 1000);

    // 4. Create appointment
    const appointment = await this.appointmentsService.createBookingTransaction({
      salonId: body.salonId,
      customerId: customer.id,
      serviceName: service.name,
      startTime,
      staffId: body.staffId || undefined,
      bookingSource: 'ONLINE_WHATSAPP',
    });

    return appointment;
  }
}
