import { Test, TestingModule } from '@nestjs/testing';
import { MissedCallController } from './missed-call.controller';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { HttpStatus } from '@nestjs/common';
import * as express from 'express';

describe('MissedCallController', () => {
  let controller: MissedCallController;
  let prisma: PrismaService;
  let whatsappService: WhatsappService;

  const mockPrismaService = {
    salon: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    missedCall: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      upsert: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    logSecurityEvent: jest.fn(),
  };

  const mockWhatsappService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissedCallController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: mockWhatsappService },
      ],
    }).compile();

    controller = module.get<MissedCallController>(MissedCallController);
    prisma = module.get<PrismaService>(PrismaService);
    whatsappService = module.get<WhatsappService>(WhatsappService);

    jest.clearAllMocks();
  });

  describe('handleMissedCall', () => {
    it('should process missed call, save to DB, and send welcome message via WhatsApp', async () => {
      const mockSalon = { id: 'salon_1', name: 'Cool Salon' };
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.missedCall.create.mockResolvedValue({ id: 'mc_1' });
      mockPrismaService.customer.upsert.mockResolvedValue({ id: 'cust_1' });
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv_1',
      });

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as express.Response;

      const mockReq = {} as express.Request;

      await controller.handleMissedCall(
        { phone: '+919999999999', salonId: 'salon_1' },
        '',
        mockReq,
        mockRes,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
      expect(mockPrismaService.missedCall.create).toHaveBeenCalledWith({
        data: {
          salonId: 'salon_1',
          phone: '+919999999999',
          source: 'TELCO',
          status: 'PENDING',
        },
      });
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919999999999',
        expect.stringContaining('missed call'),
        'conv_1',
        'salon_1',
      );
    });
  });

  describe('getMissedCalls', () => {
    it('should return list of missed calls for the salon', async () => {
      mockPrismaService.missedCall.findMany.mockResolvedValue([{ id: 'mc_1' }]);

      const result = await controller.getMissedCalls('salon_123');

      expect(mockPrismaService.missedCall.findMany).toHaveBeenCalledWith({
        where: { salonId: 'salon_123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ id: 'mc_1' }]);
    });
  });
});
