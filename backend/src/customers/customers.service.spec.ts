import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    customer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    logSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const salonId = 'salon-1';

    it('should query all customers for the salon if no segment is specified', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);

      await service.findAll(salonId);
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ salonId }],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it("should query all customers if segment is 'all_customers'", async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);

      await service.findAll(salonId, undefined, 'all_customers');
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ salonId }],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should map segment inactive_30_days to lastVisit and null-check createdAt constraints', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);

      await service.findAll(salonId, undefined, 'inactive_30_days');
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { salonId },
            {
              OR: [
                {
                  lastVisit: {
                    lte: expect.any(Date),
                  },
                },
                {
                  AND: [
                    { lastVisit: null },
                    { createdAt: { lte: expect.any(Date) } },
                  ],
                },
              ],
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should map segment frequent_visitors to totalVisits query constraints', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);

      await service.findAll(salonId, undefined, 'frequent_visitors');
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { salonId },
            {
              totalVisits: {
                gte: 5,
              },
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should combine segment filter with search filter', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);

      await service.findAll(salonId, 'Alice', 'frequent_visitors');
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { salonId },
            {
              totalVisits: {
                gte: 5,
              },
            },
            {
              OR: [
                { name: { contains: 'Alice', mode: 'insensitive' } },
                { phone: { contains: 'Alice', mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
});
