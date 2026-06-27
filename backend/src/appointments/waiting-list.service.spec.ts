import { Test, TestingModule } from '@nestjs/testing';
import { WaitingListService } from './waiting-list.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WaitingListStatus } from '@prisma/client';

describe('WaitingListService', () => {
  let service: WaitingListService;
  let prisma: PrismaService;

  const mockPrismaService = {
    customer: {
      findFirst: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    staff: {
      findFirst: jest.fn(),
    },
    waitingList: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    message: {
      create: jest.fn(),
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
        WaitingListService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WaitingListService>(WaitingListService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('addToWaitingList', () => {
    it('should add customer to waitlist successfully if scopes are valid', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      mockPrismaService.service.findFirst.mockResolvedValue({ id: 'srv-1' });
      mockPrismaService.waitingList.create.mockResolvedValue({ id: 'wait-1' });

      const result = await service.addToWaitingList({
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        requestedStartTime: new Date(),
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.waitingList.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer is not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.addToWaitingList({
          salonId: 'salon-1',
          customerId: 'cust-invalid',
          serviceId: 'srv-1',
          requestedStartTime: new Date(),
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('promoteWaitlistEntry', () => {
    it('should promote waitlist entry successfully if slot is vacant', async () => {
      mockPrismaService.waitingList.findFirst.mockResolvedValue({
        id: 'wait-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        staffId: 'staff-1',
        requestedStartTime: new Date('2026-06-01T10:00:00Z'),
        service: { durationMins: 60 },
        customer: { name: 'John Doe' },
      });

      mockPrismaService.appointment.findMany.mockResolvedValue([]); // No overlaps
      mockPrismaService.appointment.create.mockResolvedValue({ id: 'appt-1' });

      const result = await service.promoteWaitlistEntry('wait-1', 'salon-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.appointment.create).toHaveBeenCalled();
      expect(mockPrismaService.waitingList.update).toHaveBeenCalledWith({
        where: { id: 'wait-1' },
        data: { status: WaitingListStatus.BOOKED },
      });
    });

    it('should throw BadRequestException if slot is occupied', async () => {
      mockPrismaService.waitingList.findFirst.mockResolvedValue({
        id: 'wait-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        staffId: 'staff-1',
        requestedStartTime: new Date('2026-06-01T10:00:00Z'),
        service: { durationMins: 60 },
        customer: { name: 'John Doe' },
      });

      mockPrismaService.appointment.findMany.mockResolvedValue([{ id: 'conflicting' }]);

      await expect(
        service.promoteWaitlistEntry('wait-1', 'salon-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkAndNotifyWaitlistCandidates', () => {
    it('should lock slot and notify top waitlist candidate if candidates exist', async () => {
      mockPrismaService.waitingList.findMany.mockResolvedValue([
        {
          id: 'wait-top',
          customerId: 'cust-1',
          serviceId: 'srv-1',
          requestedStartTime: new Date('2026-06-01T10:00:00Z'),
        },
      ]);

      mockPrismaService.appointment.create.mockResolvedValue({
        id: 'hold-1',
        service: { name: 'Haircut' },
      });

      mockPrismaService.conversation.findFirst.mockResolvedValue({ id: 'conv-1' });

      const result = await service.checkAndNotifyWaitlistCandidates(
        'salon-1',
        'srv-1',
        new Date('2026-06-01T10:00:00Z'),
        new Date('2026-06-01T11:00:00Z'),
      );

      expect(result).toBe(true);
      expect(mockPrismaService.appointment.create).toHaveBeenCalled();
      expect(mockPrismaService.message.create).toHaveBeenCalled();
    });

    it('should return false if no waitlist candidates found', async () => {
      mockPrismaService.waitingList.findMany.mockResolvedValue([]);

      const result = await service.checkAndNotifyWaitlistCandidates(
        'salon-1',
        'srv-1',
        new Date(),
        new Date(),
      );

      expect(result).toBe(false);
    });
  });

  describe('processExpiredHolds', () => {
    it('should delete expired holds and trigger next candidate notification', async () => {
      mockPrismaService.appointment.findMany.mockResolvedValue([
        {
          id: 'expired-1',
          salonId: 'salon-1',
          customerId: 'cust-1',
          serviceId: 'srv-1',
          startTime: new Date('2026-06-01T10:00:00Z'),
          endTime: new Date('2026-06-01T11:00:00Z'),
          staffId: 'staff-1',
        },
      ]);

      mockPrismaService.waitingList.findFirst.mockResolvedValue({ id: 'wait-expired' });
      mockPrismaService.waitingList.findMany.mockResolvedValue([]); // No next candidates

      const result = await service.processExpiredHolds();

      expect(result).toBe(1);
      expect(mockPrismaService.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'expired-1' },
      });
      expect(mockPrismaService.waitingList.update).toHaveBeenCalledWith({
        where: { id: 'wait-expired' },
        data: { status: WaitingListStatus.EXPIRED },
      });
    });
  });

  describe('confirmWaitlistHold', () => {
    it('should confirm hold and update status to BOOKED', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue({
        id: 'hold-active',
        salonId: 'salon-1',
        customerId: 'cust-1',
        serviceId: 'srv-1',
        startTime: new Date('2026-06-01T10:00:00Z'),
      });

      mockPrismaService.appointment.update.mockResolvedValue({ id: 'appt-confirmed' });
      mockPrismaService.waitingList.findFirst.mockResolvedValue({ id: 'wait-active' });

      const result = await service.confirmWaitlistHold('salon-1', 'cust-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.appointment.update).toHaveBeenCalledWith({
        where: { id: 'hold-active' },
        data: { status: 'CONFIRMED', heldUntil: null },
        include: expect.any(Object),
      });
      expect(mockPrismaService.waitingList.update).toHaveBeenCalledWith({
        where: { id: 'wait-active' },
        data: { status: WaitingListStatus.BOOKED },
      });
    });

    it('should throw BadRequestException if no active hold found', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmWaitlistHold('salon-1', 'cust-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
