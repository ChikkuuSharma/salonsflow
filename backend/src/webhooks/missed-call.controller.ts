import {
  Controller,
  Post,
  Get,
  UseGuards,
  UnauthorizedException,
  Body,
  Req,
  Res,
  Headers,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('api/v1/webhooks/missed-call')
export class MissedCallController {
  private readonly logger = new Logger(MissedCallController.name);
  private readonly webhookSecret = process.env.MISSED_CALL_SECRET || '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Post()
  async handleMissedCall(
    @Body() body: { phone: string; salonId?: string },
    @Headers('x-signature') signature: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const { phone } = body;
    let { salonId } = body;

    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    // 1. Resolve Salon
    let salon = null;
    if (salonId) {
      salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
    }

    if (!salon) {
      // Fallback to the first salon if none specified or found
      salon = await this.prisma.salon.findFirst();
    }

    if (!salon) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: 'No salon configured in system.',
      });
    }

    salonId = salon.id;

    // 2. Signature Validation (if secret is configured)
    if (this.webhookSecret) {
      if (!signature || signature !== this.webhookSecret) {
        await this.prisma.logSecurityEvent(
          salonId,
          'INVALID_MISSED_CALL_SIGNATURE',
          {
            ip: req.ip,
            signature,
          },
        );
        return res.sendStatus(HttpStatus.UNAUTHORIZED);
      }
    }

    // Acknowledge the missed call event immediately to telco
    res.status(HttpStatus.ACCEPTED).json({ message: 'Missed call received' });

    try {
      // 3. Store the missed call in database
      const missedCall = await this.prisma.missedCall.create({
        data: {
          salonId,
          phone,
          source: 'TELCO',
          status: 'PENDING',
        },
      });

      this.logger.log(
        `Received missed call from ${phone} for salon ${salonId}`,
      );

      // 4. Pre-provision customer & conversation so we can log the outbound message
      const customer = await this.prisma.customer.upsert({
        where: {
          salonId_phone: {
            salonId,
            phone,
          },
        },
        update: {
          lastVisit: new Date(),
        },
        create: {
          salonId,
          phone,
          name: 'Valued Client',
        },
      });

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
          },
        });
      }

      // 5. Auto-trigger welcome WhatsApp message
      const welcomeMessage = `Hello! We noticed you gave us a missed call. How can we help you book an appointment today?`;
      await this.whatsappService.sendMessage(
        phone,
        welcomeMessage,
        conversation.id,
        salonId,
      );

      // Create Audit Log
      await this.prisma.auditLog.create({
        data: {
          salonId,
          action: 'RECEIVED_MISSED_CALL',
          details: {
            missedCallId: missedCall.id,
            phone,
            conversationId: conversation.id,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error processing missed call callback: ${error.message}`,
      );
    }
  }

  @Get()
  @UseGuards(ClerkAuthGuard)
  async getMissedCalls(@Req() req: any) {
    let salonId = req.user?.salonId;
    if (!salonId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { clerkId: req.user.sub },
      });
      if (!dbUser) {
        throw new UnauthorizedException('User record not found in database.');
      }
      salonId = dbUser.salonId;
    }
    return this.prisma.missedCall.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
