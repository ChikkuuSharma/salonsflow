import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WaitingListStatus } from '@prisma/client';

@Injectable()
export class WaitingListService {
  private readonly logger = new Logger(WaitingListService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add a customer to the priority waiting list.
   */
  async addToWaitingList(data: {
    salonId: string;
    customerId: string;
    serviceId: string;
    staffId?: string | null;
    requestedStartTime: Date;
    priority?: number;
  }) {
    // Validate salon scope for customer and service
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, salonId: data.salonId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found at this salon');
    }

    const service = await this.prisma.service.findFirst({
      where: { id: data.serviceId, salonId: data.salonId },
    });
    if (!service) {
      throw new NotFoundException('Service not found at this salon');
    }

    if (data.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: data.staffId, salonId: data.salonId },
      });
      if (!staff) {
        throw new NotFoundException('Staff member not found at this salon');
      }
    }

    return this.prisma.waitingList.create({
      data: {
        salonId: data.salonId,
        customerId: data.customerId,
        serviceId: data.serviceId,
        staffId: data.staffId || null,
        requestedStartTime: data.requestedStartTime,
        priority: data.priority ?? 1,
        status: WaitingListStatus.WAITING,
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });
  }

  /**
   * Remove/cancel a waitlist entry.
   */
  async removeFromWaitingList(id: string, salonId: string) {
    const entry = await this.prisma.waitingList.findFirst({
      where: { id, salonId },
    });
    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    return this.prisma.waitingList.delete({
      where: { id },
    });
  }

  /**
   * List all active waiting customers for a salon, ordered by priority (VIP first), then oldest first.
   */
  async getWaitingList(salonId: string) {
    return this.prisma.waitingList.findMany({
      where: { salonId, status: WaitingListStatus.WAITING },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Manually promote a waitlist customer to a confirmed booking, bypassing timers.
   */
  async promoteWaitlistEntry(id: string, salonId: string) {
    const entry = await this.prisma.waitingList.findFirst({
      where: { id, salonId },
      include: { service: true, customer: true },
    });
    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    const duration = entry.service.durationMins;
    const endTime = new Date(entry.requestedStartTime.getTime() + duration * 60000);

    return this.prisma.$transaction(async (tx) => {
      // Advisory lock
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${salonId}))`;

      // Check if slot is available (ignoring expired holds)
      const overlaps = await tx.appointment.findMany({
        where: {
          salonId,
          staffId: entry.staffId,
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
          endTime: { gt: entry.requestedStartTime },
        },
      });

      if (overlaps.length > 0) {
        throw new BadRequestException('Requested slot is currently occupied by another booking');
      }

      // Promote to appointment
      const appointment = await tx.appointment.create({
        data: {
          salonId,
          customerId: entry.customerId,
          serviceId: entry.serviceId,
          staffId: entry.staffId,
          startTime: entry.requestedStartTime,
          endTime,
          status: 'CONFIRMED',
          bookingSource: 'ONLINE_AI',
        },
        include: {
          service: true,
          customer: true,
          staff: true,
        },
      });

      // Update waitlist entry to BOOKED
      await tx.waitingList.update({
        where: { id },
        data: { status: WaitingListStatus.BOOKED },
      });

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          salonId,
          action: 'PROMOTED_WAITLIST_ENTRY',
          details: {
            waitlistId: id,
            appointmentId: appointment.id,
            customerId: entry.customerId,
          },
        },
      });

      return appointment;
    });
  }

  /**
   * Search for waitlist candidates when a slot becomes available (due to cancellation).
   * Holds the slot for 15 minutes and notifies the top candidate.
   */
  async checkAndNotifyWaitlistCandidates(
    salonId: string,
    serviceId: string,
    startTime: Date,
    endTime: Date,
    staffId?: string | null,
  ): Promise<boolean> {
    // Acquire advisory lock to serialize matching
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${salonId}))`;

      // Find matching waitlist entries
      // Entries must be WAITING, match service, fit within the start/end time, and match staffId preference (if defined)
      const candidates = await tx.waitingList.findMany({
        where: {
          salonId,
          serviceId,
          status: WaitingListStatus.WAITING,
          requestedStartTime: startTime,
          OR: [
            { staffId: null },
            { staffId: staffId || undefined }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
      });

      if (candidates.length === 0) {
        return false;
      }

      const topCandidate = candidates[0];
      const holdDuration = 15; // minutes
      const heldUntil = new Date(Date.now() + holdDuration * 60000);

      // Create a temporary PENDING appointment to reserve the slot
      const holdAppointment = await tx.appointment.create({
        data: {
          salonId,
          customerId: topCandidate.customerId,
          serviceId: topCandidate.serviceId,
          staffId: staffId || null,
          startTime,
          endTime,
          status: 'PENDING',
          heldUntil,
          bookingSource: 'ONLINE_AI',
        },
        include: {
          customer: true,
          service: true,
        }
      });

      // Update waitlist entry status
      await tx.waitingList.update({
        where: { id: topCandidate.id },
        data: { status: WaitingListStatus.NOTIFIED },
      });

      // Create OUTBOUND notification message in the customer's conversation history
      let conversation = await tx.conversation.findFirst({
        where: { salonId, customerId: topCandidate.customerId }
      });
      if (!conversation) {
        conversation = await tx.conversation.create({
          data: { salonId, customerId: topCandidate.customerId }
        });
      }

      const formattedTime = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const formattedDate = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const notificationText = `Good news 🎉 A slot for your ${holdAppointment.service.name} is now available on ${formattedDate} at ${formattedTime}. Reply YES within 15 minutes to confirm.`;

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          content: notificationText,
          direction: 'OUTBOUND',
          language: 'ENGLISH',
        }
      });

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          salonId,
          action: 'NOTIFIED_WAITLIST_CANDIDATE',
          details: {
            waitlistId: topCandidate.id,
            customerId: topCandidate.customerId,
            appointmentId: holdAppointment.id,
            heldUntil: heldUntil.toISOString(),
          }
        }
      });

      this.logger.log(`Notified waitlist candidate ${topCandidate.customerId} for slot ${startTime}`);
      return true;
    });
  }

  /**
   * Release expired reservation holds and automatically notify the next candidate.
   * Can be triggered via cron or API.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processExpiredHolds(): Promise<number> {
    const expiredHolds = await this.prisma.appointment.findMany({
      where: {
        status: 'PENDING',
        heldUntil: { lte: new Date() },
      },
      include: {
        service: true,
      }
    });

    let count = 0;
    for (const hold of expiredHolds) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hold.salonId}))`;

          // Release hold
          await tx.appointment.delete({ where: { id: hold.id } });

          // Update candidate to EXPIRED
          const notifiedEntry = await tx.waitingList.findFirst({
            where: {
              salonId: hold.salonId,
              customerId: hold.customerId,
              serviceId: hold.serviceId,
              requestedStartTime: hold.startTime,
              status: WaitingListStatus.NOTIFIED,
            }
          });

          if (notifiedEntry) {
            await tx.waitingList.update({
              where: { id: notifiedEntry.id },
              data: { status: WaitingListStatus.EXPIRED },
            });
          }

          // Write Audit Log
          await tx.auditLog.create({
            data: {
              salonId: hold.salonId,
              action: 'EXPIRED_WAITLIST_HOLD',
              details: {
                appointmentId: hold.id,
                customerId: hold.customerId,
                waitlistId: notifiedEntry?.id,
              }
            }
          });
        });

        // Search for the next candidate for this slot
        await this.checkAndNotifyWaitlistCandidates(
          hold.salonId,
          hold.serviceId,
          hold.startTime,
          hold.endTime,
          hold.staffId,
        );

        count++;
      } catch (e) {
        this.logger.error(`Failed to process expired hold ${hold.id}: ${e.message}`);
      }
    }

    return count;
  }

  /**
   * Confirm booking for a waitlisted customer who replied YES to hold notification.
   */
  async confirmWaitlistHold(salonId: string, customerId: string): Promise<any> {
    const activeHold = await this.prisma.appointment.findFirst({
      where: {
        salonId,
        customerId,
        status: 'PENDING',
        heldUntil: { gt: new Date() },
      },
      include: { service: true, customer: true, staff: true }
    });

    if (!activeHold) {
      throw new BadRequestException('No active slot holds found or reservation has expired');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${salonId}))`;

      // Confirm appointment
      const confirmed = await tx.appointment.update({
        where: { id: activeHold.id },
        data: {
          status: 'CONFIRMED',
          heldUntil: null,
        },
        include: { service: true, customer: true, staff: true }
      });

      // Update waitlist entry to BOOKED
      const entry = await tx.waitingList.findFirst({
        where: {
          salonId,
          customerId,
          serviceId: activeHold.serviceId,
          requestedStartTime: activeHold.startTime,
          status: WaitingListStatus.NOTIFIED,
        }
      });

      if (entry) {
        await tx.waitingList.update({
          where: { id: entry.id },
          data: { status: WaitingListStatus.BOOKED },
        });
      }

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          salonId,
          action: 'CONFIRMED_WAITLIST_HOLD',
          details: {
            appointmentId: confirmed.id,
            customerId,
            waitlistId: entry?.id,
          }
        }
      });

      return confirmed;
    });
  }
}
