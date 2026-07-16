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
    it('should return salon profile with subscription details using salonId', async () => {
      const mockSalon = {
        id: 'salon_123',
        name: 'Demo Salon',
        subscription: { plan: SubscriptionPlan.FREE },
      };
      mockSalonsService.getSalonWithSubscription.mockResolvedValue(mockSalon);

      const result = await controller.getMe('salon_123');

      expect(service.getSalonWithSubscription).toHaveBeenCalledWith(
        'salon_123',
      );
      expect(result).toEqual(mockSalon);
    });
  });

  describe('getMeUser', () => {
    it('should return user profile using database userId', async () => {
      const mockUser = {
        id: 'user_123',
        name: 'Devender Sharma',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await controller.getMeUser('user_123');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if database user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.getMeUser('user_123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateMe', () => {
    it('should allow modifying business name and address and new WhatsApp fields even on FREE subscription plan', async () => {
      mockSalonsService.updateSalon.mockResolvedValue({
        id: 'salon_123',
        name: 'New Name',
      });

      const result = await controller.updateMe(
        'salon_123',
        {
          name: 'New Name',
          address: 'New Address',
          whatsappPhoneNumberId: 'phone_id_123',
          whatsappAccessToken: 'token_123',
          whatsappBusinessAccountId: 'waba_id_123',
          isProfileComplete: true,
        },
      );

      expect(service.updateSalon).toHaveBeenCalledWith('salon_123', {
        name: 'New Name',
        address: 'New Address',
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
          'salon_123',
          {
            aiPrompt: 'New AI Personality Prompt',
          },
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
          'salon_123',
          {
            aiPrompt: 'New AI Personality Prompt',
          },
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

      await controller.updateMe('salon_123', { aiPrompt: 'Custom Prompt' });

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

      await controller.updateMe('salon_123', { aiPrompt: 'Custom Prompt' });

      expect(service.updateSalon).toHaveBeenCalledWith('salon_123', expect.objectContaining({
        aiPrompt: 'Custom Prompt',
      }));
    });
  });
});
