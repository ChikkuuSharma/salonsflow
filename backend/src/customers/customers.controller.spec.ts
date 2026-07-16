import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should fetch all customers for the salon', async () => {
      const mockList = [{ id: 'c-1', name: 'Alice' }];
      mockCustomersService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll('salon-123', 'Alice');
      expect(result).toEqual(mockList);
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        'salon-123',
        'Alice',
        undefined,
      );
    });

    it('should throw BadRequestException if invalid segment value is supplied', async () => {
      await expect(
        controller.findAll('salon-123', undefined, 'invalid_segment'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass segment value to service if valid', async () => {
      mockCustomersService.findAll.mockResolvedValue([]);

      await controller.findAll('salon-123', undefined, 'inactive_30_days');
      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        'salon-123',
        undefined,
        'inactive_30_days',
      );
    });
  });

  describe('findOne', () => {
    it('should return client details if record is found', async () => {
      const client = { id: 'c-1', name: 'Alice', totalSpend: 500 };
      mockCustomersService.findOne.mockResolvedValue(client);

      const result = await controller.findOne('salon-123', 'c-1');
      expect(result).toEqual(client);
    });

    it('should throw NotFoundException if client profile is not found', async () => {
      mockCustomersService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('salon-123', 'unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
