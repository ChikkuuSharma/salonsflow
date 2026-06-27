import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

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
    dto: { appointmentId: string; amountPaid: number; paymentMode: string; notes?: string },
  ) {
    const { appointmentId, amountPaid, paymentMode, notes } = dto;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, salonId },
    });
    if (!appointment) {
      throw new BadRequestException('Appointment not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedAppt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'COMPLETED',
          amountPaid,
          notes: notes || appointment.notes,
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

      return updatedAppt;
    });
  }
}

