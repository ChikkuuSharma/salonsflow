import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  UnauthorizedException,
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
    user: {
      findUnique: jest.fn(),
    },
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
    const mockReq = {
      user: { salonId: 'salon-123' },
    };

    it('should throw ForbiddenException if subscription plan is FREE', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      });

      await expect(
        controller.create(mockReq, 'June Promo', 'Content', 'all_customers'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockCampaignsService.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if subscription is inactive or canceled', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.CANCELED,
      });

      await expect(
        controller.create(mockReq, 'June Promo', 'Content', 'all_customers'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if name is missing or empty', async () => {
      await expect(
        controller.create(mockReq, '', 'Promo content', 'inactive_30_days'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if content is missing or empty', async () => {
      await expect(
        controller.create(mockReq, 'Name', '  ', 'inactive_30_days'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if targetSegment is invalid', async () => {
      await expect(
        controller.create(mockReq, 'Name', 'Content', 'invalid_segment'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call campaignsService.create when payload is valid and subscription is active premium', async () => {
      mockCampaignsService.create.mockResolvedValue({ id: 'camp-1' });

      const result = await controller.create(
        mockReq,
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

    it('should fallback to database user lookup if salonId is missing from token claims', async () => {
      const mockReqNoClaims = {
        user: { sub: 'clerk-user-123' },
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        salonId: 'salon-db-456',
      });
      mockCampaignsService.create.mockResolvedValue({ id: 'camp-1' });

      await controller.create(
        mockReqNoClaims,
        'June Promo',
        'Content',
        'all_customers',
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk-user-123' },
      });
      expect(mockCampaignsService.create).toHaveBeenCalledWith(
        'salon-db-456',
        'June Promo',
        'Content',
        'all_customers',
      );
    });

    it('should throw UnauthorizedException if database user lookup fails during fallback', async () => {
      const mockReqNoClaims = {
        user: { sub: 'non-existent' },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        controller.create(
          mockReqNoClaims,
          'June Promo',
          'Content',
          'all_customers',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findAll', () => {
    it('should fetch all campaigns for the active salonId', async () => {
      const mockReq = {
        user: { salonId: 'salon-123' },
      };
      mockCampaignsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockReq);

      expect(mockCampaignsService.findAll).toHaveBeenCalledWith('salon-123');
      expect(result).toEqual([]);
    });
  });
});
