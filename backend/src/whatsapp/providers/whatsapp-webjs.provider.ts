import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import * as path from 'path';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import { IWhatsappProvider } from '../interfaces/whatsapp-provider.interface';
import {
  NormalizedMessage,
  SocketLifecycleState,
  MediaPayload,
  ProviderSessionStatus,
} from '../interfaces/whatsapp-types';

@Injectable()
export class WhatsappWebJsProvider implements IWhatsappProvider {
  private readonly logger = new Logger(WhatsappWebJsProvider.name);
  private readonly clients = new Map<string, Client>();
  private readonly statuses = new Map<string, ProviderSessionStatus>();
  private messageHandler?: (salonId: string, message: NormalizedMessage) => Promise<void>;
  private statusHandler?: (salonId: string, status: SocketLifecycleState, metadata?: any) => void;

  onMessageReceived(handler: (salonId: string, message: NormalizedMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  onStatusChanged(handler: (salonId: string, status: SocketLifecycleState, metadata?: any) => void): void {
    this.statusHandler = handler;
  }

  async initializeSession(salonId: string, forceFresh = false): Promise<void> {
    const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', `session-${salonId}`);

    if (forceFresh) {
      this.logger.warn(`[${new Date().toISOString()}] [WWEBJS_WIPE] Wiping session directory for salonId [${salonId}]`);
      if (this.clients.has(salonId)) {
        try {
          await this.clients.get(salonId)?.destroy();
        } catch (_) {}
        this.clients.delete(salonId);
      }
      this.statuses.delete(salonId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }

    if (this.clients.has(salonId)) {
      return;
    }

    const currentStatus: ProviderSessionStatus = { status: 'CONNECTING' };
    this.statuses.set(salonId, currentStatus);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: salonId,
        dataPath: path.join(process.cwd(), 'whatsapp_sessions'),
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    client.on('qr', async (qrRaw) => {
      this.logger.warn(`[${new Date().toISOString()}] [WWEBJS_QR] QR code generated for salonId [${salonId}]`);
      try {
        const qrDataUrl = await QRCode.toDataURL(qrRaw);
        currentStatus.status = 'QR_READY';
        currentStatus.qr = qrDataUrl;
        this.statusHandler?.(salonId, 'QR_READY', { qr: qrDataUrl });
      } catch (err) {
        currentStatus.qr = qrRaw;
      }
    });

    client.on('ready', () => {
      const userNumber = client.info?.wid?.user ? `+${client.info.wid.user}` : undefined;
      this.logger.warn(`[${new Date().toISOString()}] [WWEBJS_READY] SalonId [${salonId}] WhatsApp Web Client Ready! Number: ${userNumber}`);
      currentStatus.status = 'CONNECTED';
      currentStatus.qr = undefined;
      currentStatus.whatsappNumber = userNumber;
      this.statusHandler?.(salonId, 'CONNECTED', { whatsappNumber: userNumber });
    });

    client.on('authenticated', () => {
      this.logger.warn(`[${new Date().toISOString()}] [WWEBJS_AUTH] Authenticated successfully for salonId [${salonId}]`);
    });

    client.on('auth_failure', (msg) => {
      this.logger.error(`[${new Date().toISOString()}] [WWEBJS_AUTH_FAIL] Auth failure for salonId [${salonId}]: ${msg}`);
      currentStatus.status = 'DISCONNECTED';
      currentStatus.lastDisconnectReason = msg;
      this.statusHandler?.(salonId, 'DISCONNECTED', { reason: msg });
    });

    client.on('disconnected', (reason) => {
      this.logger.warn(`[${new Date().toISOString()}] [WWEBJS_DISCONNECTED] Client disconnected for salonId [${salonId}]: ${reason}`);
      currentStatus.status = 'DISCONNECTED';
      currentStatus.lastDisconnectReason = String(reason);
      this.clients.delete(salonId);
      this.statusHandler?.(salonId, 'DISCONNECTED', { reason });
    });

    client.on('message', async (msg: Message) => {
      if (msg.from === 'status@broadcast') return;
      try {
        const normalized = await this.normalizeMessage(msg);
        if (this.messageHandler) {
          await this.messageHandler(salonId, normalized);
        }
      } catch (err: any) {
        this.logger.error(`[${new Date().toISOString()}] [WWEBJS_MSG_ERROR] Error handling message: ${err.message}`);
      }
    });

    this.clients.set(salonId, client);
    client.initialize().catch((err) => {
      this.logger.error(`[${new Date().toISOString()}] [WWEBJS_INIT_ERROR] Error initializing client for salonId [${salonId}]: ${err.message}`);
    });
  }

  async getQrCode(salonId: string, forceFresh = false): Promise<{ status: SocketLifecycleState; qr?: string }> {
    const current = this.statuses.get(salonId);
    if (current?.status === 'CONNECTED') {
      return { status: 'CONNECTED' };
    }

    if (forceFresh || !this.clients.has(salonId)) {
      this.initializeSession(salonId, forceFresh).catch((err) => {
        this.logger.error(`Error initializing session for ${salonId}: ${err.message}`);
      });
    }

    const start = Date.now();
    while (Date.now() - start < 3000) {
      const status = this.statuses.get(salonId);
      if (status?.status === 'CONNECTED') {
        return { status: 'CONNECTED' };
      }
      if (status?.qr) {
        return { status: 'QR_READY', qr: status.qr };
      }
      if (status?.status === 'DISCONNECTED') {
        return { status: 'DISCONNECTED' };
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    const finalStatus = this.statuses.get(salonId);
    return {
      status: finalStatus?.status || 'CONNECTING',
      qr: finalStatus?.qr,
    };
  }

  async sendMessage(salonId: string, to: string, content: string | MediaPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const client = this.clients.get(salonId);
    if (!client) {
      return { success: false, error: 'WhatsApp client is not initialized for this salon.' };
    }

    const cleanTo = to.replace(/\D/g, '');
    const chatId = cleanTo.includes('@') ? cleanTo : `${cleanTo}@c.us`;

    try {
      let sentMsg: Message;
      if (typeof content === 'string') {
        sentMsg = await client.sendMessage(chatId, content);
      } else {
        const media = new MessageMedia(content.mimetype, content.data, content.filename);
        sentMsg = await client.sendMessage(chatId, media, { caption: content.caption });
      }

      return {
        success: true,
        messageId: sentMsg.id.id,
      };
    } catch (err: any) {
      this.logger.error(`[${new Date().toISOString()}] [WWEBJS_SEND_ERROR] Failed to send message: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async disconnectSession(salonId: string): Promise<void> {
    const client = this.clients.get(salonId);
    if (client) {
      try {
        await client.logout().catch(() => {});
        await client.destroy().catch(() => {});
      } catch (_) {}
      this.clients.delete(salonId);
    }
    this.statuses.set(salonId, { status: 'DISCONNECTED' });
  }

  async getSessionStatus(salonId: string): Promise<ProviderSessionStatus> {
    const status = this.statuses.get(salonId);
    return status || { status: 'DISCONNECTED' };
  }

  private async normalizeMessage(msg: Message): Promise<NormalizedMessage> {
    const fromClean = msg.from.replace('@c.us', '').replace('@g.us', '');
    let mediaPayload: MediaPayload | undefined;

    if (msg.hasMedia) {
      try {
        const downloaded = await msg.downloadMedia();
        if (downloaded) {
          mediaPayload = {
            mimetype: downloaded.mimetype,
            data: downloaded.data,
            filename: downloaded.filename || undefined,
          };
        }
      } catch (_) {}
    }

    return {
      id: msg.id.id,
      from: fromClean,
      to: msg.to.replace('@c.us', ''),
      body: msg.body || '',
      hasMedia: msg.hasMedia,
      media: mediaPayload,
      timestamp: msg.timestamp,
      isGroupMsg: msg.from.endsWith('@g.us'),
      author: msg.author,
      raw: msg,
    };
  }
}
