import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

describe('CampaignsController', () => {
  let controller: CampaignsController;
  let service: CampaignsService;
  let prisma: PrismaService;

  const mockCampaignsService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const mockPrismaService = {
    subscription: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignsController],
      providers: [
        { provide: CampaignsService, useValue: mockCampaignsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<CampaignsController>(CampaignsController);
    service = module.get<CampaignsService>(CampaignsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();

    // Default mock response: active PRO subscription to keep baseline tests passing
    mockPrismaService.subscription.findUnique.mockResolvedValue({
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
    });
  });

  describe('create', () => {
    it('should throw ForbiddenException if subscription plan is FREE', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      });

      await expect(
        controller.create('salon-123', 'June Promo', 'Content', 'all_customers'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockCampaignsService.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if subscription is inactive or canceled', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.CANCELED,
      });

      await expect(
        controller.create('salon-123', 'June Promo', 'Content', 'all_customers'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if name is missing or empty', async () => {
      await expect(
        controller.create('salon-123', '', 'Promo content', 'inactive_30_days'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if content is missing or empty', async () => {
      await expect(
        controller.create('salon-123', 'Name', '  ', 'inactive_30_days'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if targetSegment is invalid', async () => {
      await expect(
        controller.create('salon-123', 'Name', 'Content', 'invalid_segment'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call campaignsService.create when payload is valid and subscription is active premium', async () => {
      mockCampaignsService.create.mockResolvedValue({ id: 'camp-1' });

      const result = await controller.create(
        'salon-123',
        'June Promo',
        'Check out our new haircut deals!',
        'frequent_visitors',
      );

      expect(mockCampaignsService.create).toHaveBeenCalledWith(
        'salon-123',
        'June Promo',
        'Check out our new haircut deals!',
        'frequent_visitors',
      );
      expect(result).toEqual({ id: 'camp-1' });
    });
  });

  describe('findAll', () => {
    it('should fetch all campaigns for the active salonId', async () => {
      mockCampaignsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('salon-123');

      expect(mockCampaignsService.findAll).toHaveBeenCalledWith('salon-123');
      expect(result).toEqual([]);
    });
  });
});
