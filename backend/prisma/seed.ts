import 'dotenv/config';
import { PrismaClient, Role, AppointmentStatus, SubscriptionPlan } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Clean up existing data to ensure idempotency
  await prisma.cashDrawerLog.deleteMany({});
  await prisma.commission.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.reviewCampaign.deleteMany({});
  await prisma.rebookingRecommendation.deleteMany({});
  await prisma.rebookingRule.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.staffService.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.salon.deleteMany({});
  await prisma.lead.deleteMany({});

  // 1. Create a Mock Salon
  const salon = await prisma.salon.create({
    data: {
      name: 'Elegance Salon & Spa',
      whatsappNumber: '+919876543210',
      address: '123 MG Road, Bengaluru, India',
      aiPrompt: 'You are an AI receptionist for Elegance Salon. Be polite and helpful.',
      subscription: {
        create: {
          plan: SubscriptionPlan.PRO,
        },
      },
    },
  });
  console.log(`Created salon: ${salon.name}`);

  // 2. Create Services
  const haircutService = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Premium Haircut',
      durationMins: 45,
      price: 500.0,
    },
  });

  const spaService = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Deep Tissue Massage',
      durationMins: 60,
      price: 1500.0,
    },
  });
  console.log(`Created services: ${haircutService.name}, ${spaService.name}`);

  // 3. Create Staff
  const staff1 = await prisma.staff.create({
    data: {
      salonId: salon.id,
      name: 'Rahul Stylist',
    },
  });
  const staff2 = await prisma.staff.create({
    data: {
      salonId: salon.id,
      name: 'Amit Stylist',
    },
  });
  console.log(`Created staff: ${staff1.name}, ${staff2.name}`);

  // Create Staff-Service Qualifications
  await prisma.staffService.createMany({
    data: [
      { staffId: staff1.id, serviceId: haircutService.id },
      { staffId: staff1.id, serviceId: spaService.id },
      { staffId: staff2.id, serviceId: haircutService.id }, // Amit only does haircuts
    ],
  });
  console.log('Created Staff-Service qualification mappings.');

  // 4. Create an Admin User (mock Clerk ID)
  const user = await prisma.user.create({
    data: {
      salonId: salon.id,
      clerkId: 'dev-bypass-user-id',
      name: 'Devender Sharma',
      email: 'dev@salonflow.com',
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`Created owner: ${user.name}`);

  // 5. Create a Mock Customer
  const customer = await prisma.customer.create({
    data: {
      salonId: salon.id,
      name: 'Anjali Sharma',
      phone: '+919999999999',
      totalVisits: 1,
    },
  });
  console.log(`Created customer: ${customer.name}`);

  // 6. Create Commission Rates for Rahul Stylist
  const commission1 = await prisma.commission.create({
    data: {
      salonId: salon.id,
      staffId: staff1.id,
      serviceId: haircutService.id,
      ratePercent: 15.0,
    },
  });

  const commission2 = await prisma.commission.create({
    data: {
      salonId: salon.id,
      staffId: staff1.id,
      serviceId: spaService.id,
      ratePercent: 20.0,
    },
  });

  // Create commission rate for Amit Stylist
  await prisma.commission.create({
    data: {
      salonId: salon.id,
      staffId: staff2.id,
      serviceId: haircutService.id,
      ratePercent: 10.0,
    },
  });
  console.log(`Created commission rates for ${staff1.name} and ${staff2.name}`);

  // 7. Create a completed appointment to test commissions
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const completedAppointment = await prisma.appointment.create({
    data: {
      salonId: salon.id,
      customerId: customer.id,
      serviceId: haircutService.id,
      staffId: staff1.id,
      startTime: threeDaysAgo,
      endTime: new Date(threeDaysAgo.getTime() + 45 * 60 * 1000),
      status: AppointmentStatus.COMPLETED,
      bookingSource: 'OFFLINE_DESK',
      amountPaid: 500.0,
    },
  });
  console.log(`Created completed appointment to test commissions: ${completedAppointment.id}`);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
