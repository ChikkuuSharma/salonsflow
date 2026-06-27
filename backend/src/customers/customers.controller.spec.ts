import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCustomersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should fetch all customers for the salon mapped in user session', async () => {
      const mockReq = {
        user: { salonId: 'salon-123' },
      };

      const mockList = [{ id: 'c-1', name: 'Alice' }];
      mockCustomersService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll(mockReq, 'Alice');
      expect(result).toEqual(mockList);
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        'salon-123',
        'Alice',
        undefined,
      );
    });

    it('should fallback to database user lookup if salonId is missing from session claims', async () => {
      const mockReq = {
        user: { sub: 'clerk-user-1' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        salonId: 'salon-db-456',
      });
      mockCustomersService.findAll.mockResolvedValue([]);

      await controller.findAll(mockReq);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk-user-1' },
      });
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        'salon-db-456',
        undefined,
        undefined,
      );
    });

    it('should throw UnauthorizedException if user fallback lookup fails', async () => {
      const mockReq = {
        user: { sub: 'non-existent' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockReq)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if invalid segment value is supplied', async () => {
      const mockReq = {
        user: { salonId: 'salon-123' },
      };

      await expect(
        controller.findAll(mockReq, undefined, 'invalid_segment'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass segment value to service if valid', async () => {
      const mockReq = {
        user: { salonId: 'salon-123' },
      };

      mockCustomersService.findAll.mockResolvedValue([]);

      await controller.findAll(mockReq, undefined, 'inactive_30_days');
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        'salon-123',
        undefined,
        'inactive_30_days',
      );
    });
  });

  describe('findOne', () => {
    it('should return client details if record is found', async () => {
      const mockReq = { user: { salonId: 'salon-123' } };
      const client = { id: 'c-1', name: 'Alice', totalSpend: 500 };

      mockCustomersService.findOne.mockResolvedValue(client);

      const result = await controller.findOne(mockReq, 'c-1');
      expect(result).toEqual(client);
    });

    it('should throw NotFoundException if client profile is not found', async () => {
      const mockReq = { user: { salonId: 'salon-123' } };
      mockCustomersService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockReq, 'unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
