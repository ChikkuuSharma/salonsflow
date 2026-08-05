import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  WASocket,
  initAuthCreds,
  BufferJSON,
  fetchLatestBaileysVersion,
  Browsers,
  useMultiFileAuthState,
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

export type SocketLifecycleState =
  | 'CONNECTING'
  | 'QR_READY'
  | 'PAIRING_PENDING'
  | 'CONNECTED'
  | 'DISCONNECTED';

export interface ManagedSession {
  id: string;
  socket: WASocket;
  status: SocketLifecycleState;
  qr?: string;
  pairingCode?: string;
  pairingPhone?: string;
  createdAt: number;
  pairingExpiresAt?: number;
  lastConnectionUpdate?: any;
  lastDisconnect?: any;
}

const pinoLogger = pino({ level: 'silent' });

@Injectable()
export class WhatsappGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappGatewayService.name);
  private readonly pairingTimeoutMs = (Number(process.env.WHATSAPP_PAIRING_TIMEOUT_SEC) || 180) * 1000;
  private sessions = new Map<string, ManagedSession>();

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
      const publicStatus = memorySession.status === 'CONNECTED' ? 'CONNECTED' : (memorySession.status === 'DISCONNECTED' ? 'DISCONNECTED' : 'QR');
      return { status: publicStatus, qr: memorySession.qr };
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
      const fallbackStatus = memorySession?.status === 'CONNECTED' ? 'CONNECTED' : (memorySession?.status === 'DISCONNECTED' ? 'DISCONNECTED' : 'QR');
      return { status: fallbackStatus, qr: memQr };
    }
  }

  async disconnectSession(salonId: string) {
    const session = this.sessions.get(salonId);
    if (session) {
      try {
        if (session.status === 'CONNECTED') {
          await session.socket.logout().catch(() => {});
        }
        session.socket.end(undefined);
      } catch (err) {
        this.logger.error(`Error closing session for salon ${salonId}: ${err.message}`);
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

  async useSessionAuthState(salonId: string, forceFresh = false) {
    const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', salonId);
    if (forceFresh && fs.existsSync(sessionDir)) {
      this.logger.warn(`[${new Date().toISOString()}] [SESSION_WIPE] Wiping auth directory for salonId [${salonId}]`);
      fs.rmSync(sessionDir, { recursive: true, force: true });
      await this.prisma.whatsAppSession.deleteMany({ where: { salonId } }).catch(() => {});
    }

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    return { state, saveCreds };
  }

  private async getOrCreateSingleSocket(salonId: string, isForce = false): Promise<ManagedSession> {
    const existing = this.sessions.get(salonId);
    const isSocketClosed = existing?.status === 'DISCONNECTED' || (existing?.socket as any)?.ws?.readyState === 3;

    if (existing && !isForce && !isSocketClosed) {
      this.logger.warn(`[${new Date().toISOString()}] [SINGLE_SESSION_REUSE] [${existing.id}] Reusing active single socket for salonId [${salonId}] (state: ${existing.status})`);
      return existing;
    }

    const shouldForceTeardown = isForce || isSocketClosed;
    if (existing && shouldForceTeardown) {
      this.logger.warn(`[${new Date().toISOString()}] [SINGLE_SESSION_TEARDOWN] [${existing.id}] Teardown closed/stale socket for salonId [${salonId}]`);
      try {
        if (existing.status === 'CONNECTED') {
          await existing.socket.logout().catch(() => {});
        }
        existing.socket.end(undefined);
      } catch (_) {}
      this.sessions.delete(salonId);
    }

    const { state, saveCreds } = await this.useSessionAuthState(salonId, shouldForceTeardown);

    let version: [number, number, number] = [2, 3000, 1043857760];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest && latest.version) {
        version = latest.version;
      }
    } catch (_) {}

    const customTraceLogger = pino({
      level: 'trace',
    }, pino.destination({
      write: (msg: string) => {
        try {
          const parsed = JSON.parse(msg);
          const time = new Date().toISOString();
          if (parsed.msg || parsed.node || parsed.stanza || parsed.iq || parsed.tag || parsed.recv || parsed.send || parsed.level >= 10) {
            this.logger.warn(`[${time}] [PROTOCOL_TRACE] ${JSON.stringify(parsed)}`);
          }
        } catch (_) {
          this.logger.warn(`[${new Date().toISOString()}] [RAW_TRACE] ${msg.trim()}`);
        }
      }
    }));

    const sock = makeWASocket({
      version,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      auth: state,
      printQRInTerminal: false,
      logger: customTraceLogger as any,
    });

    const sockId = 'sock_single_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    (sock as any).id = sockId;
    this.logger.warn(`[${new Date().toISOString()}] [SINGLE_SESSION_CREATED] [${sockId}] Created new single WASocket instance for salonId [${salonId}]`);

    const managedSession: ManagedSession = {
      id: sockId,
      socket: sock,
      status: 'CONNECTING',
      createdAt: Date.now(),
      pairingExpiresAt: Date.now() + this.pairingTimeoutMs,
    };
    this.sessions.set(salonId, managedSession);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      managedSession.lastConnectionUpdate = update;
      this.logger.warn(`[${new Date().toISOString()}] [CONNECTION_UPDATE] [${sockId}] ${JSON.stringify(update)}`);
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        managedSession.qr = qr;
        if (managedSession.status !== 'PAIRING_PENDING') {
          managedSession.status = 'QR_READY';
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id.split(':')[0];
        const whatsappNumber = '+' + userJid;
        this.logger.warn(`[${new Date().toISOString()}] [STATE_TRANSITION] [${sockId}] Handshake complete -> Transitioning to CONNECTED for ${whatsappNumber}`);
        try {
          await this.prisma.salon.update({
            where: { id: salonId },
            data: {
              whatsappNumber,
              whatsappPhoneNumberId: 'qr-linked-' + userJid,
            },
          });
        } catch (_) {}

        managedSession.status = 'CONNECTED';
      } else if (connection === 'close') {
        managedSession.lastDisconnect = lastDisconnect;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message;
        this.logger.warn(`[${new Date().toISOString()}] [LAST_DISCONNECT] [${sockId}] StatusCode: ${statusCode}, ErrorMessage: ${errorMessage}`);
        this.logger.warn(`[${new Date().toISOString()}] [STATE_TRANSITION] [${sockId}] Socket closed -> Transitioning to DISCONNECTED`);
        managedSession.status = 'DISCONNECTED';
      }
    });

    return managedSession;
  }

  async generatePairingCode(salonId: string, rawPhoneNumber: string, isForce = false): Promise<{ code?: string; error?: string }> {
    const cleanPhone = rawPhoneNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return { error: 'Invalid phone number format. Please provide full mobile number with country code (e.g. 919876543210).' };
    }

    const session = await this.getOrCreateSingleSocket(salonId, isForce);

    // Reuse active pairing code if already pending for same phone number
    if (session.status === 'PAIRING_PENDING' && session.pairingPhone === cleanPhone && session.pairingCode && session.pairingExpiresAt && Date.now() <= session.pairingExpiresAt) {
      this.logger.warn(`[${new Date().toISOString()}] [SINGLE_SESSION_PAIRING_REUSE] Reusing active pairing code ${session.pairingCode} for [${session.id}]`);
      return { code: session.pairingCode };
    }

    // Ensure socket is ready (wait for QR / connected state if currently connecting)
    if (session.status === 'CONNECTING' && !session.qr) {
      this.logger.warn(`[${new Date().toISOString()}] [WAIT_FOR_SOCKET_READY] [${session.id}] Waiting for WebSocket connection handshake to complete...`);
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 8000);
        const checkInterval = setInterval(() => {
          if (session.qr || session.status === 'QR_READY' || session.status === 'CONNECTED') {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });
    }

    try {
      this.logger.warn(`[${new Date().toISOString()}] [REQUEST_PAIRING_CODE_START] [${session.id}] Calling sock.requestPairingCode(${cleanPhone}) on SINGLE active socket`);
      const rawCode = await session.socket.requestPairingCode(cleanPhone);
      const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      
      session.status = 'PAIRING_PENDING';
      session.pairingCode = formattedCode;
      session.pairingPhone = cleanPhone;
      session.pairingExpiresAt = Date.now() + this.pairingTimeoutMs;

      this.logger.warn(`[${new Date().toISOString()}] [REQUEST_PAIRING_CODE_SUCCESS] [${session.id}] Code generated: ${formattedCode}`);
      return { code: formattedCode };
    } catch (err: any) {
      this.logger.error(`[${new Date().toISOString()}] [REQUEST_PAIRING_CODE_ERROR] [${session.id}] Error: ${err.message}`);
      return { error: err.message || 'Failed to request pairing code from WhatsApp server.' };
    }
  }

  async getDebugInfo(salonId: string) {
    const session = this.sessions.get(salonId);
    const dbStatus = await this.prisma.whatsAppSession.findUnique({
      where: { salonId_key: { salonId, key: 'session_status' } },
    }).catch(() => null);

    return {
      timestamp: new Date().toISOString(),
      salonId,
      socketId: session?.id || null,
      lifecycleState: session?.status || 'DISCONNECTED',
      connectionState: session?.status === 'CONNECTED' ? 'open' : (session ? 'connecting' : 'close'),
      pairingPending: session?.status === 'PAIRING_PENDING',
      pairingPhone: session?.pairingPhone || null,
      pairingCode: session?.pairingCode || null,
      pairingExpiration: session?.pairingExpiresAt ? new Date(session.pairingExpiresAt).toISOString() : null,
      authenticated: session?.status === 'CONNECTED',
      dbSessionStatus: dbStatus?.value || null,
      lastConnectionUpdate: session?.lastConnectionUpdate || null,
      lastDisconnect: session?.lastDisconnect || null,
      socketAlive: !!(session && session.socket && !(session.socket as any).ws?.closed),
    };
  }

  async generateQrCodeSynchronously(salonId: string, isForce = false): Promise<{ status: 'QR' | 'CONNECTED' | 'DISCONNECTED'; qr?: string }> {
    const existingSession = await this.getSessionStatus(salonId);
    if (existingSession.status === 'CONNECTED') {
      return existingSession;
    }

    const session = await this.getOrCreateSingleSocket(salonId, isForce);
    
    // If QR is already available, convert to base64 data URL and return immediately
    if (session.qr) {
      try {
        const qrDataUrl = session.qr.startsWith('data:image/') ? session.qr : await QRCode.toDataURL(session.qr);
        session.qr = qrDataUrl;
        return { status: 'QR', qr: qrDataUrl };
      } catch (_) {
        return { status: 'QR', qr: session.qr };
      }
    }

    // Wait up to 10 seconds for initial QR event to populate on session object
    const start = Date.now();
    while (Date.now() - start < 10000) {
      if (session.status === 'CONNECTED') {
        return { status: 'CONNECTED' };
      }
      if (session.qr) {
        try {
          const qrDataUrl = session.qr.startsWith('data:image/') ? session.qr : await QRCode.toDataURL(session.qr);
          session.qr = qrDataUrl;
          return { status: 'QR', qr: qrDataUrl };
        } catch (_) {
          return { status: 'QR', qr: session.qr };
        }
      }
      if (session.status === 'DISCONNECTED') {
        return { status: 'DISCONNECTED' };
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    return { status: session.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED' };
  }

  async initializeSession(salonId: string, forceFresh = false): Promise<void> {
    const existing = this.sessions.get(salonId);

    // If socket is already active and waiting for QR code from WhatsApp servers, do not destroy it!
    if (existing && (existing.status === 'QR_READY' || existing.status === 'PAIRING_PENDING') && existing.qr && !forceFresh) {
      this.logger.log(`Session for salon ${salonId} is already active with QR code.`);
      return;
    }

    if (existing) {
      try {
        if (existing.status === 'CONNECTED') {
          await existing.socket.logout().catch(() => {});
        }
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

    const { state, saveCreds } = await this.useSessionAuthState(salonId);

    const sock = makeWASocket({
      browser: Browsers.macOS('Desktop'),
      auth: state,
      printQRInTerminal: false,
      logger: pinoLogger as any,
    });

    const initSockId = 'sock_init_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    (sock as any).id = initSockId;

    const managedSession: ManagedSession = {
      id: initSockId,
      socket: sock,
      status: 'CONNECTING',
      createdAt: Date.now(),
      pairingExpiresAt: Date.now() + this.pairingTimeoutMs,
    };
    this.sessions.set(salonId, managedSession);

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

        managedSession.qr = qrDataUrl;
        managedSession.status = 'QR_READY';

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

        managedSession.status = 'CONNECTED';

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
          managedSession.status = 'DISCONNECTED';
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
          managedSession.status = 'QR_READY';

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
