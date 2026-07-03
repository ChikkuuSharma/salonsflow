import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import {
  Role,
  AppointmentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  MessageDirection,
  WaitingListStatus,
} from '@prisma/client';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async resetAndSeedDemoSalon() {
    this.logger.log('Resetting and seeding Demo Salon data...');

    const daysAgo = (d: number, hours = 12, minutes = 0) => {
      const date = new Date();
      date.setDate(date.getDate() - d);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const todayAt = (hours: number, minutes = 0) => {
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    const tomorrowAt = (hours: number, minutes = 0) => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    await this.prisma.$transaction(async (tx) => {
      // 1. Get or create the demo salon
      let salon = await tx.salon.findFirst({
        where: { whatsappNumber: '+919999999999' },
      });

      if (!salon) {
        salon = await tx.salon.create({
          data: {
            name: 'Demo Salon Flow',
            whatsappNumber: '+919999999999',
            address: '123 Main St, New Delhi',
            ownerName: 'Demo Owner',
            isProfileComplete: true,
          },
        });
      } else {
        // Clear all previous entries in topological order to prevent FKey errors
        const salonId = salon.id;
        await tx.cashDrawerLog.deleteMany({ where: { salonId } });
        await tx.commission.deleteMany({ where: { salonId } });
        await tx.reminder.deleteMany({ where: { appointment: { salonId } } });
        await tx.reviewCampaign.deleteMany({ where: { salonId } });
        await tx.rebookingRecommendation.deleteMany({ where: { salonId } });
        await tx.rebookingRule.deleteMany({ where: { salonId } });
        await tx.waitingList.deleteMany({ where: { salonId } });
        await tx.appointment.deleteMany({ where: { salonId } });
        await tx.message.deleteMany({ where: { conversation: { salonId } } });
        await tx.conversation.deleteMany({ where: { salonId } });
        await tx.customer.deleteMany({ where: { salonId } });
        await tx.staffService.deleteMany({ where: { staff: { salonId } } });
        await tx.staff.deleteMany({ where: { salonId } });
        await tx.service.deleteMany({ where: { salonId } });
        await tx.user.deleteMany({ where: { salonId } });
        await tx.subscription.deleteMany({ where: { salonId } });
      }

      const salonId = salon.id;

      // 2. Create the Pro Subscription
      await tx.subscription.create({
        data: {
          salonId,
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
          openaiUsageCost: 42.5,
          whatsappUsageCost: 30.0,
        },
      });

      // 3. Create Demo User (Upsert to prevent unique constraint failures)
      const demoUser = await tx.user.upsert({
        where: { clerkId: 'dev-bypass-user-demo' },
        update: {
          name: 'Demo Owner',
          email: 'demo@salonflow.com',
          role: Role.OWNER,
          salonId,
        },
        create: {
          clerkId: 'dev-bypass-user-demo',
          name: 'Demo Owner',
          email: 'demo@salonflow.com',
          role: Role.OWNER,
          salonId,
        },
      });

      // 4. Create Services
      const s1 = await tx.service.create({
        data: { salonId, name: 'Premium Haircut', durationMins: 45, price: 500.0 },
      });
      const s2 = await tx.service.create({
        data: { salonId, name: 'Deep Tissue Massage', durationMins: 60, price: 1500.0 },
      });
      const s3 = await tx.service.create({
        data: { salonId, name: 'Gold Facial', durationMins: 60, price: 1200.0 },
      });
      const s4 = await tx.service.create({
        data: { salonId, name: 'Spa Pedicure', durationMins: 45, price: 800.0 },
      });
      const s5 = await tx.service.create({
        data: { salonId, name: 'Global Hair Coloring', durationMins: 90, price: 2500.0 },
      });

      // 5. Create Staff
      const st1 = await tx.staff.create({ data: { salonId, name: 'Amit Stylist' } });
      const st2 = await tx.staff.create({ data: { salonId, name: 'Rahul Stylist' } });
      const st3 = await tx.staff.create({ data: { salonId, name: 'Priya Therapist' } });
      const st4 = await tx.staff.create({ data: { salonId, name: 'Nisha Nail Expert' } });

      // 6. Map Staff to Services
      await tx.staffService.createMany({
        data: [
          { staffId: st1.id, serviceId: s1.id },
          { staffId: st1.id, serviceId: s5.id },
          { staffId: st2.id, serviceId: s1.id },
          { staffId: st2.id, serviceId: s2.id },
          { staffId: st3.id, serviceId: s2.id },
          { staffId: st3.id, serviceId: s3.id },
          { staffId: st3.id, serviceId: s4.id },
          { staffId: st4.id, serviceId: s4.id },
        ],
      });

      // 7. Create Commissions
      await tx.commission.createMany({
        data: [
          { salonId, staffId: st1.id, serviceId: s1.id, ratePercent: 10.0 },
          { salonId, staffId: st1.id, serviceId: s5.id, ratePercent: 15.0 },
          { salonId, staffId: st2.id, serviceId: s1.id, ratePercent: 15.0 },
          { salonId, staffId: st2.id, serviceId: s2.id, ratePercent: 20.0 },
          { salonId, staffId: st3.id, serviceId: s2.id, ratePercent: 20.0 },
          { salonId, staffId: st3.id, serviceId: s3.id, ratePercent: 20.0 },
          { salonId, staffId: st3.id, serviceId: s4.id, ratePercent: 20.0 },
          { salonId, staffId: st4.id, serviceId: s4.id, ratePercent: 15.0 },
        ],
      });

      // 8. Create Customers
      const c1 = await tx.customer.create({
        data: { salonId, name: 'Aarav Patel', phone: '+919999990001', source: 'WHATSAPP', totalVisits: 4, lastVisit: daysAgo(5) },
      });
      const c2 = await tx.customer.create({
        data: { salonId, name: 'Riya Sen', phone: '+919999990002', source: 'INSTAGRAM', totalVisits: 2, lastVisit: daysAgo(12) },
      });
      const c3 = await tx.customer.create({
        data: { salonId, name: 'Kabir Kapoor', phone: '+919999990003', source: 'WALK_IN', totalVisits: 8, lastVisit: daysAgo(2) },
      });
      const c4 = await tx.customer.create({
        data: { salonId, name: 'Meera Nair', phone: '+919999990004', source: 'GOOGLE', totalVisits: 1, lastVisit: daysAgo(25) },
      });
      const c5 = await tx.customer.create({
        data: { salonId, name: 'Sarah Khan', phone: '+919999990005', source: 'REFERRAL', totalVisits: 0 },
      });

      // 9. Create Completed Appointments (Past)
      const appt1 = await tx.appointment.create({
        data: {
          salonId,
          customerId: c1.id,
          serviceId: s1.id,
          staffId: st1.id,
          startTime: daysAgo(5, 14), // 5 days ago, 2:00 PM
          endTime: daysAgo(5, 14, 45),
          status: AppointmentStatus.COMPLETED,
          bookingSource: 'ONLINE_WHATSAPP',
          amountPaid: 500.0,
        },
      });

      const appt2 = await tx.appointment.create({
        data: {
          salonId,
          customerId: c3.id,
          serviceId: s2.id,
          staffId: st2.id,
          startTime: daysAgo(2, 16), // 2 days ago, 4:00 PM
          endTime: daysAgo(2, 17),
          status: AppointmentStatus.COMPLETED,
          bookingSource: 'OFFLINE_WALKIN',
          amountPaid: 1500.0,
        },
      });

      const appt3 = await tx.appointment.create({
        data: {
          salonId,
          customerId: c2.id,
          serviceId: s3.id,
          staffId: st3.id,
          startTime: daysAgo(12, 11), // 12 days ago, 11:00 AM
          endTime: daysAgo(12, 12),
          status: AppointmentStatus.COMPLETED,
          bookingSource: 'ONLINE_AI',
          amountPaid: 1200.0,
        },
      });

      const appt4 = await tx.appointment.create({
        data: {
          salonId,
          customerId: c4.id,
          serviceId: s4.id,
          staffId: st4.id,
          startTime: daysAgo(25, 15), // 25 days ago, 3:00 PM
          endTime: daysAgo(25, 15, 45),
          status: AppointmentStatus.COMPLETED,
          bookingSource: 'ONLINE_AI',
          amountPaid: 800.0,
        },
      });

      const appt5 = await tx.appointment.create({
        data: {
          salonId,
          customerId: c3.id,
          serviceId: s3.id,
          staffId: st3.id,
          startTime: daysAgo(10, 13), // 10 days ago, 1:00 PM
          endTime: daysAgo(10, 14),
          status: AppointmentStatus.COMPLETED,
          bookingSource: 'OFFLINE_DESK',
          amountPaid: 1200.0,
        },
      });

      // 10. Create Active/Upcoming Appointments
      const appt6 = await tx.appointment.create({
        data: {
          salonId,
          customerId: c1.id,
          serviceId: s5.id,
          staffId: st1.id,
          startTime: todayAt(17), // Today at 5:00 PM
          endTime: todayAt(18, 30),
          status: AppointmentStatus.CONFIRMED,
          bookingSource: 'ONLINE_WHATSAPP',
          amountPaid: 2500.0,
        },
      });

      const appt7 = await tx.appointment.create({
        data: {
          salonId,
          customerId: c2.id,
          serviceId: s1.id,
          staffId: st2.id,
          startTime: tomorrowAt(11), // Tomorrow at 11:00 AM
          endTime: tomorrowAt(11, 45),
          status: AppointmentStatus.CONFIRMED,
          bookingSource: 'ONLINE_WHATSAPP',
          amountPaid: 500.0,
        },
      });

      // 11. Create Review Campaigns
      await tx.reviewCampaign.create({
        data: {
          salonId,
          customerId: c1.id,
          appointmentId: appt1.id,
          rating: 5,
          feedback: 'Amazing service! Amit was super skilled.',
          completed: true,
          sentAt: daysAgo(5, 15),
        },
      });

      await tx.reviewCampaign.create({
        data: {
          salonId,
          customerId: c3.id,
          appointmentId: appt2.id,
          rating: 5,
          feedback: 'Loved the massage, very relaxing.',
          completed: true,
          sentAt: daysAgo(2, 18),
        },
      });

      await tx.reviewCampaign.create({
        data: {
          salonId,
          customerId: c2.id,
          appointmentId: appt3.id,
          rating: 3,
          feedback: 'Facial was okay, but wait time was long.',
          completed: true,
          resolved: true,
          resolverNotes: 'Offered client free head massage. She was pleased.',
          sentAt: daysAgo(12, 13),
          resolvedAt: daysAgo(11),
        },
      });

      // 12. Create Rebooking Recommendations
      await tx.rebookingRecommendation.create({
        data: {
          salonId,
          customerId: c1.id,
          serviceId: s1.id,
          dueDate: daysAgo(-10), // 10 days in future
          status: 'SENT',
          sentAt: daysAgo(1),
        },
      });

      await tx.rebookingRecommendation.create({
        data: {
          salonId,
          customerId: c2.id,
          serviceId: s3.id,
          dueDate: daysAgo(-18), // 18 days in future
          status: 'PENDING',
        },
      });

      // 13. Create Waiting List Item
      await tx.waitingList.create({
        data: {
          salonId,
          customerId: c5.id,
          serviceId: s2.id,
          requestedStartTime: todayAt(16),
          status: WaitingListStatus.WAITING,
        },
      });

      // 14. Create Conversations & Messages
      const conv1 = await tx.conversation.create({
        data: { salonId, customerId: c1.id, language: 'ENGLISH' },
      });
      await tx.message.createMany({
        data: [
          { conversationId: conv1.id, content: 'Hi, I want to book a haircut today', direction: MessageDirection.INBOUND, timestamp: daysAgo(5, 13) },
          { conversationId: conv1.id, content: 'Sure! We have a slot with Amit at 5pm. Shall I book it?', direction: MessageDirection.OUTBOUND, timestamp: daysAgo(5, 13, 1) },
        ],
      });

      const conv2 = await tx.conversation.create({
        data: { salonId, customerId: c2.id, language: 'HINGLISH' },
      });
      await tx.message.createMany({
        data: [
          { conversationId: conv2.id, content: 'Hi, haircut ke liye timing kya hai?', direction: MessageDirection.INBOUND, timestamp: daysAgo(12, 10) },
          { conversationId: conv2.id, content: 'Humare paas kal 11am ka slot available hai. Kya main book kar doon?', direction: MessageDirection.OUTBOUND, timestamp: daysAgo(12, 10, 1) },
        ],
      });

      // 15. Create Cash Drawer Logs
      await tx.cashDrawerLog.create({
        data: {
          salonId,
          amount: 5000.0,
          actionType: 'OPEN',
          notes: 'Daily opening float',
          createdById: demoUser.id,
        },
      });
    });

    this.logger.log('Demo Salon seeding completed successfully.');
  }
}
