import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebhookService } from './stripe-webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  let prisma: PrismaService;

  const mockPrismaService = {
    subscription: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StripeWebhookService>(StripeWebhookService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('handleSubscriptionCreatedOrUpdated', () => {
    const mockSubscription = {
      customer: 'cus_123',
      current_period_end: 1672531199, // 2022-12-31T23:59:59Z
      status: 'active',
      items: {
        data: [
          {
            price: { id: 'price_123_pro' },
          },
        ],
      },
      metadata: {
        salonId: 'salon_xyz',
      },
    };

    it('should upsert subscription successfully when salonId is provided in metadata', async () => {
      mockPrismaService.subscription.upsert.mockResolvedValue({
        id: 'sub_xyz',
      });

      await service.handleSubscriptionCreatedOrUpdated(mockSubscription);

      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith({
        where: { salonId: 'salon_xyz' },
        update: {
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: 'cus_123',
          currentPeriodEnd: new Date(
            mockSubscription.current_period_end * 1000,
          ),
        },
        create: {
          salonId: 'salon_xyz',
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: 'cus_123',
          currentPeriodEnd: new Date(
            mockSubscription.current_period_end * 1000,
          ),
        },
      });
    });

    it('should map price ID containing basic/pro/free correctly', async () => {
      mockPrismaService.subscription.upsert.mockResolvedValue({
        id: 'sub_xyz',
      });

      // Basic Plan
      const basicSubscription = {
        ...mockSubscription,
        items: { data: [{ price: { id: 'price_basic_plan' } }] },
      };
      await service.handleSubscriptionCreatedOrUpdated(basicSubscription);
      expect(mockPrismaService.subscription.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ plan: SubscriptionPlan.BASIC }),
        }),
      );

      // Free Plan
      const freeSubscription = {
        ...mockSubscription,
        items: { data: [{ price: { id: 'price_free_tier' } }] },
      };
      await service.handleSubscriptionCreatedOrUpdated(freeSubscription);
      expect(mockPrismaService.subscription.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ plan: SubscriptionPlan.FREE }),
        }),
      );
    });

    it('should map Stripe statuses to SubscriptionStatus enums correctly', async () => {
      mockPrismaService.subscription.upsert.mockResolvedValue({
        id: 'sub_xyz',
      });

      // trialing -> ACTIVE
      await service.handleSubscriptionCreatedOrUpdated({
        ...mockSubscription,
        status: 'trialing',
      });
      expect(mockPrismaService.subscription.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: SubscriptionStatus.ACTIVE,
          }),
        }),
      );

      // past_due -> GRACE_PERIOD
      await service.handleSubscriptionCreatedOrUpdated({
        ...mockSubscription,
        status: 'past_due',
      });
      expect(mockPrismaService.subscription.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: SubscriptionStatus.GRACE_PERIOD,
          }),
        }),
      );

      // canceled -> CANCELED
      await service.handleSubscriptionCreatedOrUpdated({
        ...mockSubscription,
        status: 'canceled',
      });
      expect(mockPrismaService.subscription.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: SubscriptionStatus.CANCELED,
          }),
        }),
      );

      // unpaid -> CANCELED
      await service.handleSubscriptionCreatedOrUpdated({
        ...mockSubscription,
        status: 'unpaid',
      });
      expect(mockPrismaService.subscription.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: SubscriptionStatus.CANCELED,
          }),
        }),
      );
    });

    it('should fall back to find salonId from database by stripeCustomerId if missing in metadata', async () => {
      const subWithoutMetadata = {
        ...mockSubscription,
        metadata: {},
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue({
        salonId: 'salon_resolved_from_db',
      });
      mockPrismaService.subscription.upsert.mockResolvedValue({
        id: 'sub_xyz',
      });

      await service.handleSubscriptionCreatedOrUpdated(subWithoutMetadata);

      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
      });
      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { salonId: 'salon_resolved_from_db' },
        }),
      );
    });

    it('should throw BadRequestException if salonId cannot be resolved', async () => {
      const subWithoutMetadata = {
        ...mockSubscription,
        metadata: {},
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      await expect(
        service.handleSubscriptionCreatedOrUpdated(subWithoutMetadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleSubscriptionDeleted', () => {
    const mockSubscription = {
      customer: 'cus_123',
      metadata: {
        salonId: 'salon_xyz',
      },
    };

    it('should set plan to FREE and status to CANCELED when deleted', async () => {
      mockPrismaService.subscription.upsert.mockResolvedValue({
        id: 'sub_xyz',
      });

      await service.handleSubscriptionDeleted(mockSubscription);

      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith({
        where: { salonId: 'salon_xyz' },
        update: {
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.CANCELED,
          currentPeriodEnd: null,
        },
        create: {
          salonId: 'salon_xyz',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.CANCELED,
          currentPeriodEnd: null,
        },
      });
    });

    it('should resolve salonId from DB if missing in metadata on deletion', async () => {
      const subWithoutMetadata = {
        customer: 'cus_123',
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue({
        salonId: 'salon_resolved_from_db',
      });
      mockPrismaService.subscription.upsert.mockResolvedValue({
        id: 'sub_xyz',
      });

      await service.handleSubscriptionDeleted(subWithoutMetadata);

      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
      });
      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { salonId: 'salon_resolved_from_db' },
        }),
      );
    });

    it('should log warning and exit early if salonId cannot be resolved on deletion', async () => {
      const subWithoutMetadata = {
        customer: 'cus_123',
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      await service.handleSubscriptionDeleted(subWithoutMetadata);

      expect(mockPrismaService.subscription.upsert).not.toHaveBeenCalled();
    });
  });
});
