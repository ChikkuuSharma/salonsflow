import { Test, TestingModule } from '@nestjs/testing';
import { RebookingsController } from './rebookings.controller';
import { RebookingsService } from './rebookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('RebookingsController', () => {
  let controller: RebookingsController;
  let service: RebookingsService;
  let prisma: PrismaService;

  const mockRebookingsService = {
    upsertRule: jest.fn(),
    getRules: jest.fn(),
    getRecommendations: jest.fn(),
    approveRecommendation: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RebookingsController],
      providers: [
        { provide: RebookingsService, useValue: mockRebookingsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<RebookingsController>(RebookingsController);
    service = module.get<RebookingsService>(RebookingsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  const mockReq = {
    user: {
      salonId: 'salon_123',
    },
  };

  describe('upsertRule', () => {
    it('should throw BadRequestException if serviceId is missing', async () => {
      await expect(controller.upsertRule(mockReq, '', 30)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if intervalDays is invalid', async () => {
      await expect(controller.upsertRule(mockReq, 'srv_1', -5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call service upsertRule if input is valid', async () => {
      mockRebookingsService.upsertRule.mockResolvedValue({ id: 'rule_1' });

      const result = await controller.upsertRule(mockReq, 'srv_1', 45);

      expect(service.upsertRule).toHaveBeenCalledWith('salon_123', 'srv_1', 45);
      expect(result).toEqual({ id: 'rule_1' });
    });
  });

  describe('getRules', () => {
    it('should return service rules list', async () => {
      mockRebookingsService.getRules.mockResolvedValue([{ id: 'rule_1' }]);

      const result = await controller.getRules(mockReq);

      expect(service.getRules).toHaveBeenCalledWith('salon_123');
      expect(result).toEqual([{ id: 'rule_1' }]);
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations list', async () => {
      mockRebookingsService.getRecommendations.mockResolvedValue([
        { id: 'rec_1' },
      ]);

      const result = await controller.getRecommendations(mockReq);

      expect(service.getRecommendations).toHaveBeenCalledWith('salon_123');
      expect(result).toEqual([{ id: 'rec_1' }]);
    });
  });

  describe('approveRecommendation', () => {
    it('should call service approveRecommendation', async () => {
      mockRebookingsService.approveRecommendation.mockResolvedValue({
        success: true,
      });

      const result = await controller.approveRecommendation(mockReq, 'rec_1');

      expect(service.approveRecommendation).toHaveBeenCalledWith(
        'salon_123',
        'rec_1',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getServices', () => {
    it('should call prisma.service.findMany', async () => {
      mockPrismaService.service.findMany.mockResolvedValue([{ id: 'srv_1' }]);

      const result = await controller.getServices(mockReq);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { salonId: 'salon_123' },
      });
      expect(result).toEqual([{ id: 'srv_1' }]);
    });
  });

  describe('updateService', () => {
    it('should throw BadRequestException if durationMins is invalid', async () => {
      await expect(controller.updateService(mockReq, 'srv_1', -5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully update service duration if valid', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue({ id: 'srv_1', salonId: 'salon_123' });
      mockPrismaService.service.update.mockResolvedValue({ id: 'srv_1', durationMins: 45 });

      const result = await controller.updateService(mockReq, 'srv_1', 45);
      expect(result).toEqual({ id: 'srv_1', durationMins: 45 });
      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 'srv_1' },
        data: { durationMins: 45 },
      });
    });
  });
});
