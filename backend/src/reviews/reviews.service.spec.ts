import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AiService } from '../ai/ai.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaService;
  let whatsappService: WhatsappService;
  let aiService: AiService;

  const mockPrismaService = {
    salon: {
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    reviewCampaign: {
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
  };

  const mockWhatsappService = {
    sendMessage: jest.fn(),
  };

  const mockAiService = {
    generateReviewRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);
    whatsappService = module.get<WhatsappService>(WhatsappService);
    aiService = module.get<AiService>(AiService);

    jest.clearAllMocks();
  });

  describe('scanAndSendReviewRequests', () => {
    it('should skip salons with no googleReviewLink', async () => {
      mockPrismaService.salon.findMany.mockResolvedValue([
        { id: 'salon_1', googleReviewLink: null },
      ]);

      await service.scanAndSendReviewRequests();

      expect(mockPrismaService.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should generate campaign and dispatch messages for completed appointments past delay', async () => {
      const mockSalon = {
        id: 'salon_1',
        googleReviewLink: 'http://review.link',
        name: 'Best Salon',
        reviewDelayMins: 60,
      };
      mockPrismaService.salon.findMany.mockResolvedValue([mockSalon]);

      const mockAppointment = {
        id: 'appt_1',
        salonId: 'salon_1',
        customerId: 'cust_1',
        status: 'COMPLETED',
        customer: { id: 'cust_1', name: 'John Doe', phone: '+919999999999' },
        service: { id: 'srv_1', name: 'Haircut' },
      };
      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointment,
      ]);

      const mockCampaign = { id: 'camp_1' };
      mockPrismaService.reviewCampaign.create.mockResolvedValue(mockCampaign);

      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv_1',
        language: 'ENGLISH',
      });

      await service.scanAndSendReviewRequests();

      expect(mockPrismaService.reviewCampaign.create).toHaveBeenCalledWith({
        data: {
          salonId: 'salon_1',
          customerId: 'cust_1',
          appointmentId: 'appt_1',
          completed: false,
        },
      });
      const expectedMessage = `Hi John Doe 👋\n\nThank you for visiting Best Salon.\nHow was your experience with your "Haircut" today?\n\nPlease rate us by replying with:\n⭐ 1 (Poor)\n⭐ 2 (Fair)\n⭐ 3 (Good)\n⭐ 4 (Very Good)\n⭐ 5 (Excellent)`;
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919999999999',
        expectedMessage,
        'conv_1',
        'salon_1',
      );
      expect(mockPrismaService.reviewCampaign.update).toHaveBeenCalledWith({
        where: { id: 'camp_1' },
        data: {
          sentAt: expect.any(Date),
          message: expectedMessage,
        },
      });
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should calculate and return review metrics correctly', async () => {
      mockPrismaService.reviewCampaign.count
        .mockResolvedValueOnce(10) // sentCount
        .mockResolvedValueOnce(5); // clickCount

      const metrics = await service.getMetrics('salon_1');

      expect(metrics).toEqual({
        reviewRequestsSent: 10,
        reviewLinkClicks: 5,
        estimatedReviewsGenerated: 2, // 5 * 0.4 rounded to 2
      });
    });
  });
});
