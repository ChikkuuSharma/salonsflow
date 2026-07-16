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
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WhatsappGatewayService } from './whatsapp-gateway.service';
import * as express from 'express';
import * as crypto from 'crypto';
import { WhatsappService } from './whatsapp.service';
import { AiService } from '../ai/ai.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecoveryService } from '../appointments/recovery.service';
import { WaitingListService } from '../appointments/waiting-list.service';
import { SalonId } from '../auth/salon-id.decorator';

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
    private readonly gatewayService: WhatsappGatewayService,
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

    if (parsed) {
      await this.whatsappService.processParsedMessage(parsed, salon);
    }
  }

  @Get('status')
  @UseGuards(ClerkAuthGuard)
  async getStatus(@SalonId() salonId: string) {
    return this.gatewayService.getSessionStatus(salonId);
  }

  @Get('qr')
  @UseGuards(ClerkAuthGuard)
  async getQr(@SalonId() salonId: string) {
    const session = await this.gatewayService.getSessionStatus(salonId);
    if (session.status === 'DISCONNECTED') {
      await this.gatewayService.initializeSession(salonId);
    }
    return this.gatewayService.getSessionStatus(salonId);
  }

  @Post('disconnect')
  @UseGuards(ClerkAuthGuard)
  async disconnect(@SalonId() salonId: string) {
    return this.gatewayService.disconnectSession(salonId);
  }
}
