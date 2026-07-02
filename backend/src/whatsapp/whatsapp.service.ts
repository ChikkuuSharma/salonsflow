import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappGatewayService } from './whatsapp-gateway.service';

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
}
