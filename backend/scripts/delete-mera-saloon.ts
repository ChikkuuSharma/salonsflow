import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:salonsflowpassword123@localhost:5432/salonsflow?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- SEARCHING FOR "mera saloon" / "mera salon" RECORDS ---');

  const matchingSalons = await prisma.salon.findMany({
    where: {
      OR: [
        { name: { contains: 'mera', mode: 'insensitive' } },
        { name: { contains: 'saloon', mode: 'insensitive' } },
        { ownerEmail: { contains: 'mera', mode: 'insensitive' } },
        { ownerName: { contains: 'mera', mode: 'insensitive' } },
      ],
    },
  });

  console.log('Matching Salons Found:', matchingSalons.length);
  console.log(JSON.stringify(matchingSalons, null, 2));

  const matchingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'mera', mode: 'insensitive' } },
        { email: { contains: 'mera', mode: 'insensitive' } },
        { email: { contains: 'saloon', mode: 'insensitive' } },
      ],
    },
  });

  console.log('Matching Users Found:', matchingUsers.length);
  console.log(JSON.stringify(matchingUsers, null, 2));

  const matchingLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { leadName: { contains: 'mera', mode: 'insensitive' } },
        { salonName: { contains: 'mera', mode: 'insensitive' } },
        { salonName: { contains: 'saloon', mode: 'insensitive' } },
      ],
    },
  });

  console.log('Matching Leads Found:', matchingLeads.length);
  console.log(JSON.stringify(matchingLeads, null, 2));

  // Perform Cascade Deletion for matching Salons
  for (const salon of matchingSalons) {
    console.log(`Deleting dependencies and salon: ${salon.name} (ID: ${salon.id})...`);
    
    // 1. Delete appointments & waiting list
    await prisma.appointment.deleteMany({ where: { salonId: salon.id } });
    await prisma.waitingList.deleteMany({ where: { salonId: salon.id } });

    // 2. Delete messages & conversations
    const convos = await prisma.conversation.findMany({ where: { salonId: salon.id }, select: { id: true } });
    const convoIds = convos.map(c => c.id);
    if (convoIds.length > 0) {
      await prisma.voiceNote.deleteMany({ where: { message: { conversationId: { in: convoIds } } } });
      await prisma.message.deleteMany({ where: { conversationId: { in: convoIds } } });
      await prisma.conversation.deleteMany({ where: { salonId: salon.id } });
    }

    // 3. Delete services, staff, customers, commissions, campaigns, etc.
    await prisma.service.deleteMany({ where: { salonId: salon.id } });
    await prisma.staff.deleteMany({ where: { salonId: salon.id } });
    await prisma.customer.deleteMany({ where: { salonId: salon.id } });
    await prisma.commission.deleteMany({ where: { salonId: salon.id } });
    await prisma.campaign.deleteMany({ where: { salonId: salon.id } });
    await prisma.whatsAppSession.deleteMany({ where: { salonId: salon.id } });
    await prisma.subscription.deleteMany({ where: { salonId: salon.id } });
    await prisma.auditLog.deleteMany({ where: { salonId: salon.id } });

    // 4. Delete users belonging to salon
    await prisma.user.deleteMany({ where: { salonId: salon.id } });

    // 5. Delete salon record
    await prisma.salon.delete({ where: { id: salon.id } });
    console.log(`Salon ${salon.name} deleted successfully!`);
  }

  // Delete matching standalone users
  for (const user of matchingUsers) {
    console.log(`Deleting matching user: ${user.name} / ${user.email} (ID: ${user.id})...`);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }

  // Delete matching leads
  for (const lead of matchingLeads) {
    console.log(`Deleting matching lead: ${lead.leadName} / ${lead.salonName} (ID: ${lead.id})...`);
    await prisma.lead.delete({ where: { id: lead.id } }).catch(() => {});
  }

  console.log('--- PURGE COMPLETED ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
