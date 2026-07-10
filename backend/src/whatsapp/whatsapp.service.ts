import { Inject, Injectable, Logger, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappGatewayService } from './whatsapp-gateway.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { RecoveryService } from '../appointments/recovery.service';
import { WaitingListService } from '../appointments/waiting-list.service';
import { AiService } from '../ai/ai.service';
import Stripe from 'stripe';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v17.0';
  private readonly token = process.env.WHATSAPP_TOKEN;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappGatewayService))
    private readonly gatewayService: WhatsappGatewayService,
    private readonly aiService: AiService,
    private readonly appointmentsService: AppointmentsService,
    private readonly recoveryService: RecoveryService,
    private readonly waitingListService: WaitingListService,
  ) {}

  /**
   * Parse incoming webhook payload to extract relevant message data
   */
  parseMessage(body: any) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      const contact = value?.contacts?.[0];
      const metadata = value?.metadata;
      const recipientPhoneNumberId = metadata?.phone_number_id || null;

      if (!message || !contact) return null;

      return {
        fromPhone: message.from,
        customerName: contact.profile?.name || 'Unknown',
        text: message.text?.body || '',
        messageId: message.id,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        recipientPhoneNumberId,
        audio: message.audio
          ? {
              id: message.audio.id,
              mimeType: message.audio.mime_type,
            }
          : null,
      };
    } catch (error) {
      this.logger.error(`Error parsing message: ${error.message}`);
      return null;
    }
  }

  /**
   * Persist the incoming message to the database
   */
  async saveIncomingMessage(
    salonId: string,
    phone: string,
    name: string,
    content: string,
    language: string = 'ENGLISH',
  ) {
    const isWalkIn = content.toLowerCase().includes('walk-in booking') || content.toLowerCase().includes('walk-in');

    // Upsert Customer
    const customer = await this.prisma.customer.upsert({
      where: {
        salonId_phone: {
          salonId,
          phone,
        },
      },
      update: {
        name,
        lastVisit: new Date(),
        ...(isWalkIn ? { source: 'WALK_IN' } : {}),
      },
      create: {
        salonId,
        phone,
        name,
        source: isWalkIn ? 'WALK_IN' : 'WHATSAPP',
      },
    });

    // Upsert Conversation
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        salonId_customerId: { salonId, customerId: customer.id },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          salonId,
          customerId: customer.id,
          language,
        },
      });
    } else if (conversation.language !== language) {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { language },
      });
    }

    // Save Message
    const savedMsg = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        content,
        direction: 'INBOUND',
        language,
      },
    });

    // Update missed call status to CONVERSATION_STARTED if it was PENDING
    await this.prisma.missedCall.updateMany({
      where: {
        salonId,
        phone,
        status: 'PENDING',
      },
      data: {
        status: 'CONVERSATION_STARTED',
      },
    });

    return { customer, conversation, message: savedMsg };
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendMessage(
    toPhone: string,
    text: string,
    conversationId?: string,
    salonId?: string,
  ) {
    let targetSalonId = salonId;

    if (conversationId) {
      const conv = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (conv) {
        targetSalonId = conv.salonId;
        if (salonId && conv.salonId !== salonId) {
          await this.prisma.logSecurityEvent(
            salonId,
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            {
              entity: 'Conversation',
              targetId: conversationId,
              action: 'sendMessage',
            },
          );
          throw new NotFoundException('Conversation not found');
        }
      }
    }

    let activeToken = this.token;
    let activePhoneNumberId = this.phoneNumberId;

    if (targetSalonId) {
      const session = await this.gatewayService.getSessionStatus(targetSalonId);
      if (session.status === 'CONNECTED') {
        let cleanPhone = toPhone.replace('+', '');
        if (!cleanPhone.includes('@')) {
          cleanPhone = cleanPhone + '@s.whatsapp.net';
        }
        const sent = await this.gatewayService.sendDirectMessage(targetSalonId, cleanPhone, text);
        if (sent) {
          if (conversationId) {
            await this.prisma.message.create({
              data: {
                conversationId,
                content: text,
                direction: 'OUTBOUND',
              },
            });
          }
          return;
        }
      }

      const salon = await this.prisma.salon.findUnique({
        where: { id: targetSalonId },
        select: { whatsappAccessToken: true, whatsappPhoneNumberId: true },
      });
      if (salon?.whatsappAccessToken && salon?.whatsappPhoneNumberId) {
        activeToken = salon.whatsappAccessToken;
        activePhoneNumberId = salon.whatsappPhoneNumberId;
      }
    }

    if (!activeToken || !activePhoneNumberId) {
      this.logger.warn(
        'WhatsApp API credentials missing. Mocking message send.',
      );
      this.logger.log(`[MOCK WA] To: ${toPhone} | Msg: ${text}`);
    } else {
      try {
        const response = await fetch(
          `${this.apiUrl}/${activePhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: toPhone,
              type: 'text',
              text: { preview_url: false, body: text },
            }),
          },
        );

        if (!response.ok) {
          const err = await response.json();
          this.logger.error(
            `Failed to send WA message: ${JSON.stringify(err)}`,
          );
        }
      } catch (error) {
        this.logger.error(`Error sending WA message: ${error.message}`);
      }
    }

    // Persist outbound message if conversationId is provided
    if (conversationId) {
      const conv = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { language: true },
      });
      await this.prisma.message.create({
        data: {
          conversationId,
          content: text,
          direction: 'OUTBOUND',
          language: conv?.language || 'ENGLISH',
        },
      });
    }
  }


async processParsedMessage(parsed: any, salon: any): Promise<void> {
    let transcript = '';
    const isVoiceNote = !!parsed.audio;

    // Resolve current language context for potential errors
    let currentLanguage = 'ENGLISH';
    if (salon) {
      const existingConv = await this.prisma.conversation.findFirst({
        where: { salonId: salon.id, customer: { phone: parsed.fromPhone } },
      });
      if (existingConv) {
        currentLanguage = existingConv.language;
      }
    }

    if (isVoiceNote && parsed.audio) {
      this.logger.log(
        `Received voice note from ${parsed.fromPhone}, transcribing...`,
      );
      try {
        transcript = await this.aiService.transcribeAudio(
          parsed.audio.id,
          parsed.audio.mimeType,
        );
        parsed.text = transcript;
      } catch (audioError) {
        const errMessage = audioError.message || (audioError.response && audioError.response.message) || '';
        if (errMessage === 'AUDIO_TOO_LONG') {
          const limitMsg =
            currentLanguage === 'HINDI'
              ? 'हम आपका वॉयस संदेश प्रोसेस नहीं कर सके क्योंकि यह बहुत लंबा है। कृपया अपना अनुरोध टाइप करें या छोटा वॉयस नोट (45 सेकंड से कम) भेजें।'
              : currentLanguage === 'HINGLISH'
              ? "We couldn't process your voice message kyunki ye bohot lamba hai. Please type karke request send karein ya chota voice note (under 45 seconds) bhejein."
              : "We couldn't process your voice message because it is too long. Please type your request or send a shorter voice note (under 45 seconds).";

          const { conversation } = await this.saveIncomingMessage(
            salon.id,
            parsed.fromPhone,
            parsed.customerName,
            '[Audio message too long]',
            currentLanguage,
          );

          await this.sendMessage(
            parsed.fromPhone,
            limitMsg,
            conversation.id,
          );
          return;
        }
        throw audioError;
      }
    }

    this.logger.log(
      `Received message from ${parsed.fromPhone}: ${parsed.text}`,
    );

    const language = await this.aiService.detectLanguage(parsed.text);
    this.logger.log(`Detected language: ${language}`);

    const { customer, conversation, message } =
      await this.saveIncomingMessage(
        salon.id,
        parsed.fromPhone,
        parsed.customerName,
        parsed.text,
        language,
      );

    // Save VoiceNote mapping if it was transcribed
    if (isVoiceNote && parsed.audio && message) {
      await this.prisma.voiceNote.create({
        data: {
          messageId: message.id,
          transcript,
          mimeType: parsed.audio.mimeType,
        },
      });
    }

    // --- Review Flow Interception ---
    const pendingReviewCampaign = await this.prisma.reviewCampaign.findFirst({
      where: {
        customerId: customer.id,
        completed: false,
        sentAt: { not: null },
      },
    });

    let isReviewFlowInterception = false;

    if (pendingReviewCampaign) {
      const intent = await this.aiService.determineIntent(parsed.text);
      if (intent === 'BOOKING' || intent === 'RESCHEDULE' || intent === 'CANCELLATION' || intent === 'WAITLIST') {
        // Auto-expire review campaign if customer tries to book/reschedule to avoid locking them out
        await this.prisma.reviewCampaign.update({
          where: { id: pendingReviewCampaign.id },
          data: { completed: true },
        });
      } else {
        isReviewFlowInterception = true;

        if (pendingReviewCampaign.rating === null) {
          const clean = parsed.text.trim();
          const match = clean.match(/\b([1-5])\b/);
          let parsedRating: number | null = null;
          if (match) {
            parsedRating = parseInt(match[1]);
          } else {
            const starCount = (clean.match(/⭐/g) || []).length;
            if (starCount >= 1 && starCount <= 5) {
              parsedRating = starCount;
            }
          }

          if (parsedRating !== null) {
            await this.prisma.reviewCampaign.update({
              where: { id: pendingReviewCampaign.id },
              data: { rating: parsedRating },
            });

            if (parsedRating >= 4) {
              await this.prisma.reviewCampaign.update({
                where: { id: pendingReviewCampaign.id },
                data: { completed: true },
              });

              const googleLink = salon.googleReviewLink || 'https://google.com';
              const thankYouMessage = language === 'HINDI'
                ? `आपका बहुत-बहुत धन्यवाद! क्या आप हमें गूगल पर भी अपनी रेटिंग देना चाहेंगे? कृपया इस लिंक पर क्लिक करें: ${googleLink}`
                : language === 'HINGLISH'
                ? `Thank you so much! Kya aap hume Google par bhi rating dena chahenge? Please is link par click karein: ${googleLink}`
                : `Thank you so much for your feedback! Would you mind sharing your experience on Google as well? Please click here: ${googleLink}`;

              await this.sendMessage(parsed.fromPhone, thankYouMessage, conversation.id);
            } else {
              const promptFeedbackMessage = language === 'HINDI'
                ? `हमें खेद है कि आपका अनुभव अच्छा नहीं रहा। कृपया हमें बताएं कि हम अपनी सेवाओं में क्या सुधार कर सकते हैं?`
                : language === 'HINGLISH'
                ? `We are sorry to hear that. Please hume batayein ki hum humari services ko kaise improve kar sakte hain?`
                : `We are sorry to hear that your experience wasn't perfect. Please reply with what we can do to improve our services.`;

              await this.sendMessage(parsed.fromPhone, promptFeedbackMessage, conversation.id);
            }
          } else {
            const promptRatingMessage = language === 'HINDI'
              ? `कृपया अपनी विजिट को 1 से 5 स्टार्स (⭐) में रेटिंग दें।`
              : language === 'HINGLISH'
              ? `Please aapki visit ko 1 se 5 stars (⭐) me rate karein.`
              : `Please rate your experience by replying with a number from 1 to 5 stars (⭐).`;
            await this.sendMessage(parsed.fromPhone, promptRatingMessage, conversation.id);
          }
        } else {
          // rating is already set (rating <= 3), and they are sending feedback comments now
          await this.prisma.reviewCampaign.update({
            where: { id: pendingReviewCampaign.id },
            data: {
              feedback: parsed.text,
              completed: true,
            },
          });

          await this.prisma.auditLog.create({
            data: {
              salonId: salon.id,
              action: 'NEGATIVE_REVIEW_RECEIVED',
              details: {
                campaignId: pendingReviewCampaign.id,
                customerId: customer.id,
                rating: pendingReviewCampaign.rating,
                feedback: parsed.text,
              },
            },
          });

          const thankYouFeedback = language === 'HINDI'
            ? `आपकी प्रतिक्रिया के लिए धन्यवाद। हमने इसे अपने सैलून मैनेजर के साथ साझा किया है।`
            : language === 'HINGLISH'
            ? `Thank you feedback dene ke liye. Humne ise salon manager ke saath share kar diya hai improve karne ke liye.`
            : `Thank you for your feedback. We have shared this with our salon manager to help improve our service.`;
          await this.sendMessage(parsed.fromPhone, thankYouFeedback, conversation.id);
        }
      }
    }

    if (isReviewFlowInterception) {
      return;
    }

    // Check if subscription is suspended
    const subscription = await this.prisma.subscription.findUnique({
      where: { salonId: salon.id },
    });
    if (subscription && subscription.status === 'SUSPENDED') {
      this.logger.warn(`Salon ${salon.id} is suspended. Bypassing AI receptionist response.`);
      return;
    }

    // 4. Intent Recognition & Waiting List Hold Check
    const isYes = ['yes', 'yeah', 'y', 'ok', 'okay', 'haan', 'han', 'yes please', 'confirm'].includes(parsed.text.trim().toLowerCase());
    let confirmedHold = null;
    
    if (isYes) {
      try {
        confirmedHold = await this.waitingListService.confirmWaitlistHold(salon.id, customer.id);
      } catch (err) {
        this.logger.debug(`No active hold found for customer: ${err.message}`);
      }
    }

    let finalResponseText = '';
    const activeServicesList = await this.prisma.service.findMany({
      where: { salonId: salon.id, isActive: true },
    });

    if (confirmedHold) {
      finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
        intent: 'WAITLIST_CONFIRM',
        status: 'SUCCESS',
        details: {
          serviceName: confirmedHold.service.name,
          startTime: confirmedHold.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      });
    } else {
      // 1. Walk-In Queue Booking check (runs before intent classification to capture single service words)
      let isWalkInCustomer = false;
      const walkInInbound = await this.prisma.message.findMany({
        where: { conversationId: conversation.id, direction: 'INBOUND' },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });
      const combinedWalkInText = (parsed.text + ' ' + walkInInbound.map(m => m.content).join(' ')).toLowerCase();
      if (
        combinedWalkInText.includes('walk-in') ||
        combinedWalkInText.includes('walkin') ||
        combinedWalkInText.includes('at the salon') ||
        combinedWalkInText.includes('queue')
      ) {
        isWalkInCustomer = true;
      }

      if (isWalkInCustomer) {
        let matchedService = null;
        const incomingText = parsed.text.toLowerCase().trim();
        for (const s of activeServicesList) {
          const sName = s.name.toLowerCase();
          const userWords = incomingText.split(/\s+/).filter((w: string) => w.length > 2);
          const serviceWords = sName.split(/\s+/).filter((w: string) => w.length > 2);
          const hasOverlap = userWords.some((uw: string) => serviceWords.some((sw: string) => sw.includes(uw) || uw.includes(sw)));

          if (
            incomingText === sName ||
            incomingText.includes(sName) ||
            sName.includes(incomingText) ||
            hasOverlap
          ) {
            matchedService = s;
            break;
          }
        }

        if (matchedService) {
          try {
            const waitlistEntry = await this.waitingListService.addToWaitingList({
              salonId: salon.id,
              customerId: customer.id,
              serviceId: matchedService.id,
              requestedStartTime: new Date(),
            });

            const queueCount = await this.prisma.waitingList.count({
              where: {
                salonId: salon.id,
                status: 'WAITING',
              },
            });
            const queueNumber = queueCount;
            const waitPeriod = (queueCount - 1) * 15;

            finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
              intent: 'WAITLIST_ADD',
              status: 'SUCCESS',
              details: {
                serviceName: matchedService.name,
                queueNumber,
                expectedWaitMinutes: waitPeriod <= 0 ? 0 : waitPeriod,
              }
            });

            await this.sendMessage(parsed.fromPhone, finalResponseText, conversation.id);
            return;
          } catch (err) {
            this.logger.error(`Failed to add walk-in to waiting list in pre-intent handler: ${err.message}`);
          }
        }
      }

      const intent = await this.aiService.determineIntent(parsed.text);
      this.logger.log(`Determined intent: ${intent}`);

      if (intent === 'BOOKING') {
        // Check if they are a walk-in customer from history or current message
        let isWalkIn = false;
        const recentInbound = await this.prisma.message.findMany({
          where: { conversationId: conversation.id, direction: 'INBOUND' },
          orderBy: { timestamp: 'desc' },
          take: 5,
        });
        const combinedTextForWalkin = (parsed.text + ' ' + recentInbound.map(m => m.content).join(' ')).toLowerCase();
        if (combinedTextForWalkin.includes('walk-in') || combinedTextForWalkin.includes('walkin') || combinedTextForWalkin.includes('at the salon') || combinedTextForWalkin.includes('queue')) {
          isWalkIn = true;
        }

        if (isWalkIn) {
          let serviceToBook = null;
          const msgText = parsed.text.toLowerCase();
          for (const s of activeServicesList) {
            if (msgText.includes(s.name.toLowerCase())) {
              serviceToBook = s;
              break;
            }
          }

          if (serviceToBook) {
            try {
              const waitlistEntry = await this.waitingListService.addToWaitingList({
                salonId: salon.id,
                customerId: customer.id,
                serviceId: serviceToBook.id,
                requestedStartTime: new Date(),
              });

              const queueCount = await this.prisma.waitingList.count({
                where: {
                  salonId: salon.id,
                  status: 'WAITING',
                },
              });
              const queueNumber = queueCount;
              const waitPeriod = (queueCount - 1) * 15;

              finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                intent: 'WAITLIST_ADD',
                status: 'SUCCESS',
                details: {
                  serviceName: serviceToBook.name,
                  queueNumber,
                  expectedWaitMinutes: waitPeriod <= 0 ? 0 : waitPeriod,
                }
              });

              await this.sendMessage(parsed.fromPhone, finalResponseText, conversation.id);
              return;
            } catch (err) {
              this.logger.error(`Failed to add walk-in to waiting list: ${err.message}`);
            }
          }
        }

        let details = await this.aiService.extractBookingDetails(parsed.text, salon.id);
        if (!details || !details.date || !details.time || !details.serviceName || details.time === 'AVAILABILITY') {
          const recentMessages = await this.prisma.message.findMany({
            where: { conversationId: conversation.id, direction: 'INBOUND' },
            orderBy: { timestamp: 'desc' },
            take: 4,
          });
          const combinedText = recentMessages.map((m) => m.content).reverse().join(' | ');
          const combinedDetails = await this.aiService.extractBookingDetails(combinedText, salon.id);
          if (combinedDetails && combinedDetails.date && combinedDetails.time && combinedDetails.serviceName && combinedDetails.time !== 'AVAILABILITY') {
            details = combinedDetails;
          }
        }

        if (details) {
          if (details.time === 'AVAILABILITY') {
            const service = await this.prisma.service.findFirst({
              where: {
                salonId: salon.id,
                name: { contains: details.serviceName, mode: 'insensitive' },
              },
            });

            if (service) {
              const requestedTime = new Date(`${details.date}T12:00:00Z`);
              let staffId: string | undefined = undefined;
              if (details.staffName) {
                const staff = await this.prisma.staff.findFirst({
                  where: { salonId: salon.id, name: { contains: details.staffName, mode: 'insensitive' } }
                });
                if (staff) staffId = staff.id;
              }

              const alternatives = await this.recoveryService.getAlternativeSlots(
                salon.id,
                service.id,
                requestedTime,
                staffId,
              );

              const partners = await this.recoveryService.getPartnerSalons(salon.id);

              finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                intent: 'BOOKING_AVAILABILITY',
                status: alternatives.length > 0 ? 'INFO' : 'ERROR',
                details: {
                  serviceName: service.name,
                  requestedDate: details.date,
                  requestedTime: details.time,
                  partnerSalons: partners.map(p => p.name)
                },
                alternativeSlots: alternatives.map(alt => ({
                  time: alt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  date: alt.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                  staffName: alt.staffName
                }))
              });
            } else {
              finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                intent: 'BOOKING_SERVICE_NOT_FOUND',
                status: 'ERROR',
                errorMsg: `Service not found matching "${details.serviceName}"`,
                details: { serviceName: details.serviceName }
              });
            }
          } else {
            try {
              const startTime = new Date(`${details.date}T${details.time}:00Z`);

              let staffId: string | undefined = undefined;
              if (details.staffName) {
                const staff = await this.prisma.staff.findFirst({
                  where: {
                    salonId: salon.id,
                    name: {
                      contains: details.staffName,
                      mode: 'insensitive',
                    },
                  },
                });
                if (staff) {
                  staffId = staff.id;
                }
              }

              const bookingSource = customer.source === 'WALK_IN' ? 'OFFLINE_WALKIN' : 'ONLINE_WHATSAPP';
              const appointment =
                await this.appointmentsService.createBookingTransaction({
                  salonId: salon.id,
                  customerId: customer.id,
                  serviceName: details.serviceName,
                  startTime,
                  staffId,
                  bookingSource,
                });

              const timeString = appointment.startTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const bookedStaffName = appointment.staff?.name;

              let checkoutLink: string | null = null;
              // Stripe online payments disabled. Payment is collected directly at the salon by the owner.
              await this.prisma.appointment.update({
                where: { id: appointment.id },
                data: { notes: (appointment.notes ? appointment.notes + ' | ' : '') + 'Direct checkout: payment collected at salon by owner.' },
              });

              // Check if they are a walk-in customer from history
              let isWalkIn = false;
              const recentInbound = await this.prisma.message.findMany({
                where: { conversationId: conversation.id, direction: 'INBOUND' },
                orderBy: { timestamp: 'desc' },
                take: 5,
              });
              for (const m of recentInbound) {
                const textLower = m.content.toLowerCase();
                if (textLower.includes('walk-in') || textLower.includes('walkin') || textLower.includes('at the salon')) {
                  isWalkIn = true;
                  break;
                }
              }

              let queueNumber = 0;
              let waitPeriod = 0;
              if (isWalkIn) {
                // Get active count for today
                const queueCount = await this.prisma.appointment.count({
                  where: {
                    salonId: salon.id,
                    status: 'CONFIRMED',
                    startTime: {
                      gte: new Date(new Date().setHours(0, 0, 0, 0)),
                      lte: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                  },
                });
                queueNumber = queueCount + 1;
                waitPeriod = queueCount * 15; // 15 mins per person
              }

              finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                intent: 'BOOKING_CONFIRM',
                status: 'SUCCESS',
                details: {
                  serviceName: appointment.service.name,
                  date: details.date,
                  time: timeString,
                  staffName: bookedStaffName,
                  checkoutLink,
                  queueNumber: isWalkIn ? queueNumber : null,
                  expectedWaitMinutes: isWalkIn ? waitPeriod : null
                }
              });
            } catch (err) {
              this.logger.warn(`Booking conflict for ${details.serviceName}. Fetching alternative slots: ${err.message}`);
              const service = await this.prisma.service.findFirst({
                where: {
                  salonId: salon.id,
                  name: {
                    contains: details.serviceName,
                    mode: 'insensitive',
                  },
                },
              });

              if (service) {
                const requestedTime = new Date(`${details.date}T${details.time}:00Z`);
                let staffId: string | undefined = undefined;
                if (details.staffName) {
                  const staff = await this.prisma.staff.findFirst({
                    where: { salonId: salon.id, name: { contains: details.staffName, mode: 'insensitive' } }
                  });
                  if (staff) staffId = staff.id;
                }

                const alternatives = await this.recoveryService.getAlternativeSlots(
                  salon.id,
                  service.id,
                  requestedTime,
                  staffId,
                );

                const partners = await this.recoveryService.getPartnerSalons(salon.id);

                finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                  intent: 'BOOKING_CONFLICT',
                  status: 'ERROR',
                  errorMsg: err.message,
                  details: {
                    serviceName: service.name,
                    requestedDate: details.date,
                    requestedTime: details.time,
                    partnerSalons: partners.map(p => p.name)
                  },
                  alternativeSlots: alternatives.map(alt => ({
                    time: alt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: alt.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                    staffName: alt.staffName
                  }))
                });
              } else {
                finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                  intent: 'BOOKING_SERVICE_NOT_FOUND',
                  status: 'ERROR',
                  errorMsg: `Service not found matching "${details.serviceName}"`,
                  details: { serviceName: details.serviceName }
                });
              }
            }
          }
        } else {
          finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
            intent: 'BOOKING_MISSING_DETAILS',
            status: 'ERROR',
            errorMsg: 'Missing booking details date, time, or serviceName'
          });
        }
      } else if (intent === 'RESCHEDULE') {
        const upcoming = await this.prisma.appointment.findFirst({
          where: {
            salonId: salon.id,
            customerId: customer.id,
            status: 'CONFIRMED',
            startTime: { gte: new Date() },
          },
          include: { service: true, staff: true },
          orderBy: { startTime: 'asc' },
        });

        if (!upcoming) {
          finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
            intent: 'RESCHEDULE_NOT_FOUND',
            status: 'ERROR',
            errorMsg: 'No upcoming appointment found to reschedule.'
          });
        } else {
          const details = await this.aiService.extractBookingDetails(parsed.text, salon.id);
          if (details && details.date && details.time) {
            try {
              const newStartTime = new Date(`${details.date}T${details.time}:00Z`);
              let newStaffId: string | undefined = undefined;
              if (details.staffName) {
                const staff = await this.prisma.staff.findFirst({
                  where: { salonId: salon.id, name: { contains: details.staffName, mode: 'insensitive' } }
                });
                if (staff) newStaffId = staff.id;
              }

              const updated = await this.recoveryService.rescheduleAppointment(
                upcoming.id,
                salon.id,
                newStartTime,
                newStaffId,
              );

              const timeString = updated.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                intent: 'RESCHEDULE_CONFIRM',
                status: 'SUCCESS',
                details: {
                  serviceName: updated.service.name,
                  date: details.date,
                  time: timeString,
                  staffName: updated.staff?.name
                }
              });
            } catch (err) {
              this.logger.warn(`Reschedule failed for appointment ${upcoming.id}: ${err.message}. Fetching alternatives.`);
              const newStartTime = new Date(`${details.date}T${details.time}:00Z`);
              const alternatives = await this.recoveryService.getAlternativeSlots(
                salon.id,
                upcoming.serviceId,
                newStartTime,
                upcoming.staffId || undefined,
              );

              const partners = await this.recoveryService.getPartnerSalons(salon.id);

              finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
                intent: 'RESCHEDULE_CONFLICT',
                status: 'ERROR',
                errorMsg: err.message,
                details: {
                  serviceName: upcoming.service.name,
                  requestedDate: details.date,
                  requestedTime: details.time,
                  partnerSalons: partners.map(p => p.name)
                },
                alternativeSlots: alternatives.map(alt => ({
                  time: alt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  date: alt.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                  staffName: alt.staffName
                }))
              });
            }
          } else {
            finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
              intent: 'RESCHEDULE_MISSING_DETAILS',
              status: 'ERROR',
              errorMsg: 'Missing reschedule target date or time details.',
              details: { serviceName: upcoming.service.name }
            });
          }
        }
      } else if (intent === 'WAITLIST') {
        let details = await this.aiService.extractBookingDetails(parsed.text, salon.id);

        if (!details || !details.date || !details.time || !details.serviceName) {
          const recentMessages = await this.prisma.message.findMany({
            where: { conversationId: conversation.id, direction: 'INBOUND' },
            orderBy: { timestamp: 'desc' },
            take: 5,
          });

          for (const msg of recentMessages) {
            const extracted = await this.aiService.extractBookingDetails(msg.content, salon.id);
            if (extracted && extracted.date && extracted.time && extracted.serviceName) {
              details = extracted;
              break;
            }
          }
        }

        if (details && details.date && details.time && details.serviceName) {
          const requestedStartTime = new Date(`${details.date}T${details.time}:00Z`);

          const service = await this.prisma.service.findFirst({
            where: { salonId: salon.id, name: { contains: details.serviceName, mode: 'insensitive' } }
          });

          if (!service) {
            finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
              intent: 'WAITLIST_SERVICE_NOT_FOUND',
              status: 'ERROR',
              errorMsg: `Service not found matching "${details.serviceName}"`,
              details: { serviceName: details.serviceName }
            });
          } else {
            let staffId: string | null = null;
            if (details.staffName) {
              const staff = await this.prisma.staff.findFirst({
                where: { salonId: salon.id, name: { contains: details.staffName, mode: 'insensitive' } }
              });
              if (staff) staffId = staff.id;
            }

            await this.waitingListService.addToWaitingList({
              salonId: salon.id,
              customerId: customer.id,
              serviceId: service.id,
              staffId,
              requestedStartTime,
              priority: 1,
            });

            const timeString = requestedStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
              intent: 'WAITLIST_ADD',
              status: 'SUCCESS',
              details: {
                serviceName: service.name,
                date: details.date,
                time: timeString
              }
            });
          }
        } else {
          finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
            intent: 'WAITLIST_MISSING_DETAILS',
            status: 'ERROR',
            errorMsg: 'Missing waitlist details date, time, or serviceName.'
          });
        }
      } else {
        if (intent === 'OTHER') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const inboundToday = await this.prisma.message.findMany({
            where: {
              conversationId: conversation.id,
              direction: 'INBOUND',
              timestamp: { gte: startOfToday },
            },
          });

          const nonBookingCount = inboundToday.filter(
            (m) => this.aiService.localDetermineIntent(m.content) === 'OTHER',
          ).length;

          const isDev = process.env.NODE_ENV !== 'production';
          if (!isDev && nonBookingCount > 5) {
            this.logger.log(`Conversation cap reached (> 5 non-booking messages today) for customer ${customer.id}. Silencing bot.`);
            return;
          } else if (!isDev && nonBookingCount === 5) {
            finalResponseText = await this.aiService.generateResponse(conversation.id, salon.id, {
              intent: 'HUMAN_TAKEOVER_LIMIT',
              status: 'ERROR',
              errorMsg: 'Daily message cap reached.'
            });

            await this.sendMessage(
              parsed.fromPhone,
              finalResponseText,
              conversation.id,
            );

            await this.prisma.auditLog.create({
              data: {
                salonId: salon.id,
                action: 'HUMAN_TAKEOVER_REQUESTED',
                details: {
                  customerId: customer.id,
                  reason: 'Daily non-booking conversation cap reached (5 messages)',
                },
              },
            });
            return;
          }
        }

        finalResponseText = await this.aiService.generateResponse(
          conversation.id,
          salon.id,
          {
            intent,
            status: 'INFO',
            details: {
              services: activeServicesList,
              location: salon.address
            }
          }
        );
      }
    }

    // 6. Send Response back via WhatsApp
    await this.sendMessage(
      parsed.fromPhone,
      finalResponseText,
      conversation.id,
    );
  }
}
