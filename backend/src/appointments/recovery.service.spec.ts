import { Test, TestingModule } from '@nestjs/testing';
import { RecoveryService } from './recovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RecoveryService', () => {
  let service: RecoveryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    salon: {
      findUnique: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    staff: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    staffService: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecoveryService>(RecoveryService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getAlternativeSlots', () => {
    it('should return alternative slots when requested slot is busy', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue({
        openingTime: '10:00',
        closingTime: '20:00',
      });

      mockPrismaService.service.findFirst.mockResolvedValue({
        id: 'srv-1',
        durationMins: 60,
      });

      mockPrismaService.staff.findFirst.mockResolvedValue({
        id: 'staff-1',
        name: 'John Stylist',
        isAvailable: true,
      });

      mockPrismaService.staffService.count.mockResolvedValue(0);

      // Empty overlapping appointments for alternative times
      mockPrismaService.appointment.findMany.mockResolvedValue([]);
      mockPrismaService.staff.findMany.mockResolvedValue([]);

      const requestedTime = new Date('2026-06-01T12:00:00Z');
      const result = await service.getAlternativeSlots(
        'salon-1',
        'srv-1',
        requestedTime,
        'staff-1',
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].staffId).toBe('staff-1');
    });

    it('should throw NotFoundException if service is not found', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue(null);

      await expect(
        service.getAlternativeSlots(
          'salon-1',
          'srv-invalid',
          new Date(),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule appointment successfully if slot is free', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue({
        id: 'appt-1',
        salonId: 'salon-1',
        serviceId: 'srv-1',
        staffId: 'staff-1',
        startTime: new Date('2026-06-01T10:00:00Z'),
        endTime: new Date('2026-06-01T11:00:00Z'),
        durationMins: 60,
        service: { durationMins: 60 },
      });

      mockPrismaService.staff.findFirst.mockResolvedValue({
        id: 'staff-1',
        isAvailable: true,
      });

      mockPrismaService.staffService.count.mockResolvedValue(0);
      mockPrismaService.appointment.findMany.mockResolvedValue([]); // No overlaps
      mockPrismaService.appointment.update.mockResolvedValue({
        id: 'appt-1',
        startTime: new Date('2026-06-01T14:00:00Z'),
      });

      const result = await service.rescheduleAppointment(
        'appt-1',
        'salon-1',
        new Date('2026-06-01T14:00:00Z'),
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.appointment.update).toHaveBeenCalled();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if new time slot is occupied', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue({
        id: 'appt-1',
        salonId: 'salon-1',
        serviceId: 'srv-1',
        staffId: 'staff-1',
        startTime: new Date('2026-06-01T10:00:00Z'),
        endTime: new Date('2026-06-01T11:00:00Z'),
        durationMins: 60,
        service: { durationMins: 60 },
      });

      mockPrismaService.staff.findFirst.mockResolvedValue({
        id: 'staff-1',
        isAvailable: true,
      });

      mockPrismaService.staffService.count.mockResolvedValue(0);
      mockPrismaService.appointment.findMany.mockResolvedValue([{ id: 'appt-conflicting' }]); // Overlaps exist

      await expect(
        service.rescheduleAppointment(
          'appt-1',
          'salon-1',
          new Date('2026-06-01T14:00:00Z'),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
