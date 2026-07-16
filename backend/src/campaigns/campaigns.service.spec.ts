import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { BadRequestException } from '@nestjs/common';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: PrismaService;
  let customersService: CustomersService;
  let whatsappService: WhatsappService;

  const mockPrismaService = {
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
  };

  const mockCustomersService = {
    findAll: jest.fn(),
  };

  const mockWhatsappService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: WhatsappService, useValue: mockWhatsappService },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    prisma = module.get<PrismaService>(PrismaService);
    customersService = module.get<CustomersService>(CustomersService);
    whatsappService = module.get<WhatsappService>(WhatsappService);

    mockPrismaService.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
    });

    jest.clearAllMocks();
  });

  describe('create', () => {
    const salonId = 'salon-123';
    const campaignName = 'June Promo';
    const campaignContent = 'Hello, this is a test!';
    const validSegment = 'inactive_30_days';

    it('should throw BadRequestException if targetSegment is invalid', async () => {
      await expect(
        service.create(salonId, campaignName, campaignContent, 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should look up customers, create campaign with sentCount, and dispatch messages', async () => {
      const mockCustomers = [
        { id: 'c-1', phone: '+1234567890' },
        { id: 'c-2', phone: '+9876543210' },
      ];
      mockCustomersService.findAll.mockResolvedValue(mockCustomers);

      const mockCampaign = {
        id: 'camp-1',
        salonId,
        name: campaignName,
        content: campaignContent,
        targetSegment: validSegment,
        sentCount: 2,
      };
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      const result = await service.create(
        salonId,
        campaignName,
        campaignContent,
        validSegment,
      );

      expect(mockCustomersService.findAll).toHaveBeenCalledWith(
        salonId,
        undefined,
        validSegment,
      );

      expect(mockPrismaService.campaign.create).toHaveBeenCalledWith({
        data: {
          salonId,
          name: campaignName,
          content: campaignContent,
          targetSegment: validSegment,
          sentCount: 2,
        },
      });

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockWhatsappService.sendMessage).toHaveBeenNthCalledWith(
        1,
        '+1234567890',
        campaignContent,
        undefined,
        'salon-123',
      );
      expect(mockWhatsappService.sendMessage).toHaveBeenNthCalledWith(
        2,
        '+9876543210',
        campaignContent,
        undefined,
        'salon-123',
      );

      expect(result).toEqual(mockCampaign);
    });
  });

  describe('findAll', () => {
    it('should fetch all campaigns for the salon ordered by createdAt descending', async () => {
      const salonId = 'salon-123';
      const campaignsList = [
        { id: 'camp-2', name: 'Newer' },
        { id: 'camp-1', name: 'Older' },
      ];
      mockPrismaService.campaign.findMany.mockResolvedValue(campaignsList);

      const result = await service.findAll(salonId);

      expect(mockPrismaService.campaign.findMany).toHaveBeenCalledWith({
        where: { salonId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(campaignsList);
    });
  });
});
