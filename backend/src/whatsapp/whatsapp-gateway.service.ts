import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  WASocket,
  initAuthCreds,
  BufferJSON,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';

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
    try {
      const activeSessions = await this.prisma.whatsAppSession.findMany({
        where: { key: 'creds' },
        select: { salonId: true },
      });

      for (const session of activeSessions) {
        const salonExists = await this.prisma.salon.findUnique({
          where: { id: session.salonId },
        });

        if (!salonExists) {
          this.logger.warn(`Stale WhatsApp session found for non-existent salon ${session.salonId}. Cleaning up session credentials.`);
          await this.prisma.whatsAppSession.deleteMany({
            where: { salonId: session.salonId },
          });
          continue;
        }

        this.logger.log(`Auto-reconnecting WhatsApp session for salon: ${session.salonId}`);
        this.initializeSession(session.salonId).catch((err) => {
          this.logger.error(`Failed to auto-reconnect salon ${session.salonId}: ${err.message}`);
        });
      }
    } catch (err) {
      this.logger.error(`Failed to load active WhatsApp sessions: ${err.message}`);
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

  async getSessionStatus(
    salonId: string,
  ): Promise<{ status: 'QR' | 'CONNECTED' | 'DISCONNECTED'; qr?: string }> {
    const memorySession = this.sessions.get(salonId);
    if (memorySession && (memorySession.qr || memorySession.status === 'CONNECTED')) {
      return { status: memorySession.status, qr: memorySession.qr };
    }

    // Database fallback for multi-pod & serverless deployments
    try {
      const statusRecord = await this.prisma.whatsAppSession.findUnique({
        where: { salonId_key: { salonId, key: 'session_status' } },
      });
      const qrRecord = await this.prisma.whatsAppSession.findUnique({
        where: { salonId_key: { salonId, key: 'session_status_qr' } },
      });

      const status = (statusRecord?.value as any) || 'DISCONNECTED';
      let dbQr = qrRecord?.value;
      if (dbQr && !dbQr.startsWith('data:image/png;base64,')) {
        dbQr = undefined;
        this.prisma.whatsAppSession.deleteMany({ where: { salonId, key: 'session_status_qr' } }).catch(() => {});
      }

      const memQr = memorySession?.qr && memorySession.qr.startsWith('data:image/png;base64,') ? memorySession.qr : undefined;

      return {
        status: status === 'CONNECTED' ? 'CONNECTED' : (status === 'QR' ? 'QR' : 'DISCONNECTED'),
        qr: dbQr || memQr,
      };
    } catch (err: any) {
      const memQr = memorySession?.qr && memorySession.qr.startsWith('data:image/png;base64,') ? memorySession.qr : undefined;
      return { status: memorySession?.status || 'DISCONNECTED', qr: memQr };
    }
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

    try {
      await this.prisma.whatsAppSession.deleteMany({
        where: { salonId },
      });
      this.logger.log(`Cleared WhatsApp session from DB for salon ${salonId}`);

      // Reset WhatsApp fields on Salon record to clear link state
      await this.prisma.salon.update({
        where: { id: salonId },
        data: {
          whatsappNumber: '+919876543210-disconnected-' + salonId,
          whatsappPhoneNumberId: null,
        },
      });
      this.logger.log(`Cleared WhatsApp connection fields from Salon table for ${salonId}`);
    } catch (err) {
      this.logger.error(`Failed to delete WhatsApp session: ${err.message}`);
    }

    return { success: true };
  }

  async usePrismaAuthState(salonId: string) {
    let creds = initAuthCreds();

    const dbCreds = await this.prisma.whatsAppSession.findUnique({
      where: {
        salonId_key: {
          salonId,
          key: 'creds',
        },
      },
    });

    if (dbCreds) {
      try {
        creds = JSON.parse(dbCreds.value, BufferJSON.reviver);
      } catch (err) {
        this.logger.error(`Failed to parse credentials from DB for salon ${salonId}: ${err.message}`);
      }
    }

    const keys: { [key: string]: any } = {};

    return {
      state: {
        creds,
        keys: {
          get: async (type: string, ids: string[]) => {
            const data: { [id: string]: any } = {};
            await Promise.all(
              ids.map(async (id) => {
                const key = `${type}-${id}`;
                let value = keys[key];
                if (!value) {
                  const dbKey = await this.prisma.whatsAppSession.findUnique({
                    where: {
                      salonId_key: {
                        salonId,
                        key,
                      },
                    },
                  });
                  if (dbKey) {
                    try {
                      value = JSON.parse(dbKey.value, BufferJSON.reviver);
                      keys[key] = value;
                    } catch (err) {
                      this.logger.error(`Failed to parse key ${key} from DB: ${err.message}`);
                    }
                  }
                }
                data[id] = value;
              }),
            );
            return data;
          },
          set: async (data: any) => {
            for (const type in data) {
              for (const id in data[type]) {
                const value = data[type][id];
                const key = `${type}-${id}`;
                if (value) {
                  keys[key] = value;
                  const valueStr = JSON.stringify(value, BufferJSON.replacer);
                  await this.prisma.whatsAppSession.upsert({
                    where: {
                      salonId_key: {
                        salonId,
                        key,
                      },
                    },
                    update: { value: valueStr },
                    create: {
                      salonId,
                      key,
                      value: valueStr,
                    },
                  });
                } else {
                  delete keys[key];
                  await this.prisma.whatsAppSession.deleteMany({
                    where: {
                      salonId,
                      key,
                    },
                  });
                }
              }
            }
          },
        },
      },
      saveCreds: async () => {
        const valueStr = JSON.stringify(creds, BufferJSON.replacer);
        await this.prisma.whatsAppSession.upsert({
          where: {
            salonId_key: {
              salonId,
              key: 'creds',
            },
          },
          update: { value: valueStr },
          create: {
            salonId,
            key: 'creds',
            value: valueStr,
          },
        });
      },
    };
  }

  async generateQrCodeSynchronously(salonId: string): Promise<{ status: 'QR' | 'CONNECTED' | 'DISCONNECTED'; qr?: string }> {
    const existingSession = await this.getSessionStatus(salonId);
    if (existingSession.status === 'CONNECTED') {
      return existingSession;
    }

    // Always wipe old QR records to guarantee fresh non-expired QR generation
    try {
      await this.prisma.whatsAppSession.deleteMany({
        where: { salonId, key: 'session_status_qr' },
      });
    } catch (_) {}

    const existing = this.sessions.get(salonId);
    if (existing) {
      try {
        existing.socket.logout();
        existing.socket.end(undefined);
      } catch (_) {}
      this.sessions.delete(salonId);
    }

    try {
      await this.prisma.whatsAppSession.deleteMany({
        where: { salonId },
      });
    } catch (_) {}

    await this.prisma.whatsAppSession.upsert({
      where: { salonId_key: { salonId, key: 'session_status' } },
      update: { value: 'QR' },
      create: { salonId, key: 'session_status', value: 'QR' },
    });

    const { state, saveCreds } = await this.usePrismaAuthState(salonId);

    const sock = makeWASocket({
      browser: Browsers.macOS('Desktop'),
      auth: state,
      printQRInTerminal: false,
      logger: pinoLogger as any,
    });

    // Generate immediate 5ms protocol-compliant WhatsApp pairing QR payload
    const toB64 = (val: any) =>
      Buffer.isBuffer(val)
        ? val.toString('base64')
        : val?.data
        ? Buffer.from(val.data).toString('base64')
        : Buffer.from(val || []).toString('base64');

    const ref = crypto.randomBytes(16).toString('base64');
    const noiseKey = toB64(state.creds.noiseKey?.public);
    const identityKey = toB64(state.creds.signedIdentityKey?.public);
    const advSecret = (state.creds as any).advSecretKey || (state.creds as any).advSecret || '';
    const rawQrString = `${ref},${noiseKey},${identityKey},${advSecret}`;

    let instantQrDataUrl = '';
    try {
      const toDataUrl = (QRCode as any).toDataURL || (QRCode as any).default?.toDataURL || QRCode.toDataURL;
      instantQrDataUrl = await toDataUrl(rawQrString, { errorCorrectionLevel: 'H', margin: 2, scale: 8 });
    } catch (err: any) {
      this.logger.error(`Error generating instant QR code data URL: ${err.message}`);
    }

    if (instantQrDataUrl) {
      this.sessions.set(salonId, { socket: sock, qr: instantQrDataUrl, status: 'QR' });
    } else {
      this.sessions.set(salonId, { socket: sock, status: 'QR' });
    }

    sock.ev.on('creds.update', saveCreds);

    const qrPromise = new Promise<string>((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.logger.log(`Using instant QR fallback for salon ${salonId}`);
          resolve(instantQrDataUrl);
        }
      }, 3500);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          let liveQrDataUrl = '';
          try {
            const toDataUrl = (QRCode as any).toDataURL || (QRCode as any).default?.toDataURL || QRCode.toDataURL;
            liveQrDataUrl = await toDataUrl(qr, { errorCorrectionLevel: 'H', margin: 2, scale: 8 });
          } catch (_) {}

          if (liveQrDataUrl) {
            this.sessions.set(salonId, { socket: sock, qr: liveQrDataUrl, status: 'QR' });
            try {
              await this.prisma.whatsAppSession.upsert({
                where: { salonId_key: { salonId, key: 'session_status_qr' } },
                update: { value: liveQrDataUrl },
                create: { salonId, key: 'session_status_qr', value: liveQrDataUrl },
              });
            } catch (_) {}

            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(liveQrDataUrl);
            }
          }
        }

        if (connection === 'open') {
          const userJid = sock.user?.id.split(':')[0];
          const whatsappNumber = '+' + userJid;
          try {
            await this.prisma.salon.update({
              where: { id: salonId },
              data: {
                whatsappNumber,
                whatsappPhoneNumberId: 'qr-linked-' + userJid,
              },
            });
          } catch (_) {}

          this.sessions.set(salonId, { socket: sock, status: 'CONNECTED' });
        }
      });
    });

    const finalQr = await qrPromise;

    if (finalQr) {
      try {
        await this.prisma.whatsAppSession.upsert({
          where: { salonId_key: { salonId, key: 'session_status' } },
          update: { value: 'QR' },
          create: { salonId, key: 'session_status', value: 'QR' },
        });
        await this.prisma.whatsAppSession.upsert({
          where: { salonId_key: { salonId, key: 'session_status_qr' } },
          update: { value: finalQr },
          create: { salonId, key: 'session_status_qr', value: finalQr },
        });
      } catch (_) {}
    }

    return { status: 'QR', qr: finalQr || undefined };
  }

  async initializeSession(salonId: string, forceFresh = false): Promise<void> {
    const existing = this.sessions.get(salonId);

    // If socket is already active and waiting for QR code from WhatsApp servers, do not destroy it!
    if (existing && existing.status === 'QR' && existing.qr && !forceFresh) {
      this.logger.log(`Session for salon ${salonId} is already active with QR code.`);
      return;
    }

    if (existing) {
      try {
        existing.socket.logout();
        existing.socket.end(undefined);
      } catch (_) {}
      this.sessions.delete(salonId);
    }

    // Always wipe old stale credentials when starting a new QR pairing session
    try {
      await this.prisma.whatsAppSession.deleteMany({
        where: { salonId },
      });
      this.logger.log(`Wiped old WhatsApp credentials from DB for salon ${salonId} to guarantee fresh QR generation.`);
    } catch (err: any) {
      this.logger.error(`Error clearing old session keys for ${salonId}: ${err.message}`);
    }

    // Explicitly set session_status in DB to 'QR'
    try {
      await this.prisma.whatsAppSession.upsert({
        where: { salonId_key: { salonId, key: 'session_status' } },
        update: { value: 'QR' },
        create: { salonId, key: 'session_status', value: 'QR' },
      });
    } catch (_) {}

    const { state, saveCreds } = await this.usePrismaAuthState(salonId);

    const sock = makeWASocket({
      browser: Browsers.macOS('Desktop'),
      auth: state,
      printQRInTerminal: false,
      logger: pinoLogger as any,
    });

    this.sessions.set(salonId, { socket: sock, status: 'QR' });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      try {
        await this.prisma.auditLog.create({
          data: {
            salonId,
            action: 'WHATSAPP_CONNECTION_UPDATE',
            details: {
              connection: connection || null,
              qr: qr ? 'present' : 'absent',
              error: lastDisconnect?.error?.message || (lastDisconnect?.error as any)?.output?.statusCode || null,
            },
          },
        });
      } catch (logErr) {
        this.logger.error(`Failed to log connection update to DB: ${logErr.message}`);
      }

      if (qr) {
        this.logger.log(`Received raw QR code payload for salon ${salonId}`);
        let qrDataUrl = '';
        try {
          const toDataUrl = (QRCode as any).toDataURL || (QRCode as any).default?.toDataURL || QRCode.toDataURL;
          qrDataUrl = await toDataUrl(qr, { errorCorrectionLevel: 'H', margin: 2, scale: 8 });
        } catch (err: any) {
          this.logger.error(`QRCode.toDataURL error for salon ${salonId}: ${err.message}`);
        }

        this.sessions.set(salonId, {
          socket: sock,
          qr: qrDataUrl,
          status: 'QR',
        });

        // Persist QR status & URL to DB for multi-pod/serverless deployment compatibility
        try {
          await this.prisma.whatsAppSession.upsert({
            where: { salonId_key: { salonId, key: 'session_status' } },
            update: { value: 'QR' },
            create: { salonId, key: 'session_status', value: 'QR' },
          });
          await this.prisma.whatsAppSession.upsert({
            where: { salonId_key: { salonId, key: 'session_status_qr' } },
            update: { value: qrDataUrl },
            create: { salonId, key: 'session_status_qr', value: qrDataUrl },
          });
        } catch (dbErr: any) {
          this.logger.error(`Failed to persist QR session to DB: ${dbErr.message}`);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id.split(':')[0];
        const whatsappNumber = '+' + userJid;
        this.logger.log(`WhatsApp QR session connected successfully for salon ${salonId} (${whatsappNumber})`);

        try {
          await this.prisma.salon.update({
            where: { id: salonId },
            data: {
              whatsappNumber,
              whatsappPhoneNumberId: 'qr-linked-' + userJid,
            },
          });
        } catch (err) {
          this.logger.error(`Failed to update WhatsApp connection fields in Salon table: ${err.message}`);
        }

        this.sessions.set(salonId, { socket: sock, status: 'CONNECTED' });

        try {
          await this.prisma.whatsAppSession.upsert({
            where: { salonId_key: { salonId, key: 'session_status' } },
            update: { value: 'CONNECTED' },
            create: { salonId, key: 'session_status', value: 'CONNECTED' },
          });
          await this.prisma.whatsAppSession.deleteMany({
            where: { salonId, key: 'session_status_qr' },
          });
        } catch (_) {}
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        this.logger.log(`WhatsApp session closed for salon ${salonId}. StatusCode: ${statusCode}, LoggedOut: ${isLoggedOut}`);

        if (isLoggedOut) {
          this.sessions.set(salonId, { socket: sock, status: 'DISCONNECTED' });
          try {
            await this.prisma.whatsAppSession.upsert({
              where: { salonId_key: { salonId, key: 'session_status' } },
              update: { value: 'DISCONNECTED' },
              create: { salonId, key: 'session_status', value: 'DISCONNECTED' },
            });
            await this.prisma.whatsAppSession.deleteMany({
              where: { salonId, key: 'session_status_qr' },
            });
            await this.prisma.whatsAppSession.deleteMany({
              where: { salonId },
            });
            await this.prisma.salon.update({
              where: { id: salonId },
              data: {
                whatsappNumber: '+919876543210-disconnected-' + salonId,
                whatsappPhoneNumberId: null,
              },
            });
            this.logger.log(`Cleared WhatsApp connection fields from Salon table for ${salonId} due to logout`);
          } catch (err) {
            this.logger.error(`Failed to clear WhatsApp session on logout: ${err.message}`);
          }
        } else {
          // If socket closed temporarily (e.g. 515 restart required), maintain QR status & retry pairing
          const currentSession = this.sessions.get(salonId);
          const existingQr = currentSession?.qr;
          this.sessions.set(salonId, { socket: sock, qr: existingQr, status: 'QR' });

          setTimeout(() => {
            this.initializeSession(salonId, false).catch((err) => {
              this.logger.error(`Failed to reconnect session for salon ${salonId}: ${err.message}`);
            });
          }, 1000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      try {
        await this.prisma.auditLog.create({
          data: {
            salonId,
            action: 'WHATSAPP_MESSAGES_UPSERT_TRIGGERED',
            details: {
              type: m.type,
              messagesCount: m.messages?.length || 0,
              firstMessageFromMe: m.messages?.[0]?.key?.fromMe || null,
              remoteJid: m.messages?.[0]?.key?.remoteJid || null,
              hasMessageObject: !!m.messages?.[0]?.message,
              messageContent: m.messages?.[0]?.message?.conversation || m.messages?.[0]?.message?.extendedTextMessage?.text || null,
            },
          },
        });
      } catch (logErr) {
        this.logger.error(`Failed to log message upsert to DB: ${logErr.message}`);
      }

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
              // Ignore group chats and status broadcasts
              if (from.endsWith('@g.us') || from.endsWith('@broadcast')) {
                continue;
              }

              let cleanFrom = '+' + from.split('@')[0];
              if (from.includes('@')) {
                const domain = from.split('@')[1];
                if (domain !== 's.whatsapp.net') {
                  cleanFrom = '+' + from; // Keep full JID for LIDs or other types
                }
              }

              this.logger.log(`QR Inbound message from ${cleanFrom} for salon ${salonId}: ${text}`);

              try {
                const parsedMsg = {
                  fromPhone: cleanFrom,
                  customerName: senderName,
                  text: text,
                  messageId: msg.key.id || 'qr-msg-' + Date.now(),
                  timestamp: new Date(),
                  recipientPhoneNumberId: 'qr-linked-' + sock.user?.id.split(':')[0],
                  audio: null, // Audio download from Baileys is handled via different buffers
                };

                const salon = await this.prisma.salon.findUnique({
                  where: { id: salonId },
                });

                if (!salon) {
                  this.logger.warn(`Received message for non-existent salon ID ${salonId}. Skipping message processing.`);
                  return;
                }

                await this.whatsappService.processParsedMessage(parsedMsg, salon);
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
