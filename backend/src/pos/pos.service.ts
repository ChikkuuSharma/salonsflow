import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  async logDrawerAction(
    salonId: string,
    userId: string,
    dto: { amount: number; actionType: string; notes?: string },
  ) {
    const { amount, actionType, notes } = dto;

    const validActions = ['OPEN', 'CLOSE', 'SALE', 'PAYOUT'];
    if (!validActions.includes(actionType)) {
      throw new BadRequestException(
        `Invalid actionType. Allowed values: ${validActions.join(', ')}`,
      );
    }

    // Verify user exists and belongs to this salon
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.salonId !== salonId) {
      throw new BadRequestException('User record not found under this salon.');
    }

    return this.prisma.cashDrawerLog.create({
      data: {
        salonId,
        amount,
        actionType,
        notes,
        createdById: userId,
      },
      include: {
        createdBy: true,
      },
    });
  }

  async getDrawerLogs(
    salonId: string,
    query: { startDate?: string; endDate?: string },
  ) {
    const { startDate, endDate } = query;
    const whereClause: any = { salonId };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    return this.prisma.cashDrawerLog.findMany({
      where: whereClause,
      include: {
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getDrawerSummary(salonId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const logs = await this.prisma.cashDrawerLog.findMany({
      where: {
        salonId,
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    let openingBalance = 0;
    let totalSales = 0;
    let totalPayouts = 0;

    for (const log of logs) {
      if (log.actionType === 'OPEN') {
        openingBalance = log.amount;
      } else if (log.actionType === 'SALE') {
        totalSales += log.amount;
      } else if (log.actionType === 'PAYOUT') {
        totalPayouts += log.amount;
      }
    }

    const currentBalance = openingBalance + totalSales - totalPayouts;

    return {
      openingBalance,
      totalSales,
      totalPayouts,
      currentBalance,
      logCount: logs.length,
    };
  }

  async checkoutAppointment(
    salonId: string,
    userId: string,
    dto: {
      appointmentId: string;
      amountPaid: number;
      paymentMode: string;
      notes?: string;
      sendWhatsApp?: boolean;
    },
  ) {
    const { appointmentId, amountPaid, paymentMode, notes, sendWhatsApp } = dto;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, salonId },
    });
    if (!appointment) {
      throw new BadRequestException('Appointment not found.');
    }

    const updatedAppt = await this.prisma.$transaction(async (tx) => {
      const res = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'COMPLETED',
          amountPaid,
          notes: notes ? `${notes} | Payment Mode: ${paymentMode}` : `Payment Mode: ${paymentMode}`,
        },
      });

      if (paymentMode === 'CASH') {
        await tx.cashDrawerLog.create({
          data: {
            salonId,
            amount: amountPaid,
            actionType: 'SALE',
            notes: `Cash collection for appointment: ${appointmentId}. Notes: ${notes || ''}`,
            createdById: userId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          salonId,
          userId,
          action: 'CHECKOUT_APPOINTMENT',
          details: {
            appointmentId,
            amountPaid,
            paymentMode,
            notes,
          },
        },
      });

      return res;
    });

    if (sendWhatsApp) {
      this.sendReceiptToWhatsApp(salonId, appointmentId).catch((err) => {
        this.logger.error(`Error sending WhatsApp receipt: ${err.message}`);
      });
    }

    return updatedAppt;
  }

  async sendReceiptToWhatsApp(
    salonId: string,
    appointmentId: string,
    overridePhone?: string,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, salonId },
      include: {
        customer: true,
        service: true,
        staff: true,
        salon: true,
      },
    });

    if (!appointment) {
      throw new BadRequestException('Appointment not found.');
    }

    const phone = overridePhone || appointment.customer?.phone;
    if (!phone) {
      throw new BadRequestException('Customer phone number not available.');
    }

    const salon = appointment.salon;
    const customer = appointment.customer;
    const service = appointment.service;
    const staff = appointment.staff;

    const dateFormatted = new Date(appointment.startTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const customerName = customer?.name || 'Valued Customer';
    const salonName = salon?.name || 'Salon';
    const serviceName = service?.name || 'Hair & Beauty Service';
    const price = appointment.amountPaid || service?.price || 0;
    const paymentMode = appointment.notes?.includes('Payment Mode:')
      ? appointment.notes.split('Payment Mode:')[1].trim()
      : 'Completed';
    const staffName = staff?.name || null;
    const location = salon?.address || 'Our Salon';

    const messageText =
      `🧾 *${salonName.toUpperCase()} - DIGITAL INVOICE*\n` +
      `───────────────────────\n` +
      `Invoice #: *INV-${appointment.id.slice(0, 8).toUpperCase()}*\n` +
      `Date: ${dateFormatted}\n` +
      `Customer: *${customerName}*\n\n` +
      `📋 *Service Details:*\n` +
      `• ${serviceName} - ₹${price}\n\n` +
      (staffName ? `✂️ *Stylist:* ${staffName}\n` : '') +
      `💰 *Total Amount Paid:* ₹${price}\n` +
      `💳 *Payment Mode:* ${paymentMode}\n` +
      `───────────────────────\n` +
      `📍 *Location:* ${location}\n\n` +
      `Thank you for visiting *${salonName}*! Reply to this message anytime to book your next appointment. ✨`;

    if (this.whatsappService) {
      let conversation = await this.prisma.conversation.findFirst({
        where: { salonId, customerId: customer.id },
      });
      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: { salonId, customerId: customer.id, language: 'ENGLISH' },
        });
      }
      await this.whatsappService.sendMessage(phone, messageText, conversation.id, salonId);
    }

    return { success: true, message: `Invoice sent to WhatsApp (${phone})` };
  }

  async createQuickBill(
    salonId: string,
    userId: string,
    dto: {
      customerName: string;
      customerPhone: string;
      serviceId: string;
      amountPaid: number;
      paymentMode: string;
      notes?: string;
      sendWhatsApp?: boolean;
    },
  ) {
    const { customerName, customerPhone, serviceId, amountPaid, paymentMode, notes, sendWhatsApp } = dto;

    let phone = customerPhone.trim().replace(/[^0-9]/g, '');
    if (!phone.startsWith('+')) {
      phone = phone.length === 10 ? '+91' + phone : '+' + phone;
    }

    let customer = await this.prisma.customer.findFirst({
      where: { salonId, phone },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          salonId,
          name: customerName,
          phone,
          source: 'POS_WALKIN',
        },
      });
    }

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, salonId },
    });
    if (!service) throw new BadRequestException('Service not found.');

    const now = new Date();
    const endTime = new Date(now.getTime() + (service.durationMins || 30) * 60000);

    const appointment = await this.prisma.appointment.create({
      data: {
        salonId,
        customerId: customer.id,
        serviceId: service.id,
        startTime: now,
        endTime,
        status: 'COMPLETED',
        amountPaid,
        bookingSource: 'POS_WALKIN',
        notes: notes ? `${notes} | Payment Mode: ${paymentMode}` : `Payment Mode: ${paymentMode}`,
      },
      include: {
        customer: true,
        service: true,
        salon: true,
      },
    });

    if (paymentMode === 'CASH') {
      await this.prisma.cashDrawerLog.create({
        data: {
          salonId,
          amount: amountPaid,
          actionType: 'SALE',
          notes: `POS Quick Bill Sale: ${appointment.id}`,
          createdById: userId,
        },
      });
    }

    if (sendWhatsApp) {
      await this.sendReceiptToWhatsApp(salonId, appointment.id, phone);
    }

    return appointment;
  }
}

