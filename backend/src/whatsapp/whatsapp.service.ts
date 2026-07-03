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
        const cleanPhone = toPhone.replace('+', '') + '@s.whatsapp.net';
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

    if (confirmedHold) {
      const timeString = confirmedHold.startTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (language === 'HINDI') {
        finalResponseText = `धन्यवाद! आपका अपॉइंटमेंट "${confirmedHold.service.name}" के लिए ${timeString} बजे कन्फर्म हो गया है।`;
      } else if (language === 'HINGLISH') {
        finalResponseText = `Thank you! Aapka appointment "${confirmedHold.service.name}" ke liye ${timeString} baje confirm ho gaya hai.`;
      } else {
        finalResponseText = `Thank you! Your appointment for "${confirmedHold.service.name}" at ${timeString} is now confirmed.`;
      }
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
        const activeServices = await this.prisma.service.findMany({
          where: { salonId: salon.id, isActive: true },
        });
        let matchedService = null;
        const incomingText = parsed.text.toLowerCase().trim();
        for (const s of activeServices) {
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

            if (language === 'HINDI') {
              finalResponseText = `सफलता! आपकी "${matchedService.name}" के लिए वॉक-इन बुकिंग पक्की हो गई है।\n\nआपका बुकिंग नंबर: #${queueNumber} है।\nअनुमानित प्रतीक्षा समय: ${waitPeriod <= 0 ? 'अभी तुरंत' : `${waitPeriod} मिनट`} है। कृपया प्रतीक्षा क्षेत्र में बैठें।`;
            } else if (language === 'HINGLISH') {
              finalResponseText = `Success! Aapki walk-in booking confirm ho gayi hai for ${matchedService.name}.\n\nAapka Booking Queue Number: #${queueNumber} hai.\nExpected wait time: ${waitPeriod <= 0 ? 'Abhi turant (0 mins)' : `${waitPeriod} minutes`} hai. Please reception area me wait karein.`;
            } else {
              finalResponseText = `Success! Your walk-in booking for "${matchedService.name}" has been confirmed.\n\nYour Booking Queue Number is: #${queueNumber}.\nExpected wait time is: ${waitPeriod <= 0 ? 'Immediate' : `${waitPeriod} minutes`}. Please wait in the reception area.`;
            }

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
          const activeServices = await this.prisma.service.findMany({
            where: { salonId: salon.id, isActive: true },
          });
          let serviceToBook = null;
          const msgText = parsed.text.toLowerCase();
          for (const s of activeServices) {
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

              if (language === 'HINDI') {
                finalResponseText = `सफलता! आपकी "${serviceToBook.name}" के लिए वॉक-इन बुकिंग पक्की हो गई है।\n\nआपका बुकिंग नंबर: #${queueNumber} है।\nअनुमानित प्रतीक्षा समय: ${waitPeriod <= 0 ? 'अभी तुरंत' : `${waitPeriod} मिनट`} है। कृपया प्रतीक्षा क्षेत्र में बैठें।`;
              } else if (language === 'HINGLISH') {
                finalResponseText = `Success! Aapki walk-in booking confirm ho gayi hai for ${serviceToBook.name}.\n\nAapka Booking Queue Number: #${queueNumber} hai.\nExpected wait time: ${waitPeriod <= 0 ? 'Abhi turant (0 mins)' : `${waitPeriod} minutes`} hai. Please reception area me wait karein.`;
              } else {
                finalResponseText = `Success! Your walk-in booking for "${serviceToBook.name}" has been confirmed.\n\nYour Booking Queue Number is: #${queueNumber}.\nExpected wait time is: ${waitPeriod <= 0 ? 'Immediate' : `${waitPeriod} minutes`}. Please wait in the reception area.`;
              }

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

              if (alternatives.length > 0) {
                const optionsStr = alternatives.map((alt, idx) => {
                  const timeString = alt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateString = alt.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  return `${idx + 1}. ${dateString} at ${timeString} with ${alt.staffName}`;
                }).join('\n');

                if (language === 'HINDI') {
                  finalResponseText = `आज के लिए उपलब्ध स्लॉट यहाँ दिए गए हैं:\n${optionsStr}\n\nयदि आप बुक करना चाहते हैं, तो कृपया समय या विकल्प संख्या लिखकर भेजें।`;
                } else if (language === 'HINGLISH') {
                  finalResponseText = `Aaj ke available slots ye hain:\n${optionsStr}\n\nKya aap inme se koi choose karna chahte hain? Option number reply karein ya preferred time batayein.`;
                } else {
                  finalResponseText = `Here are the available slots for today:\n${optionsStr}\n\nWould you like to book one of these? Reply with the option number or specify your preferred time.`;
                }
              } else {
                const partners = await this.recoveryService.getPartnerSalons(salon.id);
                if (partners.length > 0) {
                  const partnersStr = partners.map(p => p.name).join(', ');
                  if (language === 'HINDI') {
                    finalResponseText = `आज हमारे पास कोई स्लॉट उपलब्ध नहीं है। आप किसी अन्य दिन का समय चुन सकते हैं, या हमारे सहयोगी सैलून: ${partnersStr} पर बुक कर सकते हैं।`;
                  } else if (language === 'HINGLISH') {
                    finalResponseText = `Aaj koi slots available nahi hain. Aap another day try kar sakte hain, ya partner salons: ${partnersStr} pe book kar sakte hain.`;
                  } else {
                    finalResponseText = `No slots are available today. You can request a slot for another day, or book with our partner salons: ${partnersStr}.`;
                  }
                } else {
                  if (language === 'HINDI') {
                    finalResponseText = `क्षमा करें, आज कोई स्लॉट उपलब्ध नहीं है। कृपया किसी अन्य दिन या समय के लिए पूछें।`;
                  } else if (language === 'HINGLISH') {
                    finalResponseText = `Sorry, aaj koi slots available nahi hain. Please another day ya time batayein.`;
                  } else {
                    finalResponseText = `Sorry, no slots are available today. Please ask for another day or time.`;
                  }
                }
              }
            } else {
              if (language === 'HINDI') {
                finalResponseText = `क्षमा करें, मुझे यह सेवा नहीं मिली। कृपया स्पष्ट रूप से सेवा का नाम बताएं।`;
              } else if (language === 'HINGLISH') {
                finalResponseText = `Sorry, mujhe wo service nahi mili. Please service specify karein.`;
              } else {
                finalResponseText = `Sorry, I couldn't identify the service. Please specify the service name.`;
              }
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
              try {
                const stripe = new Stripe(process.env.STRIPE_API_KEY || 'dummy_key', {
                  apiVersion: '2022-11-15' as any,
                });
                const session = await stripe.checkout.sessions.create({
                  payment_method_types: ['card'],
                  line_items: [
                    {
                      price_data: {
                        currency: 'inr',
                        product_data: {
                          name: appointment.service.name,
                        },
                        unit_amount: Math.round(appointment.service.price * 100),
                      },
                      quantity: 1,
                    },
                  ],
                  mode: 'payment',
                  success_url: `https://salonflow.com/booking-success?session_id={CHECKOUT_SESSION_ID}`,
                  cancel_url: `https://salonflow.com/booking-cancel`,
                  metadata: {
                    appointmentId: appointment.id,
                    salonId: salon.id,
                  },
                });
                checkoutLink = session.url;
              } catch (stripeError) {
                this.logger.error(`Stripe checkout session creation failed: ${stripeError.message}`);
                await this.prisma.auditLog.create({
                  data: {
                    salonId: salon.id,
                    action: 'PAYMENT_LINK_FAILED',
                    details: {
                      appointmentId: appointment.id,
                      serviceName: appointment.service.name,
                      error: stripeError.message,
                    },
                  },
                });
                await this.prisma.appointment.update({
                  where: { id: appointment.id },
                  data: { notes: (appointment.notes ? appointment.notes + ' | ' : '') + 'Pay at salon confirmed due to Stripe link failure.' },
                });
              }

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

              let queueSuffix = '';
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
                const queueNumber = queueCount + 1;
                const waitPeriod = queueCount * 15; // 15 mins per person

                if (language === 'HINDI') {
                  queueSuffix = `\n\nआपका बुकिंग नंबर: #${queueNumber} है।\nअनुमानित प्रतीक्षा समय: ${waitPeriod === 0 ? 'अभी तुरंत' : `${waitPeriod} मिनट`} है। कृपया प्रतीक्षा क्षेत्र में बैठें।`;
                } else if (language === 'HINGLISH') {
                  queueSuffix = `\n\nAapka Booking Queue Number: #${queueNumber} hai.\nExpected wait time: ${waitPeriod === 0 ? 'Abhi turant' : `${waitPeriod} minutes`} hai. Please reception area me wait karein.`;
                } else {
                  queueSuffix = `\n\nYour Booking Queue Number is: #${queueNumber}.\nExpected wait time is: ${waitPeriod === 0 ? 'Immediate' : `${waitPeriod} minutes`}. Please wait in the reception area.`;
                }
              }

              if (language === 'HINDI') {
                finalResponseText = `नमस्ते! आपकी "${appointment.service.name}" की बुकिंग ${bookedStaffName ? `${bookedStaffName} के साथ ` : ''}${details.date} को ${timeString} बजे पक्की हो गई है।${checkoutLink ? ` कृपया यहाँ भुगतान करें: ${checkoutLink}` : ' (सैलून पर भुगतान करें)'}` + queueSuffix;
              } else if (language === 'HINGLISH') {
                finalResponseText = `Success! Aapki appointment "${appointment.service.name}" ${bookedStaffName ? `${bookedStaffName} ke saath ` : ''}ke liye ${details.date} ko ${timeString} baje confirm ho gayi hai!${checkoutLink ? ` Please pay karne ke liye is link par click karein: ${checkoutLink}` : ' (Pay at Salon confirmed)'}` + queueSuffix;
              } else {
                finalResponseText = `Success! I have confirmed your appointment for "${appointment.service.name}"${bookedStaffName ? ` with ${bookedStaffName}` : ''} on ${details.date} at ${timeString}!${checkoutLink ? ` Please complete your payment here: ${checkoutLink}` : ' (Pay at Salon confirmed)'}` + queueSuffix;
              }
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

                if (alternatives.length > 0) {
                  const optionsStr = alternatives.map((alt, idx) => {
                    const timeString = alt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateString = alt.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return `${idx + 1}. ${dateString} at ${timeString} with ${alt.staffName}`;
                  }).join('\n');

                  if (language === 'HINDI') {
                    finalResponseText = `क्षमा करें, वह समय उपलब्ध नहीं है। आज के लिए उपलब्ध स्लॉट यहाँ दिए गए हैं:\n${optionsStr}\n\nयदि आप इनमें से कोई चाहते हैं, तो कृपया संख्या या समय बताएं, या "वेटिंग लिस्ट" लिखकर इस समय के खाली होने पर सूचना पा सकते हैं।`;
                  } else if (language === 'HINGLISH') {
                    finalResponseText = `Sorry, wo time available nahi hai. Aaj ke available slots ye hain:\n${optionsStr}\n\nKya aap inme se koi choose karna chahte hain? Option number reply karein, ya phir 'waiting list' join karne ke liye write 'waiting list'.`;
                  } else {
                    finalResponseText = `Sorry, that time slot is not available. Here are today's available slots:\n${optionsStr}\n\nWould you like to book one of these? Reply with the option number, or reply 'waiting list' to join the waitlist.`;
                  }
                } else {
                  const partners = await this.recoveryService.getPartnerSalons(salon.id);
                  if (partners.length > 0) {
                    const partnersStr = partners.map(p => p.name).join(', ');
                    if (language === 'HINDI') {
                      finalResponseText = `आज हमारे पास कोई स्लॉट उपलब्ध नहीं है। आप किसी अन्य दिन का समय चुन सकते हैं, या हमारे सहयोगी सैलून: ${partnersStr} (जो सैलूनफ्लो द्वारा संचालित हैं) में बुकिंग कर सकते हैं। आप "वेटिंग लिस्ट" लिखकर भी इस समय के खाली होने पर सूचना पा सकते हैं।`;
                    } else if (language === 'HINGLISH') {
                      finalResponseText = `Aaj koi slots available nahi hain. Aap another day timing ke liye request kar sakte hain, ya hamare partner salons: ${partnersStr} (powered by SalonsFlow) pe book kar sakte hain. Ya phir 'waiting list' type karke waitlist join kar sakte hain.`;
                    } else {
                      finalResponseText = `No slots are available today. You can request a slot for another day, or book with our partner salons: ${partnersStr} (also powered by SalonsFlow). Alternatively, reply 'waiting list' to join the waitlist.`;
                    }
                  } else {
                    if (language === 'HINDI') {
                      finalResponseText = `क्षमा करें, आज कोई स्लॉट उपलब्ध नहीं है। आप किसी अन्य दिन का समय चुन सकते हैं या "वेटिंग लिस्ट" लिखकर भेज सकते हैं।`;
                    } else if (language === 'HINGLISH') {
                      finalResponseText = `Sorry, aaj koi slots available nahi hain. Aap another day timing try kar sakte hain ya waitlist me aane ke liye 'waiting list' write karein.`;
                    } else {
                      finalResponseText = `Sorry, no slots are available today. Please ask for another day/time or reply 'waiting list' to join the waitlist.`;
                    }
                  }
                }
              } else {
                if (language === 'HINDI') {
                  finalResponseText = `मुझे पता चला कि आप ${details.date} को ${details.time} बजे "${details.serviceName}" बुक करना चाहते थे, लेकिन मैं इसे पूरा नहीं कर सका: ${err.message}।`;
                } else if (language === 'HINGLISH') {
                  finalResponseText = `Aap ${details.date} ko ${details.time} baje "${details.serviceName}" book karna chahte the, par booking nahi ho payi: ${err.message}.`;
                } else {
                  finalResponseText = `I identified you wanted to book a "${details.serviceName}" on ${details.date} at ${details.time}, but could not complete it: ${err.message}.`;
                }
              }
            }
          }
        } else {
          if (language === 'HINDI') {
            finalResponseText = `मैं समझता हूँ कि आप अपॉइंटमेंट बुक करना चाहते हैं, लेकिन मुझे सही तारीख, समय या सेवा नहीं मिल सकी। क्या आप कृपया स्पष्ट बता सकते हैं?`;
          } else if (language === 'HINGLISH') {
            finalResponseText = `Main samajh gaya ki aap book karna chahte hain, par mujhe sahi date, time ya service nahi mili. Please detail me batayein?`;
          } else {
            finalResponseText = `I understand you want to book an appointment, but I couldn't extract the exact date, time, or service. Could you please specify them?`;
          }
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
          if (language === 'HINDI') {
            finalResponseText = `मुझे आपका कोई आने वाला अपॉइंटमेंट नहीं मिला। क्या आप नया बुक करना चाहते हैं?`;
          } else if (language === 'HINGLISH') {
            finalResponseText = `Mujhe aapka koi upcoming appointment nahi mila. Kya aap naya book karna chahte hain?`;
          } else {
            finalResponseText = `I couldn't find any upcoming appointments for you. Would you like to book a new one?`;
          }
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
              if (language === 'HINDI') {
                finalResponseText = `आपका अपॉइंटमेंट ${updated.service.name} के लिए अब ${details.date} को ${timeString} बजे बदल दिया गया है।`;
              } else if (language === 'HINGLISH') {
                finalResponseText = `Success! Aapka appointment ${updated.service.name} ke liye ab ${details.date} ko ${timeString} baje shift ho gaya hai.`;
              } else {
                finalResponseText = `Success! Your appointment for ${updated.service.name} has been rescheduled to ${details.date} at ${timeString}.`;
              }
            } catch (err) {
              this.logger.warn(`Reschedule failed for appointment ${upcoming.id}: ${err.message}. Fetching alternatives.`);
              const newStartTime = new Date(`${details.date}T${details.time}:00Z`);
              const alternatives = await this.recoveryService.getAlternativeSlots(
                salon.id,
                upcoming.serviceId,
                newStartTime,
                upcoming.staffId || undefined,
              );

              if (alternatives.length > 0) {
                const optionsStr = alternatives.map((alt, idx) => {
                  const timeStr = alt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = alt.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  return `${idx + 1}. ${dateStr} at ${timeStr} with ${alt.staffName}`;
                }).join('\n');

                if (language === 'HINDI') {
                  finalResponseText = `क्षमा करें, वह समय उपलब्ध नहीं है। आज के लिए उपलब्ध स्लॉट यहाँ दिए गए हैं:\n${optionsStr}\n\nयदि आप इनमें से कोई चाहते हैं, तो कृपया संख्या या समय बताएं, या "वेटिंग लिस्ट" लिखकर इस समय के खाली होने पर सूचना पा सकते हैं।`;
                } else if (language === 'HINGLISH') {
                  finalResponseText = `Sorry, wo time available nahi hai. Aaj ke available slots ye hain:\n${optionsStr}\n\nKya aap inme se koi choose karna chahte hain? Option number reply karein, ya phir 'waiting list' join karne ke liye write 'waiting list'.`;
                } else {
                  finalResponseText = `Sorry, that time slot is not available. Here are today's available slots:\n${optionsStr}\n\nWould you like to book one of these? Reply with the option number, or reply 'waiting list' to join the waitlist.`;
                }
              } else {
                const partners = await this.recoveryService.getPartnerSalons(salon.id);
                if (partners.length > 0) {
                  const partnersStr = partners.map(p => p.name).join(', ');
                  if (language === 'HINDI') {
                    finalResponseText = `आज हमारे पास कोई स्लॉट उपलब्ध नहीं है। आप किसी अन्य दिन का समय चुन सकते हैं, या हमारे सहयोगी सैलून: ${partnersStr} (जो सैलूनफ्लो द्वारा संचालित हैं) में बुकिंग कर सकते हैं। आप "वेटिंग लिस्ट" लिखकर भी इस समय के खाली होने पर सूचना पा सकते हैं।`;
                  } else if (language === 'HINGLISH') {
                    finalResponseText = `Aaj koi slots available nahi hain. Aap another day timing ke liye request kar sakte hain, ya hamare partner salons: ${partnersStr} (powered by SalonsFlow) pe book kar sakte hain. Ya phir 'waiting list' type karke waitlist join kar sakte hain.`;
                  } else {
                    finalResponseText = `No slots are available today. You can request a slot for another day, or book with our partner salons: ${partnersStr} (also powered by SalonsFlow). Alternatively, reply 'waiting list' to join the waitlist.`;
                  }
                } else {
                  if (language === 'HINDI') {
                    finalResponseText = `क्षमा करें, आज कोई स्लॉट उपलब्ध नहीं है। आप किसी अन्य दिन का समय चुन सकते हैं या "वेटिंग लिस्ट" लिखकर भेज सकते हैं।`;
                  } else if (language === 'HINGLISH') {
                    finalResponseText = `Sorry, aaj koi slots available nahi hain. Aap another day timing try kar sakte hain ya waitlist me aane ke liye 'waiting list' write karein.`;
                  } else {
                    finalResponseText = `Sorry, no slots are available today. Please ask for another day/time or reply 'waiting list' to join the waitlist.`;
                  }
                }
              }
            }
          } else {
            if (language === 'HINDI') {
              finalResponseText = `आप अपना ${upcoming.service.name} अपॉइंटमेंट बदलना चाहते हैं। कृपया नया पसंदीदा समय और तारीख बताएं।`;
            } else if (language === 'HINGLISH') {
              finalResponseText = `Aap apna ${upcoming.service.name} appointment reschedule karna chahte hain. Please naya date aur time batayein.`;
            } else {
              finalResponseText = `You want to reschedule your ${upcoming.service.name} appointment. Please specify your preferred new date and time.`;
            }
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
            if (language === 'HINDI') {
              finalResponseText = `मुझे वह सेवा नहीं मिली। कृपया स्पष्ट रूप से सेवा का नाम बताएं।`;
            } else if (language === 'HINGLISH') {
              finalResponseText = `Mujhe wo service nahi mili. Please service ka naam specify karein.`;
            } else {
              finalResponseText = `I couldn't identify the service. Please specify the service name.`;
            }
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
            if (language === 'HINDI') {
              finalResponseText = `सफलतापूर्वक! आपको ${details.date} को ${timeString} बजे "${service.name}" के लिए वेटिंग लिस्ट में जोड़ दिया गया है। जब भी स्लॉट खाली होगा, हम आपको सूचित करेंगे।`;
            } else if (language === 'HINGLISH') {
              finalResponseText = `Aapko waitlist me add kar diya gaya hai! ${details.date} ko ${timeString} baje "${service.name}" ke liye. Agar slot khali hoga toh notify karenge.`;
            } else {
              finalResponseText = `Added to waiting list! You are queued for "${service.name}" on ${details.date} at ${timeString}. We will notify you if it opens up.`;
            }
          }
        } else {
          if (language === 'HINDI') {
            finalResponseText = `मैं आपको वेटिंग लिस्ट में जोड़ सकता हूँ, लेकिन मुझे आवश्यक विवरण (सेवा, तारीख, समय) नहीं मिले। कृपया बताएं।`;
          } else if (language === 'HINGLISH') {
            finalResponseText = `Main aapko waiting list me add kar sakta hu, par mujhe details nahi mili. Please service, date aur time batayein.`;
          } else {
            finalResponseText = `I can add you to the waiting list, but I couldn't find the requested service, date, or time. Please specify them.`;
          }
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
            const takeoverMsg =
              language === 'HINDI'
                ? 'हमारी दैनिक संदेश सीमा समाप्त हो गई है। हमारी टीम का एक सदस्य जल्द ही आपसे संपर्क करेगा।'
                : language === 'HINGLISH'
                ? 'Humari daily message limit exceed ho gayi hai. Humare team member aapse jald hi contact karenge.'
                : 'We have reached our message limit for today. A human receptionist will assist you shortly.';

            await this.sendMessage(
              parsed.fromPhone,
              takeoverMsg,
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
