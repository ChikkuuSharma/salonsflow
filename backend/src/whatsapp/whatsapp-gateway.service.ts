import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  WASocket,
  initAuthCreds,
  BufferJSON,
} from '@whiskeysockets/baileys';
import * as path from 'path';
import * as fs from 'fs';
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

  async initializeSession(salonId: string): Promise<void> {
    const { state, saveCreds } = await this.usePrismaAuthState(salonId);

    const sock = makeWASocket({
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
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.logger.log(`WhatsApp QR session closed for salon ${salonId}. Reconnect: ${shouldReconnect}`);

        this.sessions.set(salonId, { socket: sock, status: 'DISCONNECTED' });

        if (shouldReconnect) {
          const sessionExists = await this.prisma.whatsAppSession.findUnique({
            where: {
              salonId_key: {
                salonId,
                key: 'creds',
              },
            },
          });
          if (sessionExists) {
            this.initializeSession(salonId).catch((err) => {
              this.logger.error(`Failed to reconnect session for salon ${salonId}: ${err.message}`);
            });
          } else {
            this.logger.log(`Skipping auto-reconnect for salon ${salonId} because credentials do not exist in DB.`);
            this.sessions.delete(salonId);
          }
        } else {
          this.sessions.delete(salonId);
          try {
            await this.prisma.whatsAppSession.deleteMany({
              where: { salonId },
            });
            this.logger.log(`Cleared WhatsApp session from DB for salon ${salonId} due to logout`);

            // Clear Salon table connection fields on logout
            try {
              await this.prisma.salon.update({
                where: { id: salonId },
                data: {
                  whatsappNumber: '+919876543210-disconnected-' + salonId,
                  whatsappPhoneNumberId: null,
                },
              });
            } catch (err) {
              this.logger.error(`Failed to clear WhatsApp connection fields in Salon table on logout: ${err.message}`);
            }
            this.logger.log(`Cleared WhatsApp connection fields from Salon table for ${salonId} due to logout`);
          } catch (err) {
            this.logger.error(`Failed to clear WhatsApp session on logout: ${err.message}`);
          }
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
