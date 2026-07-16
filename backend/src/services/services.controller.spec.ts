import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: ServicesService;

  const mockServicesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    service = module.get<ServicesService>(ServicesService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should list services scoped to salonId', async () => {
      const mockList = [{ id: 'srv_1', name: 'Haircut', price: 400, isActive: true }];
      mockServicesService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll('salon_abc');

      expect(service.findAll).toHaveBeenCalledWith('salon_abc');
      expect(result).toEqual(mockList);
    });
  });

  describe('findOne', () => {
    it('should fetch a service filtered by id and salonId', async () => {
      const mockServiceObj = { id: 'srv_1', name: 'Haircut', price: 500, salonId: 'salon_abc' };
      mockServicesService.findOne.mockResolvedValue(mockServiceObj);

      const result = await controller.findOne('salon_abc', 'srv_1');

      expect(service.findOne).toHaveBeenCalledWith('srv_1', 'salon_abc');
      expect(result).toEqual(mockServiceObj);
    });
  });

  describe('create', () => {
    it('should call service create with salonId and payload', async () => {
      const dto = { name: 'Facial', price: 800, durationMins: 45, isActive: true };
      mockServicesService.create.mockResolvedValue({ id: 'srv_new', ...dto });

      const result = await controller.create('salon_abc', dto);

      expect(service.create).toHaveBeenCalledWith('salon_abc', dto);
      expect(result).toEqual({ id: 'srv_new', ...dto });
    });
  });

  describe('update', () => {
    it('should call service update with parameters', async () => {
      const patchDto = { price: 900 };
      mockServicesService.update.mockResolvedValue({ id: 'srv_1', price: 900 });

      const result = await controller.update('salon_abc', 'srv_1', patchDto);

      expect(service.update).toHaveBeenCalledWith('srv_1', 'salon_abc', patchDto);
      expect(result).toEqual({ id: 'srv_1', price: 900 });
    });
  });

  describe('remove', () => {
    it('should call service delete/remove with service ID and salonId', async () => {
      mockServicesService.remove.mockResolvedValue({ id: 'srv_1', name: 'Haircut' });

      const result = await controller.remove('salon_abc', 'srv_1');

      expect(service.remove).toHaveBeenCalledWith('srv_1', 'salon_abc');
      expect(result).toEqual({ id: 'srv_1', name: 'Haircut' });
    });
  });
});
