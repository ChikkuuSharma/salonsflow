import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AiService } from '../ai/ai.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecoveryService } from '../appointments/recovery.service';
import { WaitingListService } from '../appointments/waiting-list.service';
import { WhatsappGatewayService } from './whatsapp-gateway.service';
import { HttpStatus } from '@nestjs/common';
import * as express from 'express';
import * as crypto from 'crypto';

describe('WhatsappController', () => {
  let controller: WhatsappController;
  let whatsappService: WhatsappService;
  let aiService: AiService;
  let appointmentsService: AppointmentsService;
  let prisma: PrismaService;
  let recoveryService: RecoveryService;
  let waitingListService: WaitingListService;

  const mockGatewayService = {
    getSessionStatus: jest.fn(),
    initializeSession: jest.fn(),
    disconnectSession: jest.fn(),
  };

  const mockWhatsappService = {
    parseMessage: jest.fn(),
    saveIncomingMessage: jest.fn(),
    sendMessage: jest.fn(),
    processParsedMessage: jest.fn().mockImplementation(async (parsed, salon) => {
      const context = {
        prisma: mockPrismaService,
        gatewayService: mockGatewayService,
        aiService: mockAiService,
        appointmentsService: mockAppointmentsService,
        recoveryService: mockRecoveryService,
        waitingListService: mockWaitingListService,
        logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
        saveIncomingMessage: mockWhatsappService.saveIncomingMessage,
        sendMessage: mockWhatsappService.sendMessage,
      };
      return WhatsappService.prototype.processParsedMessage.call(context as any, parsed, salon);
    }),
  };

  const mockAiService = {
    determineIntent: jest.fn(),
    extractBookingDetails: jest.fn(),
    generateResponse: jest.fn(),
    detectLanguage: jest.fn().mockResolvedValue('ENGLISH'),
  };

  const mockAppointmentsService = {
    createBookingTransaction: jest.fn(),
  };

  const mockRecoveryService = {
    getAlternativeSlots: jest.fn(),
    rescheduleAppointment: jest.fn(),
  };

  const mockWaitingListService = {
    addToWaitingList: jest.fn(),
    removeFromWaitingList: jest.fn(),
    getWaitingList: jest.fn(),
    promoteWaitlistEntry: jest.fn(),
    checkAndNotifyWaitlistCandidates: jest.fn(),
    processExpiredHolds: jest.fn(),
    confirmWaitlistHold: jest.fn(),
  };

  const mockPrismaService = {
    salon: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    staff: {
      findFirst: jest.fn(),
    },
    message: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    conversation: {
      findFirst: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
    reviewCampaign: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    voiceNote: {
      create: jest.fn(),
    },
    logSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: AiService, useValue: mockAiService },
        { provide: AppointmentsService, useValue: mockAppointmentsService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RecoveryService, useValue: mockRecoveryService },
        { provide: WaitingListService, useValue: mockWaitingListService },
        { provide: WhatsappGatewayService, useValue: mockGatewayService },
      ],
    }).compile();

    controller = module.get<WhatsappController>(WhatsappController);
    whatsappService = module.get<WhatsappService>(WhatsappService);
    aiService = module.get<AiService>(AiService);
    appointmentsService = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService);
    recoveryService = module.get<RecoveryService>(RecoveryService);
    waitingListService = module.get<WaitingListService>(WaitingListService);

    mockPrismaService.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
    });
    mockPrismaService.reviewCampaign.findFirst.mockResolvedValue(null);

    jest.clearAllMocks();
    mockPrismaService.conversation.findFirst.mockResolvedValue(null);
    mockAiService.detectLanguage.mockResolvedValue('ENGLISH');
  });

  describe('verifyWebhook', () => {
    it('should return challenge with 200 OK when tokens match', () => {
      const mockReq = {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'salonflow_verify_token',
          'hub.challenge': 'my_challenge_code',
        },
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      controller.verifyWebhook(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.send).toHaveBeenCalledWith('my_challenge_code');
    });

    it('should return 403 Forbidden when tokens do not match', () => {
      const mockReq = {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
        },
      } as any;

      const mockRes = {
        sendStatus: jest.fn(),
      } as any;

      controller.verifyWebhook(mockReq, mockRes);
      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });
  });

  describe('handleIncomingMessage', () => {
    let mockReq: express.Request;
    let mockRes: express.Response;

    beforeEach(() => {
      mockReq = {} as any;
      mockRes = {
        sendStatus: jest.fn(),
      } as any;

      mockPrismaService.salon.findFirst.mockResolvedValue({
        id: 'salon-1',
        name: 'Elegance Salon',
      });

      mockWhatsappService.saveIncomingMessage.mockResolvedValue({
        customer: { id: 'cust-1', name: 'Devender' },
        conversation: { id: 'conv-1' },
      });
    });

    it('should reject requests with 401 Unauthorized if appSecret is set but signature is missing', async () => {
      controller['appSecret'] = 'my_test_secret';
      await controller.handleIncomingMessage(
        { hello: 'world' },
        '',
        mockReq,
        mockRes,
      );
      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('should reject requests with 401 Unauthorized if signature is invalid', async () => {
      controller['appSecret'] = 'my_test_secret';
      await controller.handleIncomingMessage(
        { hello: 'world' },
        'sha256=invalid_sig',
        mockReq,
        mockRes,
      );
      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('should allow request if signature matches the calculated HMAC', async () => {
      controller['appSecret'] = 'my_test_secret';
      const body = { hello: 'world' };
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', 'my_test_secret')
        .update(JSON.stringify(body))
        .digest('hex')}`;

      mockWhatsappService.parseMessage.mockReturnValue(null);

      await controller.handleIncomingMessage(
        body,
        expectedSignature,
        mockReq,
        mockRes,
      );
      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should acknowledge webhook immediately and do nothing if message cannot be parsed', async () => {
      mockWhatsappService.parseMessage.mockReturnValue(null);

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);
      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockWhatsappService.saveIncomingMessage).not.toHaveBeenCalled();
    });

    it('should generate FAQ reply when intent is classified as FAQ', async () => {
      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        text: 'What are your hours?',
      });

      mockAiService.determineIntent.mockResolvedValue('FAQ');
      mockAiService.generateResponse.mockResolvedValue(
        'We are open 9am to 9pm daily.',
      );

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);

      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockAiService.determineIntent).toHaveBeenCalledWith(
        'What are your hours?',
      );
      expect(mockAiService.generateResponse).toHaveBeenCalledWith(
        'conv-1',
        'salon-1',
        expect.objectContaining({
          intent: 'FAQ',
          status: 'INFO',
        }),
      );
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919876543210',
        'We are open 9am to 9pm daily.',
        'conv-1',
      );
    });

    it('should respond with a booking link when intent is BOOKING', async () => {
      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        text: 'Book a premium haircut tomorrow at 3 PM',
      });

      mockAiService.determineIntent.mockResolvedValue('BOOKING');

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);

      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919876543210',
        expect.stringContaining('booking link'),
        'conv-1',
      );
    });

    it('should respond with a Hinglish booking link when language is HINGLISH', async () => {
      mockAiService.detectLanguage.mockResolvedValue('HINGLISH');
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        language: 'HINGLISH',
        salonId: 'salon-1',
      });

      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        text: 'appointment link',
      });

      mockAiService.determineIntent.mockResolvedValue('BOOKING');

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919876543210',
        expect.stringContaining('click karein'),
        'conv-1',
      );
    });

    it('should respond with a Hindi booking link when language is HINDI', async () => {
      mockAiService.detectLanguage.mockResolvedValue('HINDI');
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        language: 'HINDI',
        salonId: 'salon-1',
      });

      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        text: 'book karein',
      });

      mockAiService.determineIntent.mockResolvedValue('BOOKING');

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919876543210',
        expect.stringContaining('नमस्ते! अपॉइंटमेंट बुक करने के लिए कृपया नीचे दिए गए लिंक पर जाएँ'),
        'conv-1',
      );
    });

    it('should deduplicate incoming webhook requests with the same message ID', async () => {
      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        text: 'Duplicate test',
        messageId: 'duplicate-id-123',
      });

      mockAiService.determineIntent.mockResolvedValue('OTHER');
      mockAiService.generateResponse.mockResolvedValue('Response text');

      // First webhook hit
      await controller.handleIncomingMessage({}, '', mockReq, mockRes);
      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      // Second webhook hit (duplicate ID)
      await controller.handleIncomingMessage({}, '', mockReq, mockRes);
      expect(mockRes.sendStatus).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockWhatsappService.sendMessage).not.toHaveBeenCalled();
    });

    it('should transition to human takeover and silence bot after 5 non-booking messages', async () => {
      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        text: 'Non-booking ping',
        messageId: 'msg-unique-id',
      });

      mockAiService.determineIntent.mockResolvedValue('OTHER');
      mockAiService.localDetermineIntent = jest.fn().mockReturnValue('OTHER');
      mockAiService.generateResponse.mockResolvedValue('We have reached our message limit for today.');

      // Mock 5 inbound messages today
      mockPrismaService.message.findMany.mockResolvedValue([
        { content: 'Ping 1', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 2', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 3', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 4', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 5', direction: 'INBOUND', timestamp: new Date() },
      ]);

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919876543210',
        expect.stringContaining('limit'),
        'conv-1',
      );
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'HUMAN_TAKEOVER_REQUESTED',
          }),
        }),
      );
    });

    it('should silence response if message cap (>5 non-booking pings) is exceeded', async () => {
      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        text: 'Another ping',
        messageId: 'msg-unique-id-6',
      });

      mockAiService.determineIntent.mockResolvedValue('OTHER');
      mockAiService.localDetermineIntent = jest.fn().mockReturnValue('OTHER');

      // Mock 6 inbound messages today
      mockPrismaService.message.findMany.mockResolvedValue([
        { content: 'Ping 1', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 2', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 3', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 4', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 5', direction: 'INBOUND', timestamp: new Date() },
        { content: 'Ping 6', direction: 'INBOUND', timestamp: new Date() },
      ]);

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);

      expect(mockWhatsappService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject audio transcription and return limit error message if audio is too long', async () => {
      mockWhatsappService.parseMessage.mockReturnValue({
        fromPhone: '+919876543210',
        customerName: 'Devender',
        audio: { id: 'audio-id', mimeType: 'audio/ogg' },
        messageId: 'msg-audio-id',
      });

      mockAiService.transcribeAudio = jest.fn().mockRejectedValue(new Error('AUDIO_TOO_LONG'));

      await controller.handleIncomingMessage({}, '', mockReq, mockRes);

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919876543210',
        expect.stringContaining('too long'),
        'conv-1',
      );
    });
  });
});
