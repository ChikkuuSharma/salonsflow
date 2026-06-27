import { Test, TestingModule } from '@nestjs/testing';
import { RebookingsService } from './rebookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AiService } from '../ai/ai.service';
import { NotFoundException } from '@nestjs/common';

describe('RebookingsService', () => {
  let service: RebookingsService;
  let prisma: PrismaService;
  let whatsappService: WhatsappService;
  let aiService: AiService;

  const mockPrismaService = {
    salon: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    rebookingRule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    rebookingRecommendation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
  };

  const mockWhatsappService = {
    sendMessage: jest.fn(),
  };

  const mockAiService = {
    generateRebookingMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RebookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<RebookingsService>(RebookingsService);
    prisma = module.get<PrismaService>(PrismaService);
    whatsappService = module.get<WhatsappService>(WhatsappService);
    aiService = module.get<AiService>(AiService);

    jest.clearAllMocks();
  });

  describe('upsertRule', () => {
    it('should throw NotFoundException if service does not belong to the salon', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertRule('salon_1', 'service_1', 30),
      ).rejects.toThrow(NotFoundException);
    });

    it('should upsert the rule if service exists', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'service_1',
        salonId: 'salon_1',
      });
      mockPrismaService.rebookingRule.upsert.mockResolvedValue({
        id: 'rule_1',
      });

      const result = await service.upsertRule('salon_1', 'service_1', 30);

      expect(mockPrismaService.rebookingRule.upsert).toHaveBeenCalledWith({
        where: { serviceId: 'service_1' },
        update: { intervalDays: 30 },
        create: {
          salonId: 'salon_1',
          serviceId: 'service_1',
          intervalDays: 30,
        },
      });
      expect(result).toEqual({ id: 'rule_1' });
    });
  });

  describe('processRebookingEngine', () => {
    it('should generate recommendations and send them if auto-send is enabled', async () => {
      // 1. Generate recommendation
      const mockAppointment = {
        id: 'appt_1',
        salonId: 'salon_1',
        customerId: 'cust_1',
        serviceId: 'service_1',
        endTime: new Date(),
        createdAt: new Date(),
        service: {
          rebookingRule: { intervalDays: 30 },
        },
      };
      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointment,
      ]);
      mockPrismaService.rebookingRecommendation.findFirst.mockResolvedValue(
        null,
      );
      mockPrismaService.rebookingRecommendation.create.mockResolvedValue({
        id: 'rec_1',
      });

      // 2. Dispatch recommendation
      const mockSalon = {
        id: 'salon_1',
        name: 'Cool Salon',
        rebookingAutoSend: true,
      };
      mockPrismaService.salon.findMany.mockResolvedValue([mockSalon]);
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);

      const mockDueRec = {
        id: 'rec_2',
        salonId: 'salon_1',
        customerId: 'cust_1',
        serviceId: 'service_1',
        dueDate: new Date(),
        customer: { name: 'Alice', phone: '+918888888888' },
        service: { name: 'Facial' },
      };
      mockPrismaService.rebookingRecommendation.findMany.mockResolvedValue([
        mockDueRec,
      ]);
      mockPrismaService.rebookingRule.findUnique.mockResolvedValue({
        intervalDays: 30,
      });
      mockAiService.generateRebookingMessage.mockResolvedValue(
        'Alice, it is time!',
      );
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv_1',
      });

      await service.processRebookingEngine();

      expect(
        mockPrismaService.rebookingRecommendation.create,
      ).toHaveBeenCalled();
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+918888888888',
        'Alice, it is time!',
        'conv_1',
        'salon_1',
      );
      expect(
        mockPrismaService.rebookingRecommendation.update,
      ).toHaveBeenCalledWith({
        where: { id: 'rec_2' },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date),
          message: 'Alice, it is time!',
        },
      });
    });
  });

  describe('approveRecommendation', () => {
    it('should throw NotFoundException if recommendation not found', async () => {
      mockPrismaService.rebookingRecommendation.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.approveRecommendation('salon_1', 'rec_1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send invitation immediately and return success', async () => {
      const mockRec = {
        id: 'rec_1',
        salonId: 'salon_1',
        customerId: 'cust_1',
        serviceId: 'service_1',
        customer: { name: 'Alice', phone: '+918888888888' },
        service: { name: 'Facial' },
      };
      mockPrismaService.rebookingRecommendation.findFirst.mockResolvedValue(
        mockRec,
      );
      mockPrismaService.salon.findUnique.mockResolvedValue({
        id: 'salon_1',
        name: 'Cool Salon',
      });
      mockPrismaService.rebookingRule.findUnique.mockResolvedValue({
        intervalDays: 30,
      });
      mockAiService.generateRebookingMessage.mockResolvedValue(
        'Alice, please rebook!',
      );
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv_1',
      });

      const result = await service.approveRecommendation('salon_1', 'rec_1');

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+918888888888',
        'Alice, please rebook!',
        'conv_1',
        'salon_1',
      );
      expect(result).toEqual({ success: true });
    });
  });
});
