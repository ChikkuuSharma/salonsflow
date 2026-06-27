import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly baseUrl =
    process.env.API_BASE_URL || 'http://localhost:3001';

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Scan completed appointments, generate and dispatch review requests
   * Runs every minute to quickly pick up completed bookings.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanAndSendReviewRequests() {
    try {
      const now = new Date();

      // Find all salons
      const salons = await this.prisma.salon.findMany();

      for (const salon of salons) {
        if (!salon.googleReviewLink) {
          continue; // Skip if no review link configured
        }

        const delayMs = (salon.reviewDelayMins || 60) * 60 * 1000;
        const cutoffTime = new Date(now.getTime() - delayMs);
        const lowerBoundTime = new Date(
          now.getTime() - delayMs - 24 * 60 * 60 * 1000,
        );

        // Find COMPLETED appointments for this salon that have passed the delay
        // and do not have an active ReviewCampaign yet.
        const completedAppointments = await this.prisma.appointment.findMany({
          where: {
            salonId: salon.id,
            status: 'COMPLETED',
            endTime: {
              lte: cutoffTime,
              gte: lowerBoundTime,
            },
            reviewCampaign: {
              is: null,
            },
          },
          include: {
            customer: true,
            service: true,
          },
        });

        for (const appointment of completedAppointments) {
          try {
            if (!appointment.customer.phone) continue;

            // Create temporary campaign record to obtain an ID for link redirect tracking
            const reviewCampaign = await this.prisma.reviewCampaign.create({
              data: {
                salonId: salon.id,
                customerId: appointment.customerId,
                appointmentId: appointment.id,
                completed: false,
              },
            });

            // Get or create conversation for outbound tracking
            let conversation = await this.prisma.conversation.findUnique({
              where: {
                salonId_customerId: {
                  salonId: salon.id,
                  customerId: appointment.customerId,
                },
              },
            });

            if (!conversation) {
              conversation = await this.prisma.conversation.create({
                data: {
                  salonId: salon.id,
                  customerId: appointment.customerId,
                },
              });
            }

            const lang = conversation.language || 'ENGLISH';
            let personalizedMessage = '';
            if (lang === 'HINDI') {
              personalizedMessage = `नमस्ते ${appointment.customer.name} 👋\n\n${salon.name} में आने के लिए धन्यवाद।\nआज आपकी "${appointment.service.name}" सेवा का अनुभव कैसा रहा?\n\nकृपया हमें रेटिंग देने के लिए रिप्लाई करें:\n⭐ 1 (खराब)\n⭐ 2 (ठीक)\n⭐ 3 (अच्छा)\n⭐ 4 (बहुत अच्छा)\n⭐ 5 (उत्कृष्ट)`;
            } else if (lang === 'HINGLISH') {
              personalizedMessage = `Hi ${appointment.customer.name} 👋\n\n${salon.name} visit karne ke liye thank you!\nToday aapka "${appointment.service.name}" experience kaisa raha?\n\nPlease rate karne ke liye reply karein:\n⭐ 1 (Poor)\n⭐ 2 (Average)\n⭐ 3 (Good)\n⭐ 4 (Very Good)\n⭐ 5 (Excellent)`;
            } else {
              personalizedMessage = `Hi ${appointment.customer.name} 👋\n\nThank you for visiting ${salon.name}.\nHow was your experience with your "${appointment.service.name}" today?\n\nPlease rate us by replying with:\n⭐ 1 (Poor)\n⭐ 2 (Fair)\n⭐ 3 (Good)\n⭐ 4 (Very Good)\n⭐ 5 (Excellent)`;
            }

            // Send message
            await this.whatsappService.sendMessage(
              appointment.customer.phone,
              personalizedMessage,
              conversation.id,
              salon.id,
            );

            // Update campaign record with the sent details
            await this.prisma.reviewCampaign.update({
              where: { id: reviewCampaign.id },
              data: {
                sentAt: new Date(),
                message: personalizedMessage,
              },
            });

            // Create audit log
            await this.prisma.auditLog.create({
              data: {
                salonId: salon.id,
                action: 'SENT_REVIEW_REQUEST',
                details: {
                  campaignId: reviewCampaign.id,
                  customerId: appointment.customerId,
                  appointmentId: appointment.id,
                },
              },
            });

            this.logger.log(
              `Successfully sent review request to customer ${appointment.customerId} for appointment ${appointment.id}`,
            );
          } catch (appointmentError) {
            this.logger.error(
              `Failed to process review campaign for appointment ${appointment.id}: ${appointmentError.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error scanning completed review campaigns: ${error.message}`,
      );
    }
  }

  /**
   * Get review campaign analytics metrics
   */
  async getMetrics(salonId: string) {
    const sentCount = await this.prisma.reviewCampaign.count({
      where: { salonId, sentAt: { not: null } },
    });

    const clickCount = await this.prisma.reviewCampaign.count({
      where: { salonId, clickedAt: { not: null } },
    });

    // Estimate: 40% of clicks lead to a Google Review
    const estimatedReviews = Math.round(clickCount * 0.4);

    return {
      reviewRequestsSent: sentCount,
      reviewLinkClicks: clickCount,
      estimatedReviewsGenerated: estimatedReviews,
    };
  }

  /**
   * Resolve a customer review dispute
   */
  async resolveCampaign(campaignId: string, salonId: string, notes?: string) {
    const campaign = await this.prisma.reviewCampaign.findFirst({
      where: { id: campaignId, salonId },
    });
    if (!campaign) {
      throw new NotFoundException('Review campaign not found.');
    }

    return this.prisma.reviewCampaign.update({
      where: { id: campaignId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolverNotes: notes,
      },
    });
  }
}
