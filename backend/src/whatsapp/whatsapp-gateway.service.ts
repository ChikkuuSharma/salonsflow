import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from './whatsapp.service';
import { WHATSAPP_PROVIDER_TOKEN, IWhatsappProvider } from './interfaces/whatsapp-provider.interface';
import { SocketLifecycleState, MediaPayload, ProviderSessionStatus, NormalizedMessage } from './interfaces/whatsapp-types';

@Injectable()
export class WhatsappGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    @Inject(WHATSAPP_PROVIDER_TOKEN)
    private readonly whatsappProvider: any,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing WhatsApp Gateway Service with Provider Adapter...');

    // Register Status Event Handler
    this.whatsappProvider.onStatusChanged(async (salonId: string, status: SocketLifecycleState, metadata: any) => {
      this.logger.warn(`[${new Date().toISOString()}] [PROVIDER_STATUS_CHANGE] SalonId [${salonId}] Status -> ${status}`);

      try {
        await this.prisma.whatsAppSession.upsert({
          where: { salonId_key: { salonId, key: 'session_status' } },
          update: { value: status },
          create: { salonId, key: 'session_status', value: status },
        });

        if (status === 'CONNECTED' && metadata?.whatsappNumber) {
          await this.prisma.salon.update({
            where: { id: salonId },
            data: {
              whatsappNumber: metadata.whatsappNumber,
              whatsappPhoneNumberId: 'linked-' + metadata.whatsappNumber.replace(/\D/g, ''),
            },
          }).catch(() => {});
        }
      } catch (err: any) {
        this.logger.error(`Error updating DB status for salon ${salonId}: ${err.message}`);
      }
    });

    // Register Inbound Message Handler (Routes to AI Engine & CRM)
    this.whatsappProvider.onMessageReceived(async (salonId: string, message: NormalizedMessage) => {
      this.logger.warn(`[${new Date().toISOString()}] [INBOUND_MSG] SalonId [${salonId}] From: ${message.from}, Body: ${message.body}`);

      const salon = await this.prisma.salon.findUnique({ where: { id: salonId } });
      if (!salon) {
        this.logger.error(`Salon not found for ID ${salonId}`);
        return;
      }

      const pushName = (message.raw as any)?.pushName || (message.raw as any)?.notifyName || message.from;
      const isAudio = message.hasMedia && message.media?.mimetype?.startsWith('audio');

      // Convert NormalizedMessage to internal format for WhatsappService
      const parsed = {
        fromPhone: message.from,
        from: message.from,
        customerName: pushName,
        text: message.body,
        messageId: message.id,
        mediaUrl: message.media ? `data:${message.media.mimetype};base64,${message.media.data}` : undefined,
        mediaType: message.hasMedia ? (isAudio ? 'audio' : 'image') : undefined,
        audio: isAudio && message.media ? {
          id: message.id,
          mimeType: message.media.mimetype,
          data: message.media.data,
        } : null,
        rawMessage: message.raw,
      };

      await this.whatsappService.processParsedMessage(parsed, salon);
    });

    // Auto-reconnect active sessions on startup
    try {
      const activeSessions = await this.prisma.whatsAppSession.findMany({
        where: { key: 'session_status', value: 'CONNECTED' },
        select: { salonId: true },
      });

      for (const session of activeSessions) {
        this.logger.log(`Auto-initializing WhatsApp provider session for salon: ${session.salonId}`);
        this.whatsappProvider.initializeSession(session.salonId).catch((err: any) => {
          this.logger.error(`Failed to auto-initialize session for salon ${session.salonId}: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to load active WhatsApp sessions from DB: ${err.message}`);
    }
  }

  onModuleDestroy() {
    this.logger.log('Destroying WhatsApp Gateway Service...');
  }

  async getSessionStatus(salonId: string): Promise<{ status: SocketLifecycleState | 'QR'; qr?: string }> {
    const providerStatus = await this.whatsappProvider.getSessionStatus(salonId);
    const normalizedStatus = providerStatus.status === 'QR_READY' ? 'QR' : providerStatus.status;
    return {
      status: normalizedStatus,
      qr: providerStatus.qr,
    };
  }

  async getDebugInfo(salonId: string) {
    const status = await this.whatsappProvider.getSessionStatus(salonId);
    return {
      timestamp: new Date().toISOString(),
      salonId,
      lifecycleState: status.status,
      authenticated: status.status === 'CONNECTED',
      whatsappNumber: status.whatsappNumber || null,
      lastDisconnectReason: status.lastDisconnectReason || null,
    };
  }

  async generateQrCodeSynchronously(salonId: string, isForce = false): Promise<{ status: SocketLifecycleState | 'QR'; qr?: string }> {
    const res = await this.whatsappProvider.getQrCode(salonId, isForce);
    const normalizedStatus = res.status === 'QR_READY' ? 'QR' : res.status;
    return {
      status: normalizedStatus,
      qr: res.qr,
    };
  }

  async generatePairingCode(salonId: string, rawPhoneNumber: string, isForce = false): Promise<{ code?: string; error?: string }> {
    if (this.whatsappProvider.getPairingCode) {
      return this.whatsappProvider.getPairingCode(salonId, rawPhoneNumber);
    }
    return { error: 'Pairing code (OTP) login is not supported by the active provider. Please scan the QR code to pair your device.' };
  }

  async disconnectSession(salonId: string): Promise<{ success: boolean }> {
    await this.whatsappProvider.disconnectSession(salonId);
    await this.prisma.whatsAppSession.deleteMany({ where: { salonId } }).catch(() => {});
    return { success: true };
  }

  async sendMessage(salonId: string, to: string, content: string | MediaPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.whatsappProvider.sendMessage(salonId, to, content);
  }

  async sendDirectMessage(salonId: string, to: string, content: string | MediaPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage(salonId, to, content);
  }
}
