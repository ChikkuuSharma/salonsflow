import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: ServicesService;
  let prisma: PrismaService;

  const mockServicesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    service = module.get<ServicesService>(ServicesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should list services scoped to req.user.salonId', async () => {
      const mockReq = {
        user: {
          salonId: 'salon_abc',
        },
      };

      const mockList = [{ id: 'srv_1', name: 'Haircut', price: 400, isActive: true }];
      mockServicesService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll(mockReq);

      expect(service.findAll).toHaveBeenCalledWith('salon_abc');
      expect(result).toEqual(mockList);
    });

    it('should query DB user if salonId is not present on req.user context', async () => {
      const mockReq = {
        user: {
          sub: 'clerk_user_id',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        salonId: 'salon_from_user_db',
      });
      mockServicesService.findAll.mockResolvedValue([]);

      await controller.findAll(mockReq);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_user_id' },
      });
      expect(service.findAll).toHaveBeenCalledWith('salon_from_user_db');
    });

    it('should throw UnauthorizedException if user look up fails', async () => {
      const mockReq = {
        user: {
          sub: 'non_existent_clerk_id',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockReq)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findOne', () => {
    it('should fetch a service filtered by id and salonId', async () => {
      const mockReq = {
        user: { salonId: 'salon_abc' },
      };

      const mockServiceObj = { id: 'srv_1', name: 'Haircut', price: 500, salonId: 'salon_abc' };
      mockServicesService.findOne.mockResolvedValue(mockServiceObj);

      const result = await controller.findOne(mockReq, 'srv_1');

      expect(service.findOne).toHaveBeenCalledWith('srv_1', 'salon_abc');
      expect(result).toEqual(mockServiceObj);
    });
  });

  describe('create', () => {
    it('should call service create with req.user.salonId and payload', async () => {
      const mockReq = {
        user: { salonId: 'salon_abc' },
      };
      const dto = { name: 'Facial', price: 800, durationMins: 45, isActive: true };
      
      mockServicesService.create.mockResolvedValue({ id: 'srv_new', ...dto });

      const result = await controller.create(mockReq, dto);

      expect(service.create).toHaveBeenCalledWith('salon_abc', dto);
      expect(result).toEqual({ id: 'srv_new', ...dto });
    });
  });

  describe('update', () => {
    it('should call service update with parameters', async () => {
      const mockReq = {
        user: { salonId: 'salon_abc' },
      };
      const patchDto = { price: 900 };

      mockServicesService.update.mockResolvedValue({ id: 'srv_1', price: 900 });

      const result = await controller.update(mockReq, 'srv_1', patchDto);

      expect(service.update).toHaveBeenCalledWith('srv_1', 'salon_abc', patchDto);
      expect(result).toEqual({ id: 'srv_1', price: 900 });
    });
  });

  describe('remove', () => {
    it('should call service delete/remove with service ID and salonId', async () => {
      const mockReq = {
        user: { salonId: 'salon_abc' },
      };

      mockServicesService.remove.mockResolvedValue({ id: 'srv_1', name: 'Haircut' });

      const result = await controller.remove(mockReq, 'srv_1');

      expect(service.remove).toHaveBeenCalledWith('srv_1', 'salon_abc');
      expect(result).toEqual({ id: 'srv_1', name: 'Haircut' });
    });
  });
});
