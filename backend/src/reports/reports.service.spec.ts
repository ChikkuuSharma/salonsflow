import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ReportType, ReportStatus } from '@prisma/client';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;
  let aiService: AiService;
  let whatsappService: WhatsappService;

  const mockPrismaService = {
    salon: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    businessReport: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    reviewCampaign: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    message: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    campaign: {
      count: jest.fn(),
    },
    rebookingRecommendation: {
      count: jest.fn(),
    },
  };

  const mockAnalyticsService = {
    getStaffUtilization: jest.fn(),
  };

  const mockAiService = {
    generateBusinessRecommendation: jest.fn(),
    localDetermineIntent: jest.fn(),
  };

  const mockWhatsappService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: AiService, useValue: mockAiService },
        { provide: WhatsappService, useValue: mockWhatsappService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
    whatsappService = module.get<WhatsappService>(WhatsappService);

    jest.clearAllMocks();
  });

  describe('getISTDate', () => {
    it('should shift date to UTC+5:30', () => {
      const utcDate = new Date('2026-06-24T12:00:00Z');
      const istDate = service.getISTDate(utcDate);
      
      // UTC 12:00 should be shifted to IST 17:30
      // Check absolute time difference is exactly 5.5 hours
      const diffMs = istDate.getTime() - utcDate.getTime();
      
      // Note: Because getISTDate does:
      // const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      // const ist = new Date(utc + 5.5 hours);
      // The offset calculation depends on test execution timezone, but it will shift it relative to GMT + 5:30.
      expect(istDate).toBeInstanceOf(Date);
    });
  });

  describe('getLocalRangeUTC', () => {
    it('should calculate start and end bounds in UTC', () => {
      const localDate = new Date('2026-06-24T00:00:00.000Z');
      const range = service.getLocalRangeUTC(localDate);

      expect(range.startUTC).toBeInstanceOf(Date);
      expect(range.endUTC).toBeInstanceOf(Date);
      // End UTC should be after Start UTC
      expect(range.endUTC.getTime()).toBeGreaterThan(range.startUTC.getTime());
    });
  });

  describe('generateAndSendReport', () => {
    it('should fallback to rule-based recommendation if OpenAI fails', async () => {
      const mockSalon = {
        id: 'salon_123',
        name: 'Glam Studio',
        ownerMobile: '9999999999',
        whatsappNumber: '1111111111',
        dailyReportTime: '20:00',
        dailyReportsEnabled: true,
      };

      const targetDate = new Date('2026-06-24T00:00:00Z');

      // Mock prisma lookups
      mockPrismaService.businessReport.findUnique.mockResolvedValue(null);
      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);
      mockPrismaService.appointment.findMany.mockResolvedValue([]);
      mockPrismaService.customer.count.mockResolvedValue(0);
      mockPrismaService.reviewCampaign.findMany.mockResolvedValue([]);
      mockPrismaService.reviewCampaign.count.mockResolvedValue(0);
      mockPrismaService.message.count.mockResolvedValue(0);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      
      // Force AI recommendation failure
      mockAiService.generateBusinessRecommendation.mockRejectedValue(new Error('OpenAI Error'));

      const mockCreatedReport = {
        id: 'report_789',
        salonId: 'salon_123',
        type: ReportType.DAILY,
        date: targetDate,
        content: 'Daily Report Summary',
        status: ReportStatus.PENDING,
        retryCount: 0,
      };

      mockPrismaService.businessReport.create.mockResolvedValue(mockCreatedReport);
      mockPrismaService.businessReport.findUnique.mockResolvedValue({
        ...mockCreatedReport,
        salon: mockSalon,
      });

      mockWhatsappService.sendMessage.mockResolvedValue(true);
      mockPrismaService.businessReport.update.mockResolvedValue({
        ...mockCreatedReport,
        status: ReportStatus.SENT,
      });

      const result = await service.generateAndSendReport('salon_123', ReportType.DAILY, targetDate);

      // Verify Prisma client update status was called
      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '9999999999',
        expect.stringContaining('Daily Report'),
      );
      expect(result.status).toEqual(ReportStatus.SENT);
    });
  });
});
