import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Send 24-hour reminders for upcoming appointments
   * Runs every hour at the 0th minute.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleUpcomingReminders() {
    this.logger.log('Running 24-hour reminder job...');

    const now = new Date();
    const twentyFourHoursFromNow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    );
    const endWindow = new Date(
      twentyFourHoursFromNow.getTime() + 60 * 60 * 1000,
    ); // 1 hr window

    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          startTime: {
            gte: twentyFourHoursFromNow,
            lt: endWindow,
          },
          reminder: {
            is: null,
          },
        },
        include: {
          customer: true,
          salon: true,
          service: true,
        },
      });

      for (const appointment of appointments) {
        if (!appointment.customer.phone) continue;

        const timeStr = appointment.startTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const message = `Hi ${appointment.customer.name}, this is a friendly reminder from ${appointment.salon.name} about your ${appointment.service.name} appointment tomorrow at ${timeStr}. We look forward to seeing you!`;

        await this.whatsappService.sendMessage(
          appointment.customer.phone,
          message,
          undefined,
          appointment.salonId,
        );

        await this.prisma.reminder.create({
          data: {
            appointmentId: appointment.id,
            scheduledFor: appointment.startTime,
            isSent: true,
          },
        });

        this.logger.log(`Sent reminder to ${appointment.customer.phone}`);
      }
    } catch (error) {
      this.logger.error(`Error processing reminders: ${error.message}`);
    }
  }

  /**
   * Send Follow-up & Feedback requests
   * Runs every day at 18:00 (6:00 PM) for appointments completed that day.
   */
  @Cron('0 18 * * *')
  async handlePostAppointmentFollowUp() {
    this.logger.log('Running Post-Appointment Follow-up job...');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(17, 59, 59, 999); // Anything before 6 PM

    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          endTime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          customer: true,
          salon: true,
          service: true,
        },
      });

      for (const appointment of appointments) {
        if (!appointment.customer.phone) continue;

        const message = `Hi ${appointment.customer.name}, thank you for visiting ${appointment.salon.name} today! We hope you loved your ${appointment.service.name}. If you enjoyed your experience, we'd love it if you left us a review: [Link Placeholder]. Reply to this message if you need anything else!`;

        await this.whatsappService.sendMessage(
          appointment.customer.phone,
          message,
          undefined,
          appointment.salonId,
        );
        this.logger.log(`Sent follow-up to ${appointment.customer.phone}`);
      }
    } catch (error) {
      this.logger.error(`Error processing follow-ups: ${error.message}`);
    }
  }

  /**
   * Monitor salon subscriptions for expirations and execute reminders & suspensions
   * Runs daily at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpirations() {
    this.logger.log('Running daily subscription expirations monitor...');
    await this.runExpirationCheck();
  }

  async runExpirationCheck() {
    const now = new Date();
    
    // Find all subscriptions with a currentPeriodEnd in the past and status is active / trial / grace period
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        currentPeriodEnd: {
          lt: now,
        },
        status: {
          in: ['ACTIVE', 'TRIAL', 'GRACE_PERIOD'],
        },
      },
      include: {
        salon: true,
      },
    });

    for (const sub of subscriptions) {
      if (!sub.currentPeriodEnd) continue;

      // Calculate days elapsed since currentPeriodEnd
      const diffTime = Math.abs(now.getTime() - sub.currentPeriodEnd.getTime());
      const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      this.logger.log(
        `Subscription for salon ${sub.salon.name} expired ${elapsedDays} days ago (Period End: ${sub.currentPeriodEnd.toISOString()})`,
      );

      const ownerPhone = sub.salon.ownerMobile || sub.salon.whatsappNumber;

      try {
        if (elapsedDays === 1) {
          // Update status to GRACE_PERIOD
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'GRACE_PERIOD' },
          });

          // Send Reminder 1
          const msg = `Urgent Reminder from SalonFlow: The subscription for ${sub.salon.name} has expired. Please clear payment to avoid operational suspension.`;
          await this.whatsappService.sendMessage(ownerPhone, msg);
          
          await this.prisma.auditLog.create({
            data: {
              salonId: sub.salonId,
              action: 'SUBSCRIPTION_EXPIRY_WARNING_DAY_1',
              details: { daysElapsed: 1, previousStatus: sub.status },
            },
          });
        } else if (elapsedDays === 3) {
          // Send Reminder 3
          const msg = `Urgent Reminder (Day 3) from SalonFlow: Your subscription for ${sub.salon.name} is unpaid. Please resolve immediately.`;
          await this.whatsappService.sendMessage(ownerPhone, msg);

          await this.prisma.auditLog.create({
            data: {
              salonId: sub.salonId,
              action: 'SUBSCRIPTION_EXPIRY_WARNING_DAY_3',
              details: { daysElapsed: 3 },
            },
          });
        } else if (elapsedDays === 7) {
          // Send Final Warning
          const msg = `Final Warning (Day 7) from SalonFlow: Your subscription for ${sub.salon.name} will be suspended in 3 days. Action required.`;
          await this.whatsappService.sendMessage(ownerPhone, msg);

          await this.prisma.auditLog.create({
            data: {
              salonId: sub.salonId,
              action: 'SUBSCRIPTION_EXPIRY_WARNING_DAY_7',
              details: { daysElapsed: 7 },
            },
          });
        } else if (elapsedDays >= 10) {
          // Update status to SUSPENDED
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'SUSPENDED' },
          });

          // Send Suspension Message
          const msg = `Suspension Notice from SalonFlow: The subscription for ${sub.salon.name} has been suspended due to non-payment. All AI services are disabled.`;
          await this.whatsappService.sendMessage(ownerPhone, msg);

          // Create Audit Log
          await this.prisma.auditLog.create({
            data: {
              salonId: sub.salonId,
              action: 'SUBSCRIPTION_AUTO_SUSPEND',
              details: { daysElapsed: elapsedDays, previousStatus: sub.status },
            },
          });

          this.logger.warn(`Salon ${sub.salon.name} has been suspended due to 10+ days overdue subscription.`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to process expiration checks for salon ${sub.salonId}: ${error.message}`,
        );
      }
    }
  }
}
