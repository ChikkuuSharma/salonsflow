import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Headers,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { WhatsappService } from './whatsapp.service';
import { AiService } from '../ai/ai.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecoveryService } from '../appointments/recovery.service';
import { WaitingListService } from '../appointments/waiting-list.service';

@Controller('api/v1/webhooks/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  private readonly verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN || 'salonflow_verify_token';
  private readonly appSecret = process.env.WHATSAPP_APP_SECRET || '';
  private static readonly processedMessages = new Set<string>();

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly aiService: AiService,
    private readonly appointmentsService: AppointmentsService,
    private readonly prisma: PrismaService,
    private readonly recoveryService: RecoveryService,
    private readonly waitingListService: WaitingListService,
  ) {}

  /**
   * Handle Webhook Verification from Meta
   */
  @Get()
  verifyWebhook(@Req() req: express.Request, @Res() res: express.Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully!');
      return res.status(HttpStatus.OK).send(challenge);
    } else {
      return res.sendStatus(HttpStatus.FORBIDDEN);
    }
  }

  /**
   * Handle Incoming WhatsApp Messages
   */
  @Post()
  async handleIncomingMessage(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: express.Request & { rawBody?: Buffer },
    @Res() res: express.Response,
  ) {
    // 1. Parse the Message first to identify recipient number
    const parsed = this.whatsappService.parseMessage(body);

    if (parsed?.messageId) {
      if (WhatsappController.processedMessages.has(parsed.messageId)) {
        this.logger.log(`Duplicate WhatsApp message ID detected: ${parsed.messageId}. Skipping.`);
        return res.sendStatus(HttpStatus.OK);
      }
      WhatsappController.processedMessages.add(parsed.messageId);
      if (WhatsappController.processedMessages.size > 1000) {
        const firstKey = WhatsappController.processedMessages.keys().next().value;
        if (firstKey !== undefined) {
          WhatsappController.processedMessages.delete(firstKey);
        }
      }
    }

    // Resolve active salon dynamically based on incoming recipientPhoneNumberId
    let salon = null;
    if (parsed?.recipientPhoneNumberId) {
      salon = await this.prisma.salon.findUnique({
        where: { whatsappPhoneNumberId: parsed.recipientPhoneNumberId },
      });
    }

    if (!salon) {
      salon = await this.prisma.salon.findFirst();
    }

    if (!salon) {
      salon = await this.prisma.salon.create({
        data: {
          name: 'Elegance Salon & Spa',
          whatsappNumber: '+919876543210',
          aiPrompt:
            'You are an AI receptionist for Elegance Salon. Be polite and helpful.',
        },
      });
    }

    // 2. Verify Signature (in production)
    if (this.appSecret) {
      if (!signature) {
        await this.prisma.logSecurityEvent(
          salon.id,
          'MISSING_WEBHOOK_SIGNATURE',
          {
            ip: req.ip,
            headers: req.headers,
          },
        );
        return res.sendStatus(HttpStatus.UNAUTHORIZED);
      }

      const payload = req.rawBody
        ? req.rawBody.toString('utf8')
        : JSON.stringify(body);
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', this.appSecret)
        .update(payload)
        .digest('hex')}`;

      if (signature !== expectedSignature) {
        await this.prisma.logSecurityEvent(
          salon.id,
          'INVALID_WEBHOOK_SIGNATURE',
          {
            ip: req.ip,
            signature,
            expectedSignature,
          },
        );
        return res.sendStatus(HttpStatus.UNAUTHORIZED);
      }
    }

    // Acknowledge Meta immediately to prevent retries
    res.sendStatus(HttpStatus.OK);

    if (!parsed) return;

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

          const { conversation } = await this.whatsappService.saveIncomingMessage(
            salon.id,
            parsed.fromPhone,
            parsed.customerName,
            '[Audio message too long]',
            currentLanguage,
          );

          await this.whatsappService.sendMessage(
            parsed.fromPhone,
            limitMsg,
            conversation.id,
          );
          return res.sendStatus(HttpStatus.OK);
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
      await this.whatsappService.saveIncomingMessage(
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

              await this.whatsappService.sendMessage(parsed.fromPhone, thankYouMessage, conversation.id);
            } else {
              const promptFeedbackMessage = language === 'HINDI'
                ? `हमें खेद है कि आपका अनुभव अच्छा नहीं रहा। कृपया हमें बताएं कि हम अपनी सेवाओं में क्या सुधार कर सकते हैं?`
                : language === 'HINGLISH'
                ? `We are sorry to hear that. Please hume batayein ki hum humari services ko kaise improve kar sakte hain?`
                : `We are sorry to hear that your experience wasn't perfect. Please reply with what we can do to improve our services.`;

              await this.whatsappService.sendMessage(parsed.fromPhone, promptFeedbackMessage, conversation.id);
            }
          } else {
            const promptRatingMessage = language === 'HINDI'
              ? `कृपया अपनी विजिट को 1 से 5 स्टार्स (⭐) में रेटिंग दें।`
              : language === 'HINGLISH'
              ? `Please aapki visit ko 1 se 5 stars (⭐) me rate karein.`
              : `Please rate your experience by replying with a number from 1 to 5 stars (⭐).`;
            await this.whatsappService.sendMessage(parsed.fromPhone, promptRatingMessage, conversation.id);
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
          await this.whatsappService.sendMessage(parsed.fromPhone, thankYouFeedback, conversation.id);
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
      const intent = await this.aiService.determineIntent(parsed.text);
      this.logger.log(`Determined intent: ${intent}`);

      if (intent === 'BOOKING') {
        const details = await this.aiService.extractBookingDetails(parsed.text, salon.id);
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

              if (language === 'HINDI') {
                finalResponseText = `नमस्ते! आपकी "${appointment.service.name}" की बुकिंग ${bookedStaffName ? `${bookedStaffName} के साथ ` : ''}${details.date} को ${timeString} बजे पक्की हो गई है।${checkoutLink ? ` कृपया यहाँ भुगतान करें: ${checkoutLink}` : ' (सैलून पर भुगतान करें)'}`;
              } else if (language === 'HINGLISH') {
                finalResponseText = `Success! Aapki appointment "${appointment.service.name}" ${bookedStaffName ? `${bookedStaffName} ke saath ` : ''}ke liye ${details.date} ko ${timeString} baje confirm ho gayi hai!${checkoutLink ? ` Please pay karne ke liye is link par click karein: ${checkoutLink}` : ' (Pay at Salon confirmed)'}`;
              } else {
                finalResponseText = `Success! I have confirmed your appointment for "${appointment.service.name}"${bookedStaffName ? ` with ${bookedStaffName}` : ''} on ${details.date} at ${timeString}!${checkoutLink ? ` Please complete your payment here: ${checkoutLink}` : ' (Pay at Salon confirmed)'}`;
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

          if (nonBookingCount > 5) {
            this.logger.log(`Conversation cap reached (> 5 non-booking messages today) for customer ${customer.id}. Silencing bot.`);
            return res.sendStatus(HttpStatus.OK);
          } else if (nonBookingCount === 5) {
            const takeoverMsg =
              language === 'HINDI'
                ? 'हमारी दैनिक संदेश सीमा समाप्त हो गई है। हमारी टीम का एक सदस्य जल्द ही आपसे संपर्क करेगा।'
                : language === 'HINGLISH'
                ? 'Humari daily message limit exceed ho gayi hai. Humare team member aapse jald hi contact karenge.'
                : 'We have reached our message limit for today. A human receptionist will assist you shortly.';

            await this.whatsappService.sendMessage(
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
            return res.sendStatus(HttpStatus.OK);
          }
        }

        finalResponseText = await this.aiService.generateResponse(
          conversation.id,
          salon.id,
        );
      }
    }

    // 6. Send Response back via WhatsApp
    await this.whatsappService.sendMessage(
      parsed.fromPhone,
      finalResponseText,
      conversation.id,
    );
  }
}
