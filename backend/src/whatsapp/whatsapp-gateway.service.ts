import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import * as path from 'path';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from './whatsapp.service';

const pinoLogger = pino({ level: 'silent' });

@Injectable()
export class WhatsappGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappGatewayService.name);
  private sessions = new Map<
    string,
    { socket: WASocket; qr?: string; status: 'QR' | 'CONNECTED' | 'DISCONNECTED' }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing active saved QR WhatsApp sessions...');
    const sessionDir = path.join(process.cwd(), 'sessions');
    if (fs.existsSync(sessionDir)) {
      const salonIds = fs.readdirSync(sessionDir);
      for (const salonId of salonIds) {
        const fullPath = path.join(sessionDir, salonId);
        if (fs.statSync(fullPath).isDirectory()) {
          this.logger.log(`Auto-reconnecting WhatsApp session for salon: ${salonId}`);
          this.initializeSession(salonId).catch((err) => {
            this.logger.error(`Failed to auto-reconnect salon ${salonId}: ${err.message}`);
          });
        }
      }
    }
  }

  onModuleDestroy() {
    this.logger.log('Closing all active saved QR WhatsApp sessions...');
    for (const [salonId, session] of this.sessions.entries()) {
      try {
        session.socket.end(undefined);
      } catch (err) {
        this.logger.error(`Error closing session for salon ${salonId}: ${err.message}`);
      }
    }
  }

  async getSessionStatus(salonId: string) {
    const session = this.sessions.get(salonId);
    if (!session) return { status: 'DISCONNECTED' };
    return {
      status: session.status,
      qr: session.qr,
    };
  }

  async disconnectSession(salonId: string) {
    const session = this.sessions.get(salonId);
    if (session) {
      try {
        session.socket.logout();
        session.socket.end(undefined);
      } catch (err) {
        this.logger.error(`Error logging out session for salon ${salonId}: ${err.message}`);
      }
      this.sessions.delete(salonId);
    }

    const sessionPath = path.join(process.cwd(), 'sessions', salonId);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch (e) {
        this.logger.error(`Failed to delete session directory: ${e.message}`);
      }
    }

    return { success: true };
  }

  async initializeSession(salonId: string): Promise<void> {
    const sessionPath = path.join(process.cwd(), 'sessions', salonId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pinoLogger as any,
    });

    this.sessions.set(salonId, { socket: sock, status: 'QR' });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          const current = this.sessions.get(salonId);
          this.sessions.set(salonId, {
            socket: sock,
            qr: qrBase64,
            status: 'QR',
          });
        } catch (err) {
          this.logger.error(`Failed to generate QR data URL for salon ${salonId}: ${err.message}`);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id.split(':')[0];
        const whatsappNumber = '+' + userJid;
        this.logger.log(`WhatsApp QR session connected successfully for salon ${salonId} (${whatsappNumber})`);

        await this.prisma.salon.update({
          where: { id: salonId },
          data: {
            whatsappNumber,
            whatsappPhoneNumberId: 'qr-linked-' + userJid,
          },
        });

        this.sessions.set(salonId, { socket: sock, status: 'CONNECTED' });
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.logger.log(`WhatsApp QR session closed for salon ${salonId}. Reconnect: ${shouldReconnect}`);

        this.sessions.set(salonId, { socket: sock, status: 'DISCONNECTED' });

        if (shouldReconnect) {
          this.initializeSession(salonId).catch((err) => {
            this.logger.error(`Failed to reconnect session for salon ${salonId}: ${err.message}`);
          });
        } else {
          this.sessions.delete(salonId);
          if (fs.existsSync(sessionPath)) {
            try {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            } catch (e) {
              this.logger.error(`Failed to delete session directory: ${e.message}`);
            }
          }
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            const from = msg.key.remoteJid;
            const text =
              msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              '';
            const senderName = msg.pushName || 'Customer';

            if (from && text) {
              const cleanFrom = '+' + from.split('@')[0];
              this.logger.log(`QR Inbound message from ${cleanFrom} for salon ${salonId}: ${text}`);

              try {
                const result = await this.whatsappService.saveIncomingMessage(
                  salonId,
                  cleanFrom,
                  senderName,
                  text,
                  'ENGLISH',
                );

                const reply = await this.aiService.generateResponse(
                  result.conversation.id,
                  salonId,
                );

                await this.sendDirectMessage(salonId, from, reply);
              } catch (err) {
                this.logger.error(`Error handling QR message event: ${err.message}`);
              }
            }
          }
        }
      }
    });
  }

  async sendDirectMessage(salonId: string, toJid: string, text: string): Promise<boolean> {
    const session = this.sessions.get(salonId);
    if (session && session.status === 'CONNECTED') {
      try {
        await session.socket.sendMessage(toJid, { text });
        this.logger.log(`Outbound QR message sent to ${toJid} for salon ${salonId}`);
        return true;
      } catch (err) {
        this.logger.error(`Failed to send QR message to ${toJid}: ${err.message}`);
      }
    }
    return false;
  }
}
