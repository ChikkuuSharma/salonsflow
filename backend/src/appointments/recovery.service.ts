import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search and rank alternative slot suggestions when a requested slot is unavailable.
   * Ranks same-stylist alternative times first, followed by other qualified stylists at the same time.
   */
  async getAlternativeSlots(
    salonId: string,
    serviceId: string,
    requestedTime: Date,
    requestedStaffId?: string,
  ): Promise<Array<{ staffId: string; staffName: string; startTime: Date; endTime: Date }>> {
    try {
      const service = await this.prisma.service.findFirst({
        where: { id: serviceId, salonId },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }

      const duration = service.durationMins;
      const suggestions: Array<{ staffId: string; staffName: string; startTime: Date; endTime: Date }> = [];

      // Load salon working hours from configuration
      const salon = await this.prisma.salon.findUnique({
        where: { id: salonId },
        select: { openingTime: true, closingTime: true },
      });
      const [openHour, openMin] = (salon?.openingTime || '10:00').split(':').map(Number);
      const [closeHour, closeMin] = (salon?.closingTime || '20:00').split(':').map(Number);

      const dayStart = new Date(requestedTime);
      dayStart.setHours(openHour, openMin, 0, 0);
      const dayEnd = new Date(requestedTime);
      dayEnd.setHours(closeHour, closeMin, 0, 0);

      // Generate time offsets of 30-min intervals on the same day
      const candidateTimes: Date[] = [];
      const current = new Date(dayStart);
      const now = new Date();
      
      while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
        const isToday = current.toDateString() === now.toDateString();
        // Only add future slots if the target day is today
        if (!isToday || current.getTime() >= now.getTime()) {
          candidateTimes.push(new Date(current));
        }
        current.setMinutes(current.getMinutes() + 30);
      }

      // Sort candidate times chronologically
      candidateTimes.sort((a, b) => a.getTime() - b.getTime());

      // 1. If a specific staff was requested, find their same-day alternatives first
      if (requestedStaffId) {
        const staff = await this.prisma.staff.findFirst({
          where: { id: requestedStaffId, salonId, isAvailable: true },
        });

        if (staff) {
          // Verify qualifications
          const qualCount = typeof this.prisma.staffService?.count === 'function'
            ? await this.prisma.staffService.count({ where: { staffId: requestedStaffId } })
            : 0;
          let isQualified = true;
          if (qualCount > 0) {
            const qual = await this.prisma.staffService.findUnique({
              where: { staffId_serviceId: { staffId: requestedStaffId, serviceId } },
            });
            isQualified = !!qual;
          }

          if (isQualified) {
            for (const time of candidateTimes) {
              // Limit same-staff suggestions to 2 options
              if (suggestions.filter(s => s.staffId === requestedStaffId).length >= 2) break;

              const slotEnd = new Date(time.getTime() + duration * 60000);
              const overlaps = await this.prisma.appointment.findMany({
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
                  startTime: { lt: slotEnd },
                  endTime: { gt: time },
                },
              });

              if (overlaps.length === 0) {
                suggestions.push({
                  staffId: requestedStaffId,
                  staffName: staff.name,
                  startTime: time,
                  endTime: slotEnd,
                });
              }
            }
          }
        }
      }

      // 2. Search other qualified staff at the requested time
      const otherStaff = await this.prisma.staff.findMany({
        where: {
          salonId,
          isAvailable: true,
          id: requestedStaffId ? { not: requestedStaffId } : undefined,
          OR: [
            { staffServices: { some: { serviceId } } },
            { staffServices: { none: {} } },
          ],
        },
      });

      // First try to fit them at the exact same requested time
      for (const staff of otherStaff) {
        if (suggestions.length >= 4) break;

        const slotEnd = new Date(requestedTime.getTime() + duration * 60000);
        const overlaps = await this.prisma.appointment.findMany({
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
            startTime: { lt: slotEnd },
            endTime: { gt: requestedTime },
          },
        });

        if (overlaps.length === 0) {
          suggestions.push({
            staffId: staff.id,
            staffName: staff.name,
            startTime: requestedTime,
            endTime: slotEnd,
          });
        }
      }

      // 3. Fallback: Search other staff at other times close to requestedTime
      for (const time of candidateTimes) {
        if (suggestions.length >= 4) break;

        for (const staff of otherStaff) {
          if (suggestions.length >= 4) break;
          // Avoid duplicate suggestions for this staff at this time
          if (suggestions.some(s => s.staffId === staff.id && s.startTime.getTime() === time.getTime())) continue;

          const slotEnd = new Date(time.getTime() + duration * 60000);
          const overlaps = await this.prisma.appointment.findMany({
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
              startTime: { lt: slotEnd },
              endTime: { gt: time },
            },
          });

          if (overlaps.length === 0) {
            suggestions.push({
              staffId: staff.id,
              staffName: staff.name,
              startTime: time,
              endTime: slotEnd,
            });
          }
        }
      }

      // Sort final suggestions chronologically
      return suggestions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).slice(0, 4);

    } catch (e) {
      this.logger.error(`Error finding alternative slots: ${e.message}`);
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      return [];
    }
  }

  /**
   * Fetch sister partner salons registered in the system (excluding current salonId)
   */
  async getPartnerSalons(salonId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      return await this.prisma.salon.findMany({
        where: { id: { not: salonId } },
        take: 2,
        select: { id: true, name: true },
      });
    } catch (e) {
      this.logger.error(`Error fetching partner salons: ${e.message}`);
      return [];
    }
  }

  /**
   * Safe transaction-isolated reschedule appointment.
   */
  async rescheduleAppointment(
    appointmentId: string,
    salonId: string,
    newStartTime: Date,
    newStaffId?: string | null,
  ) {
    // 1. Fetch current appointment and verify tenancy scope
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, salonId },
      include: { service: true },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const duration = appointment.durationMins || appointment.service.durationMins;
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000);

    const staffIdToUse = newStaffId !== undefined ? newStaffId : appointment.staffId;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Enforce advisory lock at salonId level to prevent race updates
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${salonId}))`;

        if (staffIdToUse) {
          const staff = await tx.staff.findFirst({
            where: { id: staffIdToUse, salonId },
          });
          if (!staff) {
            throw new BadRequestException('Staff member not found at this salon');
          }
          if (staff.isAvailable === false) {
            throw new BadRequestException('Requested stylist is currently not available');
          }

          const qualCount = typeof tx.staffService?.count === 'function'
            ? await tx.staffService.count({ where: { staffId: staffIdToUse } })
            : 0;

          if (qualCount > 0) {
            const qual = await tx.staffService.findUnique({
              where: { staffId_serviceId: { staffId: staffIdToUse, serviceId: appointment.serviceId } },
            });
            if (!qual) {
              throw new BadRequestException('Requested stylist is not qualified for this service');
            }
          }
        }

        // Check overlaps (excluding the current appointment itself)
        const overlaps = await tx.appointment.findMany({
          where: {
            salonId,
            id: { not: appointmentId },
            staffId: staffIdToUse,
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

        if (overlaps.length > 0) {
          throw new BadRequestException('Requested reschedule slot is not available');
        }

        // Update the appointment
        const updated = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            startTime: newStartTime,
            endTime: newEndTime,
            staffId: staffIdToUse,
            status: 'CONFIRMED', // reset to confirmed if it was pending or anything else
          },
          include: {
            customer: true,
            service: true,
            staff: true,
          },
        });

        // Write Audit Log
        await tx.auditLog.create({
          data: {
            salonId,
            action: 'RESCHEDULED_APPOINTMENT',
            details: {
              appointmentId,
              oldStartTime: appointment.startTime.toISOString(),
              newStartTime: newStartTime.toISOString(),
              oldStaffId: appointment.staffId,
              newStaffId: staffIdToUse,
            },
          },
        });

        return updated;
      });
    } catch (e) {
      this.logger.error(`Error in rescheduleAppointment: ${e.message}`);
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException(e.message || 'Reschedule failed');
    }
  }
}
