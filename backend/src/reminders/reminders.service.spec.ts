import { Test, TestingModule } from '@nestjs/testing';
import { RemindersService } from './reminders.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

describe('RemindersService', () => {
  let service: RemindersService;
  let prisma: PrismaService;
  let whatsappService: WhatsappService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
    },
    reminder: {
      create: jest.fn(),
    },
  };

  const mockWhatsappService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: mockWhatsappService },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
    prisma = module.get<PrismaService>(PrismaService);
    whatsappService = module.get<WhatsappService>(WhatsappService);

    jest.clearAllMocks();
  });

  describe('handleUpcomingReminders', () => {
    it('should query confirmed appointments without reminders and send WhatsApp messages', async () => {
      const mockAppointment = {
        id: 'appt-123',
        startTime: new Date('2026-06-05T12:00:00Z'),
        customer: { name: 'Anjali', phone: '+919999999999' },
        salon: { name: 'Elegance Salon' },
        service: { name: 'Premium Haircut' },
      };

      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointment,
      ]);
      mockPrismaService.reminder.create.mockResolvedValue({ id: 'rem-1' });

      await service.handleUpcomingReminders();

      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CONFIRMED',
            reminder: { is: null },
          }),
        }),
      );

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+919999999999',
        expect.stringContaining('friendly reminder from Elegance Salon'),
      );

      expect(mockPrismaService.reminder.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-123',
          scheduledFor: mockAppointment.startTime,
          isSent: true,
        },
      });
    });

    it('should skip sending and database creation if customer has no phone', async () => {
      const mockAppointment = {
        id: 'appt-123',
        startTime: new Date('2026-06-05T12:00:00Z'),
        customer: { name: 'Anjali', phone: '' },
        salon: { name: 'Elegance Salon' },
        service: { name: 'Premium Haircut' },
      };

      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointment,
      ]);

      await service.handleUpcomingReminders();

      expect(mockWhatsappService.sendMessage).not.toHaveBeenCalled();
      expect(mockPrismaService.reminder.create).not.toHaveBeenCalled();
    });
  });

  describe('handlePostAppointmentFollowUp', () => {
    it('should find completed appointments and send follow-up requests', async () => {
      const mockAppointment = {
        id: 'appt-456',
        customer: { name: 'Devender', phone: '+918888888888' },
        salon: { name: 'Elegance Salon' },
        service: { name: 'Massage' },
      };

      mockPrismaService.appointment.findMany.mockResolvedValue([
        mockAppointment,
      ]);

      await service.handlePostAppointmentFollowUp();

      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      );

      expect(mockWhatsappService.sendMessage).toHaveBeenCalledWith(
        '+918888888888',
        expect.stringContaining('thank you for visiting Elegance Salon today!'),
      );
    });
  });
});
