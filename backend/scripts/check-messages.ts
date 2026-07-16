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
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('CAMPAIGNS:', JSON.stringify(campaigns, null, 2));

  const messages = await prisma.message.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: {
      conversation: {
        include: {
          customer: true
        }
      }
    }
  });
  console.log('RECENT MESSAGES:', JSON.stringify(messages, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
