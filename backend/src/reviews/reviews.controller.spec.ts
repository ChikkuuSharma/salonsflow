import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';
import { UnauthorizedException } from '@nestjs/common';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    reviewCampaign: {
      findMany: jest.fn(),
    },
  };

  const mockReviewsService = {
    resolveCampaign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ReviewsService, useValue: mockReviewsService },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getCampaigns', () => {
    it('should return review campaigns list using salonId from request user context', async () => {
      const mockReq = {
        user: {
          salonId: 'salon_123',
        },
      };

      const mockCampaigns = [
        {
          id: 'camp_1',
          customer: { name: 'A' },
          appointment: { service: { name: 'S' } },
        },
      ];
      mockPrismaService.reviewCampaign.findMany.mockResolvedValue(
        mockCampaigns,
      );

      const result = await controller.getCampaigns(mockReq);

      expect(mockPrismaService.reviewCampaign.findMany).toHaveBeenCalledWith({
        where: { salonId: 'salon_123' },
        include: {
          customer: true,
          appointment: {
            include: {
              service: true,
              staff: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(mockCampaigns);
    });

    it('should fall back to find user in DB if salonId is not present in request context', async () => {
      const mockReq = {
        user: {
          sub: 'clerk_123',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        salonId: 'salon_db_123',
      });
      mockPrismaService.reviewCampaign.findMany.mockResolvedValue([]);

      await controller.getCampaigns(mockReq);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_123' },
      });
      expect(mockPrismaService.reviewCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { salonId: 'salon_db_123' } }),
      );
    });

    it('should throw UnauthorizedException if fallback user cannot be resolved', async () => {
      const mockReq = {
        user: {
          sub: 'clerk_123',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.getCampaigns(mockReq)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
