import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, SubscriptionStatus } from '@prisma/client';
import { WaitingListService } from './waiting-list.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly waitingListService: WaitingListService,
  ) {}

  /**
   * Find scheduled appointments under a specific Salon, with optional date filtering
   */
  async findAll(salonId: string, date?: string) {
    let dateFilter = {};
    if (date) {
      const [yr, mo, dy] = date.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
      const endOfDay = new Date(Date.UTC(yr, mo - 1, dy, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000);

      dateFilter = {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    return this.prisma.appointment.findMany({
      where: {
        salonId,
        ...dateFilter,
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  /**
   * Check if a specific time slot is available for a given service and staff member
   */
  async checkAvailability(
    salonId: string,
    serviceId: string,
    startTime: Date,
    staffId?: string,
  ): Promise<boolean> {
    try {
      const service = await this.prisma.service.findFirst({
        where: { id: serviceId, salonId },
      });

      if (!service) {
        const globalService = await this.prisma.service.findUnique({
          where: { id: serviceId },
        });
        if (globalService) {
          await this.prisma.logSecurityEvent(
            salonId,
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            {
              entity: 'Service',
              targetId: serviceId,
              action: 'checkAvailability',
            },
          );
        }
        throw new NotFoundException('Service not found at this salon');
      }

      const endTime = new Date(
        startTime.getTime() + service.durationMins * 60000,
      );

      const totalStaffCount = await this.prisma.staff.count({
        where: { salonId },
      });

      if (!totalStaffCount) {
        const overlappingAppointments = await this.prisma.appointment.findMany({
          where: {
            salonId,
            OR: [
              { status: 'CONFIRMED' },
              {
                status: 'PENDING',
                OR: [
                  { heldUntil: null },
                  { heldUntil: { gt: new Date() } }
                ]
              }
            ],
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });
        return overlappingAppointments.length === 0;
      }

      if (staffId) {
        const staff = await this.prisma.staff.findFirst({
          where: { id: staffId, salonId },
        });
        if (!staff || staff.isAvailable === false) {
          return false;
        }

        const qualCount = typeof this.prisma.staffService?.count === 'function'
          ? await this.prisma.staffService.count({ where: { staffId } })
          : 0;

        if (qualCount > 0) {
          const qualification = await this.prisma.staffService.findUnique({
            where: {
              staffId_serviceId: { staffId, serviceId },
            },
          });
          if (!qualification) {
            return false;
          }
        }

        const overlappingAppointments = await this.prisma.appointment.findMany({
          where: {
            salonId,
            staffId,
            OR: [
              { status: 'CONFIRMED' },
              {
                status: 'PENDING',
                OR: [
                  { heldUntil: null },
                  { heldUntil: { gt: new Date() } }
                ]
              }
            ],
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        return overlappingAppointments.length === 0;
      }

      const qualifiedStaff = (await this.prisma.staff.findMany({
        where: {
          salonId,
          isAvailable: true,
          OR: [
            {
              staffServices: {
                some: { serviceId },
              },
            },
            {
              staffServices: {
                none: {},
              },
            },
          ],
        },
      })) || [];

      if (qualifiedStaff.length === 0) {
        return false;
      }

      for (const staff of qualifiedStaff) {
        const overlappingAppointments = await this.prisma.appointment.findMany({
          where: {
            salonId,
            staffId: staff.id,
            OR: [
              { status: 'CONFIRMED' },
              {
                status: 'PENDING',
                OR: [
                  { heldUntil: null },
                  { heldUntil: { gt: new Date() } }
                ]
              }
            ],
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (overlappingAppointments.length === 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking availability: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Find the next available slots for a given service
   */
  async getAvailableSlots(
    salonId: string,
    serviceId: string,
    date: string,
  ): Promise<Date[]> {
    const requestedDate = new Date(date);
    const slots: Date[] = [];

    // Mock slots at 10 AM, 1 PM, 4 PM
    [10, 13, 16].forEach((hour) => {
      const slot = new Date(requestedDate);
      slot.setHours(hour, 0, 0, 0);
      slots.push(slot);
    });

    return slots;
  }

  /**
   * Resolve a stylist for booking based on qualification, availability, and workload balancing.
   */
  private async resolveStylistForBooking(
    tx: any,
    salonId: string,
    serviceId: string,
    startTime: Date,
    endTime: Date,
    requestedStaffId?: string,
  ): Promise<string | null> {
    if (requestedStaffId) {
      const staff = await tx.staff.findFirst({
        where: { id: requestedStaffId, salonId },
      });
      if (!staff) {
        throw new NotFoundException('Staff member not found at this salon');
      }
      if (staff.isAvailable === false) {
        throw new BadRequestException('Requested stylist is currently not available');
      }

      const qualCount = typeof tx.staffService?.count === 'function'
        ? await tx.staffService.count({ where: { staffId: requestedStaffId } })
        : 0;

      if (qualCount > 0) {
        const qual = await tx.staffService.findUnique({
          where: { staffId_serviceId: { staffId: requestedStaffId, serviceId } },
        });
        if (!qual) {
          throw new BadRequestException('Requested stylist is not qualified to perform this service');
        }
      }

      const overlappingAppointments = await tx.appointment.findMany({
        where: {
          salonId,
          staffId: requestedStaffId,
          OR: [
            { status: 'CONFIRMED' },
            {
              status: 'PENDING',
              OR: [
                { heldUntil: null },
                { heldUntil: { gt: new Date() } }
              ]
            }
          ],
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (overlappingAppointments.length > 0) {
        throw new BadRequestException('Time slot is no longer available');
      }

      return requestedStaffId;
    }

    const totalStaffCount = await tx.staff.count({ where: { salonId } });
    if (!totalStaffCount) {
      const overlappingAppointments = await tx.appointment.findMany({
        where: {
          salonId,
          OR: [
            { status: 'CONFIRMED' },
            {
              status: 'PENDING',
              OR: [
                { heldUntil: null },
                { heldUntil: { gt: new Date() } }
              ]
            }
          ],
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (overlappingAppointments.length > 0) {
        throw new BadRequestException('Time slot is no longer available');
      }
      return null;
    }

    const qualifiedStaff = (await tx.staff.findMany({
      where: {
        salonId,
        isAvailable: true,
        OR: [
          {
            staffServices: {
              some: { serviceId },
            },
          },
          {
            staffServices: {
              none: {},
            },
          },
        ],
      },
    })) || [];

    if (qualifiedStaff.length === 0) {
      const count = await tx.staff.count({ where: { salonId } });
      if (!count) {
        return null;
      }
      throw new BadRequestException('No stylists are qualified to perform this service');
    }

    const candidates: Array<{ id: string; bookedMinutes: number }> = [];
    const startOfDay = new Date(startTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startTime);
    endOfDay.setHours(23, 59, 59, 999);

    for (const staff of qualifiedStaff) {
      const overlappingAppointments = await tx.appointment.findMany({
        where: {
          salonId,
          staffId: staff.id,
          OR: [
            { status: 'CONFIRMED' },
            {
              status: 'PENDING',
              OR: [
                { heldUntil: null },
                { heldUntil: { gt: new Date() } }
              ]
            }
          ],
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (overlappingAppointments.length === 0) {
        const todaysBookings = await tx.appointment.findMany({
          where: {
            salonId,
            staffId: staff.id,
            status: { in: ['CONFIRMED', 'PENDING', 'COMPLETED'] },
            startTime: { gte: startOfDay, lte: endOfDay },
          },
          include: { service: true },
        });

        const bookedMinutes = todaysBookings.reduce((sum: number, appt: any) => {
          const duration = appt.durationMins ?? appt.service?.durationMins ?? 0;
          return sum + duration;
        }, 0);

        candidates.push({ id: staff.id, bookedMinutes });
      }
    }

    if (candidates.length === 0) {
      throw new BadRequestException('Time slot is no longer available');
    }

    candidates.sort((a, b) => a.bookedMinutes - b.bookedMinutes);
    return candidates[0].id;
  }

  /**
   * Create a new appointment
   */
  async createAppointment(data: {
    salonId: string;
    customerId: string;
    serviceId: string;
    startTime: Date;
    staffId?: string;
    durationMins?: number;
    bookingSource?: string;
  }) {
    // Verify subscription status is not suspended
    const subscription = await this.prisma.subscription.findUnique({
      where: { salonId: data.salonId },
    });
    if (subscription && subscription.status === SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException(
        'Appointment creation disabled. Salon subscription is suspended.',
      );
    }

    // 1. Fetch service to get duration and price and scope check
    const service = await this.prisma.service.findFirst({
      where: { id: data.serviceId, salonId: data.salonId },
    });

    if (!service) {
      const globalService = await this.prisma.service.findUnique({
        where: { id: data.serviceId },
      });
      if (globalService) {
        await this.prisma.logSecurityEvent(
          data.salonId,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          {
            entity: 'Service',
            targetId: data.serviceId,
            action: 'createAppointment',
          },
        );
      }
      throw new NotFoundException('Service not found at this salon');
    }

    // Verify customer scope check
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, salonId: data.salonId },
    });

    if (!customer) {
      const globalCustomer = await this.prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (globalCustomer) {
        await this.prisma.logSecurityEvent(
          data.salonId,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          {
            entity: 'Customer',
            targetId: data.customerId,
            action: 'createAppointment',
          },
        );
      }
      throw new NotFoundException('Customer not found at this salon');
    }

    const duration = data.durationMins ?? service.durationMins;
    const endTime = new Date(
      data.startTime.getTime() + duration * 60000,
    );

    try {
      // 2. Perform atomic Prisma Transaction to ensure availability check is concurrency-safe
      return await this.prisma.$transaction(async (tx) => {
        // Acquire exclusive tenant-level advisory lock on salonId to serialize booking creations and prevent TOCTOU races
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.salonId}))`;

        const resolvedStaffId = await this.resolveStylistForBooking(
          tx,
          data.salonId,
          data.serviceId,
          data.startTime,
          endTime,
          data.staffId,
        );

        // Create appointment inside transaction context
        const appointment = await tx.appointment.create({
          data: {
            salonId: data.salonId,
            customerId: data.customerId,
            serviceId: data.serviceId,
            staffId: resolvedStaffId,
            startTime: data.startTime,
            endTime,
            status: 'CONFIRMED',
            durationMins: data.durationMins || null,
            bookingSource: data.bookingSource || 'ONLINE_WHATSAPP',
          },
          include: {
            service: true,
            customer: true,
            staff: true,
          },
        });

        // Update missed call status to BOOKED if it was in PENDING or CONVERSATION_STARTED
        if (
          tx.missedCall &&
          appointment.customer &&
          appointment.customer.phone
        ) {
          await tx.missedCall.updateMany({
            where: {
              salonId: data.salonId,
              phone: appointment.customer.phone,
              status: { in: ['PENDING', 'CONVERSATION_STARTED'] },
            },
            data: {
              status: 'BOOKED',
            },
          });
        }

        // Update rebooking recommendation to BOOKED if it was in PENDING, APPROVED, or SENT
        if (tx.rebookingRecommendation) {
          await tx.rebookingRecommendation.updateMany({
            where: {
              salonId: data.salonId,
              customerId: data.customerId,
              serviceId: data.serviceId,
              status: { in: ['PENDING', 'APPROVED', 'SENT'] },
            },
            data: {
              status: 'BOOKED',
            },
          });
        }

        this.logger.log(
          `Created appointment ${appointment.id} for customer ${appointment.customerId}`,
        );

        return appointment;
      });
    } catch (error) {
      this.logger.error(
        `Error in createAppointment transaction: ${error.message}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        await this.prisma.logSecurityEvent(data.salonId, 'BOOKING_CONFLICT', {
          customerId: data.customerId,
          serviceId: data.serviceId,
          startTime: data.startTime.toISOString(),
          reason: 'Requested time slot is no longer available.',
        });
        throw error;
      }
      // Log database-level concurrency conflict/lock exception (NFR5)
      this.logger.warn(
        `[SECURITY_AUDIT_FAIL] Database-level booking collision or constraint violation for salon ${data.salonId}`,
      );
      await this.prisma.logSecurityEvent(data.salonId, 'BOOKING_CONFLICT', {
        customerId: data.customerId,
        serviceId: data.serviceId,
        startTime: data.startTime.toISOString(),
        reason: error.message || 'Database lock or constraint violation',
      });
      throw new BadRequestException(
        'Requested time slot is no longer available.',
      );
    }
  }

  /**
   * Create an appointment via transaction including validation and audit logging
   */
  async createBookingTransaction(data: {
    salonId: string;
    customerId: string;
    serviceName: string;
    startTime: Date;
    durationMins?: number;
    staffId?: string;
    bookingSource?: string;
  }) {
    // Verify customer scope check
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, salonId: data.salonId },
    });

    if (!customer) {
      const globalCustomer = await this.prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (globalCustomer) {
        await this.prisma.logSecurityEvent(
          data.salonId,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          {
            entity: 'Customer',
            targetId: data.customerId,
            action: 'createBookingTransaction',
          },
        );
      }
      throw new NotFoundException('Customer not found at this salon');
    }

    // 1. Find the service by case-insensitive name match
    const service = await this.prisma.service.findFirst({
      where: {
        salonId: data.salonId,
        name: {
          contains: data.serviceName,
          mode: 'insensitive',
        },
      },
    });

    if (!service) {
      throw new NotFoundException(
        `Service "${data.serviceName}" not found at this salon.`,
      );
    }

    const duration = data.durationMins ?? service.durationMins;
    const endTime = new Date(
      data.startTime.getTime() + duration * 60000,
    );

    try {
      // 2. Perform atomic Prisma Transaction and do the validation query INSIDE it
      return await this.prisma.$transaction(async (tx) => {
        // Acquire exclusive transaction-level advisory lock on salonId
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.salonId}))`;

        const resolvedStaffId = await this.resolveStylistForBooking(
          tx,
          data.salonId,
          service.id,
          data.startTime,
          endTime,
          data.staffId,
        );

        // Create appointment
        const appointment = await tx.appointment.create({
          data: {
            salonId: data.salonId,
            customerId: data.customerId,
            serviceId: service.id,
            staffId: resolvedStaffId,
            startTime: data.startTime,
            endTime,
            status: 'CONFIRMED',
            durationMins: data.durationMins || null,
            bookingSource: data.bookingSource || 'ONLINE_WHATSAPP',
          },
          include: {
            service: true,
            customer: true,
            staff: true,
          },
        });

        // Update missed call status to BOOKED if it was in PENDING or CONVERSATION_STARTED
        if (
          tx.missedCall &&
          appointment.customer &&
          appointment.customer.phone
        ) {
          await tx.missedCall.updateMany({
            where: {
              salonId: data.salonId,
              phone: appointment.customer.phone,
              status: { in: ['PENDING', 'CONVERSATION_STARTED'] },
            },
            data: {
              status: 'BOOKED',
            },
          });
        }

        // Update rebooking recommendation to BOOKED if it was in PENDING, APPROVED, or SENT
        if (tx.rebookingRecommendation) {
          await tx.rebookingRecommendation.updateMany({
            where: {
              salonId: data.salonId,
              customerId: data.customerId,
              serviceId: service.id,
              status: { in: ['PENDING', 'APPROVED', 'SENT'] },
            },
            data: {
              status: 'BOOKED',
            },
          });
        }

        // Create Audit Log
        await tx.auditLog.create({
          data: {
            salonId: data.salonId,
            action: 'CREATED_APPOINTMENT',
            details: {
              appointmentId: appointment.id,
              customerId: data.customerId,
              serviceId: service.id,
              startTime: data.startTime.toISOString(),
              endTime: endTime.toISOString(),
              bookedBy: 'AI_RECEPTIONIST',
            },
          },
        });

        return appointment;
      });
    } catch (error) {
      this.logger.error(`Error in createBookingTransaction: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // Log database-level concurrency conflict/lock exception (NFR5)
      this.logger.warn(
        `[SECURITY_AUDIT_FAIL] Database-level booking collision or constraint violation for salon ${data.salonId}`,
      );
      await this.prisma.logSecurityEvent(data.salonId, 'BOOKING_CONFLICT', {
        customerId: data.customerId,
        serviceId: service?.id,
        startTime: data.startTime.toISOString(),
        reason: error.message || 'Database lock or constraint violation',
      });
      throw new BadRequestException(
        'Requested time slot is no longer available.',
      );
    }
  }

  /**
   * Update an existing appointment's timing, duration, or assigned staff with concurrency locking
   */
  async updateAppointment(
    id: string,
    salonId: string,
    data: {
      startTime?: Date;
      durationMins?: number;
      staffId?: string | null;
    },
  ) {
    try {
      // 1. Fetch current appointment and verify it belongs to this salon
      const appointment = await this.prisma.appointment.findFirst({
        where: { id, salonId },
        include: { service: true },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      // 2. Perform atomic transaction
      return await this.prisma.$transaction(async (tx) => {
        // Acquire advisory lock
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${salonId}))`;

        // Compute updated values
        const newStartTime = data.startTime ?? appointment.startTime;
        const newDuration = data.durationMins ?? (appointment.durationMins ?? appointment.service.durationMins);
        const newEndTime = new Date(newStartTime.getTime() + newDuration * 60000);
        
        // Handle staffId (if staffId is provided in body, use it; if explicitly null/undefined, handle correctly)
        let newStaffId = appointment.staffId;
        if (data.staffId !== undefined) {
          newStaffId = data.staffId;
        }

        // Validate staff scope and qualifications if being updated
        if (newStaffId) {
          const staff = await tx.staff.findFirst({
            where: { id: newStaffId, salonId },
          });
          if (!staff) {
            throw new BadRequestException('Staff member not found at this salon');
          }

          const qual = await tx.staffService.findUnique({
            where: { staffId_serviceId: { staffId: newStaffId, serviceId: appointment.serviceId } },
          });
          if (!qual) {
            throw new BadRequestException('Requested stylist is not qualified to perform this service');
          }
        }

        // Check overlap with other appointments (excluding this appointment itself)
        const overlappingAppointments = await tx.appointment.findMany({
          where: {
            salonId,
            id: { not: id }, // Exclude self
            staffId: newStaffId,
            OR: [
              { status: 'CONFIRMED' },
              {
                status: 'PENDING',
                OR: [
                  { heldUntil: null },
                  { heldUntil: { gt: new Date() } }
                ]
              }
            ],
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
          },
        });

        if (overlappingAppointments.length > 0) {
          this.logger.warn(
            `[SECURITY_AUDIT_FAIL] Booking update collision on appointment ${id} for salon ${salonId}`,
          );
          await this.prisma.logSecurityEvent(salonId, 'BOOKING_CONFLICT', {
            customerId: appointment.customerId,
            serviceId: appointment.serviceId,
            startTime: newStartTime.toISOString(),
            reason: 'Requested updated time slot is no longer available.',
          });
          throw new BadRequestException('Requested updated time slot is not available.');
        }

        // Perform the update
        const updated = await tx.appointment.update({
          where: { id },
          data: {
            startTime: newStartTime,
            endTime: newEndTime,
            durationMins: data.durationMins !== undefined ? data.durationMins : appointment.durationMins,
            staffId: newStaffId,
          },
          include: {
            service: true,
            customer: true,
            staff: true,
          },
        });

        // Create Audit Log
        await tx.auditLog.create({
          data: {
            salonId,
            action: 'UPDATED_APPOINTMENT',
            details: {
              appointmentId: id,
              startTime: newStartTime.toISOString(),
              endTime: newEndTime.toISOString(),
              durationMins: updated.durationMins,
              staffId: newStaffId,
            },
          },
        });

        return updated;
      });
    } catch (error) {
      this.logger.error(`Error updating appointment: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error updating appointment.',
      );
    }
  }

  /**
   * Cancel an appointment and trigger waitlist notifications for the vacant slot
   */
  async cancelAppointment(id: string, salonId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, salonId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const cancelled = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { service: true },
    });

    // Write Audit Log
    await this.prisma.auditLog.create({
      data: {
        salonId,
        action: 'CANCELLED_APPOINTMENT',
        details: {
          appointmentId: id,
          startTime: appointment.startTime.toISOString(),
          endTime: appointment.endTime.toISOString(),
          staffId: appointment.staffId,
        },
      },
    });

    // Asynchronously notify waiting list candidates of the vacant slot
    this.waitingListService
      .checkAndNotifyWaitlistCandidates(
        salonId,
        cancelled.serviceId,
        cancelled.startTime,
        cancelled.endTime,
        cancelled.staffId,
      )
      .catch((err) =>
        this.logger.error(`Error notifying waitlist candidates on cancellation: ${err.message}`),
      );

    return cancelled;
  }
}
