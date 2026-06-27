import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;
  let prisma: PrismaService;
  let remindersService: RemindersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    salon: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
    voiceNote: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    lead: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockRemindersService = {
    runExpirationCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RemindersService, useValue: mockRemindersService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    prisma = module.get<PrismaService>(PrismaService);
    remindersService = module.get<RemindersService>(RemindersService);

    jest.clearAllMocks();
  });

  const superAdminReq = {
    user: {
      sub: 'clerk-admin-id',
    },
  };

  const normalUserReq = {
    user: {
      sub: 'clerk-user-id',
    },
  };

  describe('checkSuperAdmin', () => {
    it('should throw ForbiddenException if user is not a SUPER_ADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: Role.OWNER,
      });

      await expect(controller.getDashboardStats(normalUserReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should pass if user is a SUPER_ADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u-admin',
        role: Role.SUPER_ADMIN,
      });
      mockPrismaService.salon.findMany.mockResolvedValue([]);
      mockPrismaService.subscription.findMany.mockResolvedValue([]);
      mockPrismaService.appointment.count.mockResolvedValue(0);
      mockPrismaService.message.count.mockResolvedValue(0);

      const result = await controller.getDashboardStats(superAdminReq);
      expect(result.totalSalons).toBe(0);
    });
  });

  describe('getDashboardStats', () => {
    it('should return aggregated platform stats', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u-admin',
        role: Role.SUPER_ADMIN,
      });
      mockPrismaService.salon.findMany.mockResolvedValue([
        { id: 's-1', name: 'Salon A' },
        { id: 's-2', name: 'Salon B' },
      ]);
      mockPrismaService.subscription.findMany.mockResolvedValue([
        { salonId: 's-1', plan: SubscriptionPlan.BASIC, status: SubscriptionStatus.ACTIVE },
        { salonId: 's-2', plan: SubscriptionPlan.PRO, status: SubscriptionStatus.ACTIVE },
      ]);
      mockPrismaService.appointment.count.mockResolvedValue(120);
      mockPrismaService.message.count.mockResolvedValue(550);

      const result = await controller.getDashboardStats(superAdminReq);

      expect(result).toEqual({
        totalSalons: 2,
        totalActiveSalons: 2,
        totalSuspendedSalons: 0,
        monthlyRevenue: 8000,
        expectedRevenue: 8000,
        overduePayments: 0,
        trialAccounts: 0,
        conversionRate: 100,
        totalAppointments: 120,
        totalWhatsAppMessages: 550,
        activeSubscriptions: {
          FREE: 0,
          TRIAL: 0,
          BASIC: 1,
          PRO: 1,
          GRACE_PERIOD: 0,
          SUSPENDED: 0,
          EXPIRED: 0,
        },
      });
    });
  });

  describe('getSalons', () => {
    it('should list all salons with metrics details', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u-admin',
        role: Role.SUPER_ADMIN,
      });
      mockPrismaService.message.count.mockResolvedValue(0);
      mockPrismaService.voiceNote.count.mockResolvedValue(0);
      mockPrismaService.salon.findMany.mockResolvedValue([
        {
          id: 's-1',
          name: 'Salon A',
          whatsappNumber: '+919999999999',
          address: 'Test Addr',
          createdAt: new Date('2026-06-01T00:00:00Z'),
          subscription: {
            plan: SubscriptionPlan.BASIC,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: null,
          },
          _count: {
            customers: 50,
            appointments: 150,
            users: 3,
          },
        },
      ]);

      const result = await controller.getSalons(superAdminReq);

      expect(result[0].name).toBe('Salon A');
      expect(result[0].metrics.totalAppointments).toBe(150);
    });
  });

  describe('overrideSubscription', () => {
    it('should successfully update subscription and log audit event', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u-admin',
        role: Role.SUPER_ADMIN,
      });
      mockPrismaService.salon.findUnique.mockResolvedValue({
        id: 's-1',
        name: 'Salon A',
      });
      mockPrismaService.subscription.upsert.mockResolvedValue({
        salonId: 's-1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
      });

      const body = {
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: '2026-12-31T00:00:00Z',
      };

      const result = await controller.overrideSubscription(superAdminReq, 's-1', body);

      expect(result.plan).toBe(SubscriptionPlan.PRO);
      expect(mockPrismaService.subscription.upsert).toHaveBeenCalledWith({
        where: { salonId: 's-1' },
        update: {
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date('2026-12-31T00:00:00Z'),
        },
        create: {
          salonId: 's-1',
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date('2026-12-31T00:00:00Z'),
        },
      });
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });
  });
});
