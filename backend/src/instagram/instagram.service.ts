import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v17.0';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse incoming webhook payload to extract relevant Instagram message data
   */
  parseMessage(body: any) {
    try {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];
      const sender = messaging?.sender;
      const recipient = messaging?.recipient;
      const message = messaging?.message;

      if (!message || !sender || !recipient) return null;

      return {
        fromInstagramId: sender.id,
        recipientPageId: recipient.id,
        text: message.text || '',
        messageId: message.mid,
        timestamp: messaging.timestamp
          ? new Date(messaging.timestamp)
          : new Date(),
      };
    } catch (error) {
      this.logger.error(`Error parsing instagram message: ${error.message}`);
      return null;
    }
  }

  /**
   * Persist the incoming message to the database, mapping Instagram ID to phone column
   */
  async saveIncomingMessage(
    salonId: string,
    fromInstagramId: string,
    name: string,
    content: string,
    language: string = 'ENGLISH',
  ) {
    // Unique identifier for Instagram client to avoid unique constraint violations
    const phone = `ig_${fromInstagramId}`;

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
      },
      create: {
        salonId,
        phone,
        name,
        source: 'INSTAGRAM',
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

    return { customer, conversation, message: savedMsg };
  }

  /**
   * Send a DM reply via Instagram Messaging Graph API
   */
  async sendMessage(
    toInstagramId: string,
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
      }
    }

    let activeToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (targetSalonId) {
      const salon = await this.prisma.salon.findUnique({
        where: { id: targetSalonId },
        select: { instagramAccessToken: true },
      });
      if (salon?.instagramAccessToken) {
        activeToken = salon.instagramAccessToken;
      }
    }

    if (!activeToken || activeToken.startsWith('sandbox')) {
      this.logger.warn(
        'Instagram API credentials missing. Mocking message send.',
      );
      this.logger.log(`[MOCK IG] To: ${toInstagramId} | Msg: ${text}`);
    } else {
      try {
        const response = await fetch(`${this.apiUrl}/me/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: { id: toInstagramId },
            message: { text },
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          this.logger.error(
            `Failed to send IG message: ${JSON.stringify(err)}`,
          );
        }
      } catch (error) {
        this.logger.error(`Error sending IG message: ${error.message}`);
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
