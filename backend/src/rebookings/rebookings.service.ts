import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class RebookingsService {
  private readonly logger = new Logger(RebookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Periodically check completed appointments to generate rebooking recommendations
   * Also check recommendations due for sending.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processRebookingEngine() {
    try {
      const now = new Date();

      // 1. Generate Recommendations from completed appointments
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
      const completedAppointments = await this.prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          endTime: { gte: cutoffTime },
        },
        include: {
          service: {
            include: {
              rebookingRule: true,
            },
          },
        },
      });

      for (const appointment of completedAppointments) {
        const rule = appointment.service.rebookingRule;
        if (!rule) continue; // No rebooking interval configured for this service

        // Check if recommendation already exists for this appointment
        // We look for a recommendation for this customer, service, and created around the same time
        const existing = await this.prisma.rebookingRecommendation.findFirst({
          where: {
            salonId: appointment.salonId,
            customerId: appointment.customerId,
            serviceId: appointment.serviceId,
            createdAt: {
              gte: appointment.createdAt,
            },
          },
        });

        if (existing) continue;

        // Calculate due date
        const dueDate = new Date(
          appointment.endTime.getTime() +
            rule.intervalDays * 24 * 60 * 60 * 1000,
        );

        await this.prisma.rebookingRecommendation.create({
          data: {
            salonId: appointment.salonId,
            customerId: appointment.customerId,
            serviceId: appointment.serviceId,
            dueDate,
            status: 'PENDING',
          },
        });

        this.logger.log(
          `Created rebooking recommendation for customer ${appointment.customerId} due on ${dueDate.toISOString()}`,
        );
      }

      // 2. Dispatch recommendations (Auto-send logic)
      const salons = await this.prisma.salon.findMany();
      for (const salon of salons) {
        try {
          // Find recommendations where dueDate <= now
          // If rebookingAutoSend is true, we send PENDING ones. If false, we only send APPROVED ones.
          const allowedStatuses = salon.rebookingAutoSend
            ? ['PENDING', 'APPROVED']
            : ['APPROVED'];

          const dueRecommendations =
            await this.prisma.rebookingRecommendation.findMany({
              where: {
                salonId: salon.id,
                status: { in: allowedStatuses },
                dueDate: {
                  lte: now,
                },
              },
              include: {
                customer: true,
                service: true,
              },
            });

          for (const recommendation of dueRecommendations) {
            await this.sendInvitation(salon.id, recommendation);
          }
        } catch (salonError) {
          this.logger.error(
            `Failed to process rebooking engine for salon ${salon.id}: ${salonError.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing rebooking engine: ${error.message}`);
    }
  }

  /**
   * Helper to generate message and dispatch via WhatsApp
   */
  private async sendInvitation(salonId: string, recommendation: any) {
    if (!recommendation.customer.phone) return;

    try {
      const salon = await this.prisma.salon.findUnique({
        where: { id: salonId },
      });
      if (!salon) return;

      const rule = await this.prisma.rebookingRule.findUnique({
        where: { serviceId: recommendation.serviceId },
      });

      const intervalDays = rule ? rule.intervalDays : 30;

      const messageText = await this.aiService.generateRebookingMessage(
        recommendation.customer.name,
        recommendation.service.name,
        salon.name,
        intervalDays,
      );

      // Get or create conversation for message logs
      let conversation = await this.prisma.conversation.findUnique({
        where: {
          salonId_customerId: {
            salonId,
            customerId: recommendation.customerId,
          },
        },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            salonId,
            customerId: recommendation.customerId,
          },
        });
      }

      // Send the WhatsApp invitation
      await this.whatsappService.sendMessage(
        recommendation.customer.phone,
        messageText,
        conversation.id,
        salonId,
      );

      // Update recommendation status to SENT
      await this.prisma.rebookingRecommendation.update({
        where: { id: recommendation.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          message: messageText,
        },
      });

      // Log audit trail
      await this.prisma.auditLog.create({
        data: {
          salonId,
          action: 'SENT_REBOOKING_INVITATION',
          details: {
            recommendationId: recommendation.id,
            customerId: recommendation.customerId,
            serviceId: recommendation.serviceId,
          },
        },
      });

      this.logger.log(
        `Dispatched rebooking invitation to customer ${recommendation.customerId} for service ${recommendation.serviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send rebooking invitation ${recommendation.id}: ${error.message}`,
      );
    }
  }

  /**
   * Create or update rebooking interval rule for a service
   */
  async upsertRule(salonId: string, serviceId: string, intervalDays: number) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, salonId },
    });
    if (!service) {
      throw new NotFoundException('Service not found for this salon');
    }

    return this.prisma.rebookingRule.upsert({
      where: { serviceId },
      update: { intervalDays },
      create: {
        salonId,
        serviceId,
        intervalDays,
      },
    });
  }

  /**
   * List all rules for a salon
   */
  async getRules(salonId: string) {
    return this.prisma.rebookingRule.findMany({
      where: { salonId },
      include: {
        service: true,
      },
    });
  }

  /**
   * List all recommendations for a salon
   */
  async getRecommendations(salonId: string) {
    return this.prisma.rebookingRecommendation.findMany({
      where: { salonId },
      include: {
        customer: true,
        service: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  /**
   * Manually approve and immediately send a recommendation invitation
   */
  async approveRecommendation(salonId: string, id: string) {
    const recommendation = await this.prisma.rebookingRecommendation.findFirst({
      where: { id, salonId },
      include: {
        customer: true,
        service: true,
      },
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    // Set state to APPROVED and dispatch invitation
    await this.sendInvitation(salonId, recommendation);

    return { success: true };
  }

  /**
   * Calculate Rebooking Dashboard metrics
   */
  async getMetrics(salonId: string) {
    // Rebookings Generated: recommendation status is BOOKED
    const rebookings = await this.prisma.rebookingRecommendation.findMany({
      where: { salonId, status: 'BOOKED' },
      include: { service: true },
    });

    const bookingsCount = rebookings.length;

    // Revenue Recovered: sum of prices of the booked services
    const revenueRecovered = rebookings.reduce(
      (sum, rec) => sum + (rec.service?.price || 0),
      0,
    );

    // Customers Due for Rebooking: dueDate <= now and status is SENT or PENDING/APPROVED
    const now = new Date();
    const dueCount = await this.prisma.rebookingRecommendation.count({
      where: {
        salonId,
        dueDate: { lte: now },
        status: { in: ['PENDING', 'APPROVED', 'SENT'] },
      },
    });

    return {
      rebookingsGenerated: bookingsCount,
      rebookingRevenueRecovered: revenueRecovered,
      customersDueForRebooking: dueCount,
    };
  }
}
