import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:salonsflowpassword123@localhost:5432/salonsflow?schema=public';
console.log('Connecting to database:', connectionString);

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const salons = await prisma.salon.findMany({
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      whatsappPhoneNumberId: true,
      whatsappBusinessAccountId: true,
      isProfileComplete: true,
    }
  });
  console.log('SALONS:', JSON.stringify(salons, null, 2));

  // Let's also query the audit logs for WhatsApp issues
  const logs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ['WHATSAPP_CONNECTION_UPDATE', 'WHATSAPP_MESSAGES_UPSERT_TRIGGERED']
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });
  console.log('RELEVANT AUDIT LOGS:', JSON.stringify(logs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
