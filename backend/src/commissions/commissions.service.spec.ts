import { Test, TestingModule } from '@nestjs/testing';
import { CommissionsService } from './commissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommissionsService', () => {
  let service: CommissionsService;

  const mockPrisma = {
    staff: {
      findUnique: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    commission: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePayouts', () => {
    it('should correctly sum and group payouts', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          id: 'app-1',
          salonId: 'salon-A',
          customerId: 'cust-1',
          serviceId: 'serv-1',
          staffId: 'staff-1',
          startTime: new Date(),
          endTime: new Date(),
          status: 'COMPLETED',
          amountPaid: 1000,
          customer: { name: 'Customer A' },
          service: { id: 'serv-1', name: 'Haircut', price: 1000 },
          staff: { id: 'staff-1', name: 'Stylist A' },
        },
        {
          id: 'app-2',
          salonId: 'salon-A',
          customerId: 'cust-2',
          serviceId: 'serv-2',
          staffId: 'staff-1',
          startTime: new Date(),
          endTime: new Date(),
          status: 'COMPLETED',
          amountPaid: null,
          customer: { name: 'Customer B' },
          service: { id: 'serv-2', name: 'Shave', price: 500 },
          staff: { id: 'staff-1', name: 'Stylist A' },
        },
      ]);

      mockPrisma.commission.findMany.mockResolvedValue([
        {
          staffId: 'staff-1',
          serviceId: 'serv-1',
          ratePercent: 10.0,
        },
        {
          staffId: 'staff-1',
          serviceId: 'serv-2',
          ratePercent: 20.0,
        },
      ]);

      const result = await service.calculatePayouts('salon-A', {});

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('staff-1');
      expect(result[0].totalBookings).toBe(2);
      expect(result[0].totalRevenue).toBe(1500);
      expect(result[0].totalEarnings).toBe(200);
    });
  });
});
