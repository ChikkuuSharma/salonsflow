import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: PrismaService;

  const mockTx = {
    rebookingRule: {
      deleteMany: jest.fn(),
    },
    rebookingRecommendation: {
      deleteMany: jest.fn(),
    },
    commission: {
      deleteMany: jest.fn(),
    },
    staffService: {
      deleteMany: jest.fn(),
    },
    waitingList: {
      deleteMany: jest.fn(),
    },
    service: {
      delete: jest.fn(),
    },
  };

  const mockPrismaService = {
    service: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: mockTx.service.delete,
    },
    appointment: {
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a service when all parameters are provided', async () => {
      const payload = { name: 'Manicure', price: 600, durationMins: 30 };
      const createdObj = { id: 'srv_1', salonId: 'salon_123', ...payload, isActive: true };
      
      mockPrismaService.service.create.mockResolvedValue(createdObj);

      const result = await service.create('salon_123', payload);

      expect(mockPrismaService.service.create).toHaveBeenCalledWith({
        data: {
          salonId: 'salon_123',
          name: 'Manicure',
          price: 600,
          durationMins: 30,
          isActive: true,
        },
      });
      expect(result).toEqual(createdObj);
    });

    it('should throw BadRequestException if name is missing', async () => {
      await expect(
        service.create('salon_123', { name: '', price: 600, durationMins: 30 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if price is missing', async () => {
      await expect(
        service.create('salon_123', { name: 'Facial', price: undefined as any, durationMins: 30 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if durationMins is missing', async () => {
      await expect(
        service.create('salon_123', { name: 'Facial', price: 500, durationMins: undefined as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should query services filtered by salonId', async () => {
      const mockServices = [
        { id: 'srv_1', name: 'A', price: 100 },
        { id: 'srv_2', name: 'B', price: 200 },
      ];
      mockPrismaService.service.findMany.mockResolvedValue(mockServices);

      const result = await service.findAll('salon_123');

      expect(mockPrismaService.service.findMany).toHaveBeenCalledWith({
        where: { salonId: 'salon_123' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockServices);
    });
  });

  describe('findOne', () => {
    it('should return service if found for specified salonId', async () => {
      const mockService = { id: 'srv_1', name: 'Haircut', salonId: 'salon_123' };
      mockPrismaService.service.findFirst.mockResolvedValue(mockService);

      const result = await service.findOne('srv_1', 'salon_123');

      expect(mockPrismaService.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'srv_1', salonId: 'salon_123' },
      });
      expect(result).toEqual(mockService);
    });

    it('should throw NotFoundException if service is not found or not matched to salonId', async () => {
      mockPrismaService.service.findFirst.mockResolvedValue(null);

      await expect(service.findOne('srv_1', 'salon_123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should find service first and then update it', async () => {
      const mockService = { id: 'srv_1', name: 'Haircut', salonId: 'salon_123' };
      mockPrismaService.service.findFirst.mockResolvedValue(mockService);
      mockPrismaService.service.update.mockResolvedValue({ ...mockService, price: 450 });

      const result = await service.update('srv_1', 'salon_123', { price: 450 });

      expect(mockPrismaService.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'srv_1', salonId: 'salon_123' },
      });
      expect(mockPrismaService.service.update).toHaveBeenCalledWith({
        where: { id: 'srv_1' },
        data: {
          name: undefined,
          price: 450,
          durationMins: undefined,
          isActive: undefined,
        },
      });
      expect(result).toEqual({ ...mockService, price: 450 });
    });
  });

  describe('remove', () => {
    it('should delete service if no appointments reference it', async () => {
      const mockService = { id: 'srv_1', name: 'Haircut', salonId: 'salon_123' };
      mockPrismaService.service.findFirst.mockResolvedValue(mockService);
      mockPrismaService.appointment.count.mockResolvedValue(0);
      mockPrismaService.service.delete.mockResolvedValue(mockService);

      const result = await service.remove('srv_1', 'salon_123');

      expect(mockPrismaService.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'srv_1', salonId: 'salon_123' },
      });
      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: { serviceId: 'srv_1' },
      });
      expect(mockPrismaService.service.delete).toHaveBeenCalledWith({
        where: { id: 'srv_1' },
      });
      expect(result).toEqual(mockService);
    });

    it('should throw BadRequestException if active appointments exist for the service', async () => {
      const mockService = { id: 'srv_1', name: 'Haircut', salonId: 'salon_123' };
      mockPrismaService.service.findFirst.mockResolvedValue(mockService);
      mockPrismaService.appointment.count.mockResolvedValue(2);

      await expect(service.remove('srv_1', 'salon_123')).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.service.delete).not.toHaveBeenCalled();
    });
  });
});
