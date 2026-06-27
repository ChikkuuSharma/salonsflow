import { Test, TestingModule } from '@nestjs/testing';
import { SalonsService } from './salons.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

describe('SalonsService', () => {
  let service: SalonsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    salon: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SalonsService>(SalonsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getSalonWithSubscription', () => {
    it('should return salon profile with subscription from DB if it exists', async () => {
      const mockSalon = {
        id: 'salon_123',
        name: 'Demo Salon',
        subscription: {
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(),
        },
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalon);

      const result = await service.getSalonWithSubscription('salon_123');

      expect(mockPrismaService.salon.findUnique).toHaveBeenCalledWith({
        where: { id: 'salon_123' },
        include: { subscription: true },
      });
      expect(result).toEqual(mockSalon);
    });

    it('should return default FREE subscription if subscription record is missing in DB', async () => {
      const mockSalonWithoutSub = {
        id: 'salon_123',
        name: 'Demo Salon',
        subscription: null,
      };

      mockPrismaService.salon.findUnique.mockResolvedValue(mockSalonWithoutSub);

      const result = await service.getSalonWithSubscription('salon_123');

      expect(result).toEqual({
        id: 'salon_123',
        name: 'Demo Salon',
        subscription: {
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: null,
        },
      });
    });

    it('should return null if salon does not exist', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue(null);

      const result = await service.getSalonWithSubscription('non_existent');

      expect(result).toBeNull();
    });
  });

  describe('updateSalon', () => {
    it('should update salon properties via Prisma and include subscription', async () => {
      const updateData = { name: 'Updated Name', address: 'Updated Address' };
      const mockUpdatedSalon = {
        id: 'salon_123',
        ...updateData,
        subscription: null,
      };

      mockPrismaService.salon.update.mockResolvedValue(mockUpdatedSalon);

      const result = await service.updateSalon('salon_123', updateData);

      expect(mockPrismaService.salon.update).toHaveBeenCalledWith({
        where: { id: 'salon_123' },
        data: updateData,
        include: { subscription: true },
      });
      expect(result).toEqual(mockUpdatedSalon);
    });
  });
});
