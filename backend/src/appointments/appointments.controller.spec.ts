import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: AppointmentsService;

  const mockAppointmentsService = {
    createAppointment: jest.fn(),
    findAll: jest.fn(),
    updateAppointment: jest.fn(),
  };

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        { provide: AppointmentsService, useValue: mockAppointmentsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
    service = module.get<AppointmentsService>(AppointmentsService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should list all appointments for active salon', async () => {
      mockAppointmentsService.findAll.mockResolvedValue([{ id: 'a-1' }]);

      const result = await controller.findAll('salon-1');
      expect(result).toEqual([{ id: 'a-1' }]);
      expect(mockAppointmentsService.findAll).toHaveBeenCalledWith(
        'salon-1',
        undefined,
      );
    });

    it('should support listing appointments with date filter', async () => {
      mockAppointmentsService.findAll.mockResolvedValue([]);

      await controller.findAll('salon-1', '2026-06-01');
      expect(mockAppointmentsService.findAll).toHaveBeenCalledWith(
        'salon-1',
        '2026-06-01',
      );
    });
  });

  describe('create', () => {
    it('should create dynamic appointments using the service', async () => {
      const body = {
        customerId: 'c-1',
        serviceId: 's-1',
        startTime: '2026-06-01T15:00:00Z',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'c-1',
        salonId: 'salon-1',
      });
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: 's-1',
        salonId: 'salon-1',
      });
      mockAppointmentsService.createAppointment.mockResolvedValue({
        id: 'new-appt',
      });

      const result = await controller.create('salon-1', body);
      expect(result).toEqual({ id: 'new-appt' });
      expect(mockAppointmentsService.createAppointment).toHaveBeenCalledWith({
        salonId: 'salon-1',
        customerId: 'c-1',
        serviceId: 's-1',
        startTime: new Date('2026-06-01T15:00:00Z'),
        staffId: undefined,
      });
    });

    it('should throw BadRequestException if customer ID is invalid', async () => {
      const body = {
        customerId: 'c-1',
        serviceId: 's-1',
        startTime: '2026-06-01T15:00:00Z',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: 's-1',
        salonId: 'salon-1',
      });

      await expect(controller.create('salon-1', body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if service ID belongs to a different salon', async () => {
      const body = {
        customerId: 'c-1',
        serviceId: 's-1',
        startTime: '2026-06-01T15:00:00Z',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'c-1',
        salonId: 'salon-1',
      });
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: 's-1',
        salonId: 'salon-2',
      });

      await expect(controller.create('salon-1', body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if required arguments are missing', async () => {
      await expect(
        controller.create('salon-1', {
          customerId: '',
          serviceId: '',
          startTime: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should successfully update appointment timings and duration', async () => {
      const body = {
        startTime: '2026-06-01T16:00:00Z',
        durationMins: 45,
      };

      mockAppointmentsService.updateAppointment.mockResolvedValue({ id: 'appt-1', durationMins: 45 });

      const result = await controller.update('salon-1', 'appt-1', body);
      expect(result).toEqual({ id: 'appt-1', durationMins: 45 });
      expect(mockAppointmentsService.updateAppointment).toHaveBeenCalledWith(
        'appt-1',
        'salon-1',
        {
          startTime: new Date('2026-06-01T16:00:00Z'),
          durationMins: 45,
          staffId: undefined,
        },
      );
    });
  });
});
