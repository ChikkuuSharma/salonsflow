import { Injectable, Logger } from '@nestjs/common';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  WASocket,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import * as path from 'path';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import pino from 'pino';
import { IWhatsappProvider } from '../interfaces/whatsapp-provider.interface';
import {
  NormalizedMessage,
  SocketLifecycleState,
  MediaPayload,
  ProviderSessionStatus,
} from '../interfaces/whatsapp-types';

@Injectable()
export class BaileysProvider implements IWhatsappProvider {
  private readonly logger = new Logger(BaileysProvider.name);
  private readonly sockets = new Map<string, WASocket>();
  private readonly statuses = new Map<string, ProviderSessionStatus>();
  private readonly initPromises = new Map<string, Promise<void>>();
  private messageHandler?: (salonId: string, message: NormalizedMessage) => Promise<void>;
  private statusHandler?: (salonId: string, status: SocketLifecycleState, metadata?: any) => void;

  onMessageReceived(handler: (salonId: string, message: NormalizedMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  onStatusChanged(handler: (salonId: string, status: SocketLifecycleState, metadata?: any) => void): void {
    this.statusHandler = handler;
  }

  private registerMessageListener(sock: WASocket, salonId: string) {
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe || !msg.message) continue;
        try {
          const jid = msg.key.remoteJid || '';
          if (jid.endsWith('@g.us')) continue; // Skip group messages

          const fromClean = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
          if (!fromClean) continue;

          const text = this.extractMessageText(msg.message);

          let hasMedia = false;
          let mediaPayload: any = undefined;

          // Extract voice note / audio if available
          const audioMsg = msg.message.audioMessage || msg.message.ephemeralMessage?.message?.audioMessage;
          if (audioMsg) {
            hasMedia = true;
            try {
              const buffer = await downloadMediaMessage(msg, 'buffer', {});
              mediaPayload = {
                data: buffer.toString('base64'),
                mimetype: audioMsg.mimetype || 'audio/ogg',
              };
            } catch (mediaErr: any) {
              this.logger.warn(`Could not download voice note media for salon ${salonId}: ${mediaErr.message}`);
            }
          }

          if (this.messageHandler) {
            await this.messageHandler(salonId, {
              id: msg.key.id || '',
              from: fromClean,
              to: sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : '',
              body: text,
              hasMedia,
              media: mediaPayload,
              timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
              isGroupMsg: false,
              raw: msg,
            });
          }
        } catch (err: any) {
          this.logger.error(`Error processing message for salon ${salonId}: ${err.message}`);
        }
      }
    });
  }

  private extractMessageText(message: any): string {
    if (!message) return '';
    let m = message;
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;

    return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      m.buttonsResponseMessage?.selectedButtonId ||
      m.buttonsResponseMessage?.selectedDisplayText ||
      m.listResponseMessage?.singleSelectReply?.selectedRowId ||
      m.templateButtonReplyMessage?.selectedId ||
      ''
    );
  }

  async initializeSession(salonId: string, forceFresh = false): Promise<void> {
    if (this.initPromises.has(salonId) && !forceFresh) {
      return this.initPromises.get(salonId);
    }

    const initPromise = (async () => {
      const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', `baileys-session-${salonId}`);

      if (forceFresh) {
        this.logger.warn(`[${new Date().toISOString()}] [BAILEYS_WIPE] Wiping session directory for salonId [${salonId}]`);
        const existingSock = this.sockets.get(salonId);
        if (existingSock) {
          try {
            existingSock.end(undefined);
          } catch (_) {}
          this.sockets.delete(salonId);
        }
        this.statuses.delete(salonId);
        if (fs.existsSync(sessionDir)) {
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch (err: any) {
            this.logger.warn(`Could not remove session directory: ${err.message}`);
          }
        }
      }

      if (this.sockets.has(salonId)) {
        return;
      }

      const currentStatus: ProviderSessionStatus = { status: 'CONNECTING' };
      this.statuses.set(salonId, currentStatus);

      try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
          version,
          auth: state,
          browser: Browsers.ubuntu('Chrome'),
          printQRInTerminal: false,
          syncFullHistory: false,
          markOnlineOnConnect: false,
          logger: pino({ level: 'silent' }),
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            this.logger.warn(`[${new Date().toISOString()}] [BAILEYS_QR] QR code generated for salonId [${salonId}]`);
            try {
              const qrDataUrl = await QRCode.toDataURL(qr);
              currentStatus.status = 'QR_READY';
              currentStatus.qr = qrDataUrl;
              this.statusHandler?.(salonId, 'QR_READY', { qr: qrDataUrl });
            } catch (err) {
              currentStatus.qr = qr;
            }
          }

          if (connection === 'open') {
            const rawId = sock.user?.id || '';
            const userNumber = rawId ? `+${rawId.split(':')[0].replace(/\D/g, '')}` : undefined;
            this.logger.warn(`[${new Date().toISOString()}] [BAILEYS_CONNECTED] SalonId [${salonId}] Connected! Number: ${userNumber}`);
            currentStatus.status = 'CONNECTED';
            currentStatus.qr = undefined;
            currentStatus.whatsappNumber = userNumber;
            this.statusHandler?.(salonId, 'CONNECTED', { whatsappNumber: userNumber });
          }

          if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            this.logger.warn(`[${new Date().toISOString()}] [BAILEYS_CLOSED] SalonId [${salonId}] Connection closed. StatusCode: ${statusCode}, Reconnect: ${shouldReconnect}`);

            if (shouldReconnect) {
              this.sockets.delete(salonId);
              setTimeout(() => {
                this.initializeSession(salonId, false).catch(() => {});
              }, 3000);
            } else {
              currentStatus.status = 'DISCONNECTED';
              this.sockets.delete(salonId);
              this.statusHandler?.(salonId, 'DISCONNECTED', { reason: 'Logged out' });
            }
          }
        });

        this.registerMessageListener(sock, salonId);

        this.sockets.set(salonId, sock);
      } catch (err: any) {
        this.logger.error(`[${new Date().toISOString()}] [BAILEYS_INIT_ERROR] Error initializing Baileys for salonId [${salonId}]: ${err.message}`);
        currentStatus.status = 'DISCONNECTED';
        currentStatus.lastDisconnectReason = err.message;
        this.sockets.delete(salonId);
        this.statusHandler?.(salonId, 'DISCONNECTED', { reason: err.message });
      } finally {
        this.initPromises.delete(salonId);
      }
    })();

    this.initPromises.set(salonId, initPromise);
    return initPromise;
  }

  async getQrCode(salonId: string, forceFresh = false): Promise<{ status: SocketLifecycleState; qr?: string }> {
    const current = this.statuses.get(salonId);
    if (current?.status === 'CONNECTED') {
      return { status: 'CONNECTED' };
    }

    if (forceFresh || !this.sockets.has(salonId)) {
      this.initializeSession(salonId, forceFresh).catch((err) => {
        this.logger.error(`Error initializing session for ${salonId}: ${err.message}`);
      });
    }

    const start = Date.now();
    while (Date.now() - start < 15000) {
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
      await new Promise((r) => setTimeout(r, 300));
    }

    const finalStatus = this.statuses.get(salonId);
    return {
      status: finalStatus?.status || 'CONNECTING',
      qr: finalStatus?.qr,
    };
  }

  async getPairingCode(salonId: string, phoneNumber: string): Promise<{ code?: string; error?: string }> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone) {
      return { error: 'Valid phone number is required.' };
    }

    const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', `baileys-session-${salonId}`);

    const existingSock = this.sockets.get(salonId);
    if (existingSock) {
      try { existingSock.end(undefined); } catch (_) {}
      this.sockets.delete(salonId);
    }
    this.statuses.delete(salonId);
    if (fs.existsSync(sessionDir)) {
      try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}
    }

    const currentStatus: ProviderSessionStatus = { status: 'CONNECTING' };
    this.statuses.set(salonId, currentStatus);

    try {
      const { version } = await fetchLatestBaileysVersion();
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        logger: pino({ level: 'silent' }),
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
          const rawId = sock.user?.id || '';
          const userNumber = rawId ? `+${rawId.split(':')[0].replace(/\D/g, '')}` : undefined;
          this.logger.warn(`[${new Date().toISOString()}] [BAILEYS_CONNECTED] SalonId [${salonId}] Connected via pairing code! Number: ${userNumber}`);
          currentStatus.status = 'CONNECTED';
          currentStatus.qr = undefined;
          currentStatus.whatsappNumber = userNumber;
          this.statusHandler?.(salonId, 'CONNECTED', { whatsappNumber: userNumber });
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            this.sockets.delete(salonId);
            setTimeout(() => { this.initializeSession(salonId, false).catch(() => {}); }, 3000);
          } else {
            currentStatus.status = 'DISCONNECTED';
            this.sockets.delete(salonId);
            this.statusHandler?.(salonId, 'DISCONNECTED', { reason: 'Logged out' });
          }
        }
      });

      // Register inbound message listener on pairing code socket
      this.registerMessageListener(sock, salonId);

      this.sockets.set(salonId, sock);

      await new Promise((r) => setTimeout(r, 800));

      const rawCode = await sock.requestPairingCode(cleanPhone);
      const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      this.logger.warn(`[${new Date().toISOString()}] [BAILEYS_PAIRING] Code generated for salonId [${salonId}]: ${formattedCode}`);
      return { code: formattedCode };
    } catch (err: any) {
      this.logger.error(`Pairing code request error: ${err.message}`);
      return { error: err.message || 'Failed to request pairing code.' };
    }
  }

  async sendMessage(salonId: string, to: string, content: string | MediaPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const sock = this.sockets.get(salonId);
    if (!sock) {
      return { success: false, error: 'WhatsApp socket is not connected.' };
    }

    const cleanTo = to.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!cleanTo) {
      return { success: false, error: 'Invalid destination phone number.' };
    }
    const jid = `${cleanTo}@s.whatsapp.net`;

    try {
      let sentMsg: any;
      if (typeof content === 'string') {
        sentMsg = await sock.sendMessage(jid, { text: content });
      } else {
        const buffer = Buffer.from(content.data, 'base64');
        sentMsg = await sock.sendMessage(jid, {
          image: buffer,
          caption: content.caption,
          mimetype: content.mimetype,
        });
      }

      return {
        success: true,
        messageId: sentMsg?.key?.id || undefined,
      };
    } catch (err: any) {
      this.logger.error(`Error sending Baileys message to ${jid}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async disconnectSession(salonId: string): Promise<void> {
    const sock = this.sockets.get(salonId);
    if (sock) {
      try {
        await sock.logout();
        sock.end(undefined);
      } catch (_) {}
      this.sockets.delete(salonId);
    }
    this.statuses.set(salonId, { status: 'DISCONNECTED' });
  }

  async getSessionStatus(salonId: string): Promise<ProviderSessionStatus> {
    const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', `baileys-session-${salonId}`);
    const credsFile = path.join(sessionDir, 'creds.json');

    let status = this.statuses.get(salonId);
    if (!status && fs.existsSync(credsFile)) {
      this.initializeSession(salonId, false).catch(() => {});
      status = { status: 'CONNECTING' };
    }

    return status || { status: 'DISCONNECTED' };
  }
}
