import { Test, TestingModule } from '@nestjs/testing';
import { SalonsController } from './salons.controller';
import { SalonsService } from './salons.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

describe('SalonsController', () => {
  let controller: SalonsController;
  let service: SalonsService;
  let prisma: PrismaService;

  const mockSalonsService = {
    getSalonWithSubscription: jest.fn(),
    updateSalon: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalonsController],
      providers: [
        {
          provide: SalonsService,
          useValue: mockSalonsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<SalonsController>(SalonsController);
    service = module.get<SalonsService>(SalonsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('should return salon profile with subscription details using salonId from request user context', async () => {
      const mockReq = {
        user: {
          salonId: 'salon_123',
        },
      };

      const mockSalon = {
        id: 'salon_123',
        name: 'Demo Salon',
        subscription: { plan: SubscriptionPlan.FREE },
      };
      mockSalonsService.getSalonWithSubscription.mockResolvedValue(mockSalon);

      const result = await controller.getMe(mockReq);

      expect(service.getSalonWithSubscription).toHaveBeenCalledWith(
        'salon_123',
      );
      expect(result).toEqual(mockSalon);
    });

    it('should fall back to fetch user from DB if req.user has no salonId', async () => {
      const mockReq = {
        user: {
          sub: 'clerk_123',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        salonId: 'salon_from_db',
      });
      mockSalonsService.getSalonWithSubscription.mockResolvedValue({
        id: 'salon_from_db',
      });

      await controller.getMe(mockReq);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_123' },
      });
      expect(service.getSalonWithSubscription).toHaveBeenCalledWith(
        'salon_from_db',
      );
    });

    it('should throw UnauthorizedException if fallback user cannot be found', async () => {
      const mockReq = {
        user: {
          sub: 'clerk_123',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.getMe(mockReq)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateMe', () => {
    const mockReq = {
      user: {
        salonId: 'salon_123',
      },
    };

    it('should allow modifying business name and address and new WhatsApp fields even on FREE subscription plan', async () => {
      mockSalonsService.updateSalon.mockResolvedValue({
        id: 'salon_123',
        name: 'New Name',
      });

      const result = await controller.updateMe(
        mockReq,
        'New Name',
        'New Address',
        undefined,
        undefined,
        undefined,
        undefined,
        'phone_id_123',
        'token_123',
        'waba_id_123',
        undefined,
        undefined,
        true,
      );

      expect(service.updateSalon).toHaveBeenCalledWith('salon_123', {
        name: 'New Name',
        address: 'New Address',
        aiPrompt: undefined,
        googleReviewLink: undefined,
        reviewDelayMins: undefined,
        rebookingAutoSend: undefined,
        whatsappPhoneNumberId: 'phone_id_123',
        whatsappAccessToken: 'token_123',
        whatsappBusinessAccountId: 'waba_id_123',
        isProfileComplete: true,
      });
      expect(result).toEqual({ id: 'salon_123', name: 'New Name' });
    });

    it('should block modifying aiPrompt if subscription plan is FREE', async () => {
      mockSalonsService.getSalonWithSubscription.mockResolvedValue({
        id: 'salon_123',
        subscription: {
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      await expect(
        controller.updateMe(
          mockReq,
          undefined,
          undefined,
          'New AI Personality Prompt',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(service.updateSalon).not.toHaveBeenCalled();
    });

    it('should block modifying aiPrompt if subscription is inactive or canceled', async () => {
      mockSalonsService.getSalonWithSubscription.mockResolvedValue({
        id: 'salon_123',
        subscription: {
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.CANCELED,
        },
      });

      await expect(
        controller.updateMe(
          mockReq,
          undefined,
          undefined,
          'New AI Personality Prompt',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow modifying aiPrompt if subscription is BASIC and ACTIVE', async () => {
      mockSalonsService.getSalonWithSubscription.mockResolvedValue({
        id: 'salon_123',
        subscription: {
          plan: SubscriptionPlan.BASIC,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      mockSalonsService.updateSalon.mockResolvedValue({
        id: 'salon_123',
        aiPrompt: 'Custom Prompt',
      });

      await controller.updateMe(mockReq, undefined, undefined, 'Custom Prompt');

      expect(service.updateSalon).toHaveBeenCalledWith('salon_123', expect.objectContaining({
        aiPrompt: 'Custom Prompt',
      }));
    });

    it('should allow modifying aiPrompt if subscription is PRO and ACTIVE', async () => {
      mockSalonsService.getSalonWithSubscription.mockResolvedValue({
        id: 'salon_123',
        subscription: {
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      mockSalonsService.updateSalon.mockResolvedValue({
        id: 'salon_123',
        aiPrompt: 'Custom Prompt',
      });

      await controller.updateMe(mockReq, undefined, undefined, 'Custom Prompt');

      expect(service.updateSalon).toHaveBeenCalledWith('salon_123', expect.objectContaining({
        aiPrompt: 'Custom Prompt',
      }));
    });
  });
});
