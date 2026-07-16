import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let prisma: PrismaService;

  const mockPrismaService = {
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
    it('should return review campaigns list using salonId', async () => {
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

      const result = await controller.getCampaigns('salon_123');

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
  });
});
