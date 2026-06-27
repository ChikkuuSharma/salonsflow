import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { WaitingListService } from './waiting-list.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: PrismaService;

  const mockWaitingListService = {
    checkAndNotifyWaitlistCandidates: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaService = {
    service: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    staffService: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
    logSecurityEvent: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WaitingListService,
          useValue: mockWaitingListService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService);

    mockPrismaService.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
    });

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return true if no overlapping appointments exist', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      const result = await service.checkAvailability(
        'salon-1',
        'srv-1',
        new Date('2026-06-01T10:00:00Z'),
      );
      expect(result).toBe(true);
      expect(mockPrismaService.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'srv-1', salonId: 'salon-1' },
      });
    });

    it('should return false if overlapping appointments exist', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.appointment.findMany.mockResolvedValue([
        { id: 'appt-1' },
      ]);

      const result = await service.checkAvailability(
        'salon-1',
        'srv-1',
        new Date('2026-06-01T10:00:00Z'),
      );
      expect(result).toBe(false);
    });

    it('should throw NotFoundException and log security event if service is not found under salon', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue(null);
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: 'srv-1',
        salonId: 'salon-other',
      });

      await expect(
        service.checkAvailability(
          'salon-1',
          'srv-1',
          new Date('2026-06-01T10:00:00Z'),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.logSecurityEvent).toHaveBeenCalledWith(
        'salon-1',
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        expect.any(Object),
      );
    });
  });

  describe('createAppointment', () => {
    const mockDate = new Date('2026-06-01T10:00:00Z');

    it('should successfully create appointment', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      mockPrismaService.appointment.findMany.mockResolvedValue([]);
      mockPrismaService.appointment.create.mockResolvedValue({
        id: 'appt-new',
        salonId: 'salon-1',
      });

      const result = await service.createAppointment({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
      });

      expect(result).toEqual({ id: 'appt-new', salonId: 'salon-1' });
      expect(mockPrismaService.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'srv-1', salonId: 'salon-1' },
      });
      expect(mockPrismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cust-1', salonId: 'salon-1' },
      });
    });

    it('should throw NotFoundException on mismatched customerId', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        salonId: 'salon-other',
      });

      await expect(
        service.createAppointment({
          salonId: 'salon-1',
          customerId: 'cust-1',
          serviceId: 'srv-1',
          startTime: mockDate,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.logSecurityEvent).toHaveBeenCalledWith(
        'salon-1',
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        {
          entity: 'Customer',
          targetId: 'cust-1',
          action: 'createAppointment',
        },
      );
    });

    it('should throw BadRequestException and create BOOKING_CONFLICT audit log on overlap', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      mockPrismaService.appointment.findMany.mockResolvedValue([
        { id: 'overlap-appt' },
      ]);

      await expect(
        service.createAppointment({
          salonId: 'salon-1',
          customerId: 'cust-1',
          serviceId: 'srv-1',
          startTime: mockDate,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.logSecurityEvent).toHaveBeenCalledWith(
        'salon-1',
        'BOOKING_CONFLICT',
        expect.objectContaining({
          customerId: 'cust-1',
          serviceId: 'srv-1',
          reason: 'Requested time slot is no longer available.',
        }),
      );
    });
  });

  describe('createBookingTransaction', () => {
    const mockDate = new Date('2026-06-01T10:00:00Z');

    it('should successfully create appointment and audit log if service is found and slot is available', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        name: 'Devender',
        salonId: 'salon-1',
      });
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        name: 'Premium Haircut',
        durationMins: 45,
      });
      mockPrismaService.appointment.findMany.mockResolvedValue([]);

      const createdAppt = {
        id: 'appt-new',
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
        endTime: new Date(mockDate.getTime() + 45 * 60000),
        status: 'CONFIRMED',
        service: { id: 'srv-1', name: 'Premium Haircut' },
        customer: { id: 'cust-1', name: 'Devender' },
      };
      mockPrismaService.appointment.create.mockResolvedValue(createdAppt);

      const result = await service.createBookingTransaction({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceName: 'haircut',
        startTime: mockDate,
      });

      expect(result).toEqual(createdAppt);
      expect(mockPrismaService.service.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.appointment.create).toHaveBeenCalled();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          salonId: 'salon-1',
          action: 'CREATED_APPOINTMENT',
          details: {
            appointmentId: 'appt-new',
            customerId: 'cust-1',
            serviceId: 'srv-1',
            startTime: mockDate.toISOString(),
            endTime: new Date(mockDate.getTime() + 45 * 60000).toISOString(),
            bookedBy: 'AI_RECEPTIONIST',
          },
        },
      });
    });

    it('should throw an error if the service is not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        name: 'Devender',
        salonId: 'salon-1',
      });
      mockPrismaService.service.findFirst.mockResolvedValue(null);

      await expect(
        service.createBookingTransaction({
          salonId: 'salon-1',
          customerId: 'cust-1',
          serviceName: 'nonexistent',
          startTime: mockDate,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw an error if the slot is already taken', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        name: 'Devender',
        salonId: 'salon-1',
      });
      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        name: 'Premium Haircut',
        durationMins: 45,
      });
      mockPrismaService.appointment.findMany.mockResolvedValue([
        { id: 'overlap' },
      ]);

      await expect(
        service.createBookingTransaction({
          salonId: 'salon-1',
          customerId: 'cust-1',
          serviceName: 'haircut',
          startTime: mockDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('concurrency and locking', () => {
    let originalTransaction: any;

    beforeEach(() => {
      originalTransaction = mockPrismaService.$transaction;
    });

    afterEach(() => {
      mockPrismaService.$transaction = originalTransaction;
    });

    it('should reject duplicate concurrent bookings for the same staff member at the same time', async () => {
      const mockDate = new Date('2026-06-01T10:00:00Z');

      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      mockPrismaService.staff.findFirst.mockResolvedValue({
        id: 'staff-1',
        salonId: 'salon-1',
      });

      const databaseAppointments: any[] = [];

      mockPrismaService.appointment.findMany.mockImplementation(
        async (args) => {
          const staffId = args.where.staffId || null;
          return databaseAppointments.filter(
            (a) => (a.staffId || null) === staffId,
          );
        },
      );

      mockPrismaService.appointment.create.mockImplementation(async (args) => {
        const newAppt = { id: `appt-${Date.now()}`, ...args.data };
        databaseAppointments.push(newAppt);
        return newAppt;
      });

      let lockHolder: string | null = null;
      const lockQueue: Array<{ resolve: () => void; id: string }> = [];

      const acquireLock = async (id: string) => {
        if (lockHolder) {
          await new Promise<void>((resolve) => {
            lockQueue.push({ resolve, id });
          });
        }
        lockHolder = id;
      };

      const releaseLock = () => {
        lockHolder = null;
        if (lockQueue.length > 0) {
          const next = lockQueue.shift();
          if (next) {
            next.resolve();
          }
        }
      };

      let txCounter = 0;
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const txId = `tx-${++txCounter}`;
        const txMock = {
          ...mockPrismaService,
          $executeRaw: jest.fn(async () => {
            await acquireLock(txId);
          }),
        };
        try {
          return await cb(txMock);
        } finally {
          releaseLock();
        }
      });

      const call1 = service.createAppointment({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
        staffId: 'staff-1',
      });

      const call2 = service.createAppointment({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
        staffId: 'staff-1',
      });

      const results = await Promise.allSettled([call1, call2]);

      const fulfilled = results.filter(
        (r) => r.status === 'fulfilled',
      ) as PromiseFulfilledResult<any>[];
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      expect(rejected[0].reason.message).toContain(
        'Time slot is no longer available',
      );
      expect(databaseAppointments).toHaveLength(1);
    });

    it('should allow concurrent bookings for different staff members at the same time', async () => {
      const mockDate = new Date('2026-06-01T10:00:00Z');

      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      mockPrismaService.staff.findFirst.mockResolvedValue({
        id: 'staff-any',
        salonId: 'salon-1',
      });

      const databaseAppointments: any[] = [];

      mockPrismaService.appointment.findMany.mockImplementation(
        async (args) => {
          const staffId = args.where.staffId || null;
          return databaseAppointments.filter(
            (a) => (a.staffId || null) === staffId,
          );
        },
      );

      mockPrismaService.appointment.create.mockImplementation(async (args) => {
        const newAppt = { id: `appt-${Date.now()}`, ...args.data };
        databaseAppointments.push(newAppt);
        return newAppt;
      });

      let lockHolder: string | null = null;
      const lockQueue: Array<{ resolve: () => void; id: string }> = [];

      const acquireLock = async (id: string) => {
        if (lockHolder) {
          await new Promise<void>((resolve) => {
            lockQueue.push({ resolve, id });
          });
        }
        lockHolder = id;
      };

      const releaseLock = () => {
        lockHolder = null;
        if (lockQueue.length > 0) {
          const next = lockQueue.shift();
          if (next) {
            next.resolve();
          }
        }
      };

      let txCounter = 0;
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const txId = `tx-${++txCounter}`;
        const txMock = {
          ...mockPrismaService,
          $executeRaw: jest.fn(async () => {
            await acquireLock(txId);
          }),
        };
        try {
          return await cb(txMock);
        } finally {
          releaseLock();
        }
      });

      const call1 = service.createAppointment({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
        staffId: 'staff-1',
      });

      const call2 = service.createAppointment({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
        staffId: 'staff-2',
      });

      const results = await Promise.allSettled([call1, call2]);

      const fulfilled = results.filter(
        (r) => r.status === 'fulfilled',
      ) as PromiseFulfilledResult<any>[];
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(2);
      expect(rejected).toHaveLength(0);
      expect(databaseAppointments).toHaveLength(2);
    });

    it('should serialize concurrent bookings using advisory locks and reject duplicate unassigned bookings', async () => {
      const mockDate = new Date('2026-06-01T10:00:00Z');

      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 45,
      });
      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'cust-1' });

      const databaseAppointments: any[] = [];

      mockPrismaService.appointment.findMany.mockImplementation(
        async (args) => {
          const staffId = args.where.staffId || null;
          return databaseAppointments.filter(
            (a) => (a.staffId || null) === staffId,
          );
        },
      );

      mockPrismaService.appointment.create.mockImplementation(async (args) => {
        const newAppt = { id: `appt-${Date.now()}`, ...args.data };
        databaseAppointments.push(newAppt);
        return newAppt;
      });

      let lockHolder: string | null = null;
      const lockQueue: Array<{ resolve: () => void; id: string }> = [];

      const acquireLock = async (id: string) => {
        if (lockHolder) {
          await new Promise<void>((resolve) => {
            lockQueue.push({ resolve, id });
          });
        }
        lockHolder = id;
      };

      const releaseLock = () => {
        lockHolder = null;
        if (lockQueue.length > 0) {
          const next = lockQueue.shift();
          if (next) {
            next.resolve();
          }
        }
      };

      let txCounter = 0;
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const txId = `tx-${++txCounter}`;
        const txMock = {
          ...mockPrismaService,
          $executeRaw: jest.fn(async () => {
            await acquireLock(txId);
          }),
        };
        try {
          return await cb(txMock);
        } finally {
          releaseLock();
        }
      });

      const call1 = service.createAppointment({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
      });

      const call2 = service.createAppointment({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: mockDate,
      });

      const results = await Promise.allSettled([call1, call2]);

      const fulfilled = results.filter(
        (r) => r.status === 'fulfilled',
      ) as PromiseFulfilledResult<any>[];
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      expect(rejected[0].reason.message).toContain(
        'Time slot is no longer available',
      );
      expect(databaseAppointments).toHaveLength(1);
    });
  });
});
