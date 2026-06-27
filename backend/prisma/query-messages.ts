import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/salonflow?schema=public";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Retrieving conversations and messages...");
  const conversations = await prisma.conversation.findMany({
    include: {
      customer: true,
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (conversations.length === 0) {
    console.log("No conversations found in the database.");
    return;
  }

  for (const convo of conversations) {
    console.log("\n==================================================");
    console.log(`Customer: ${convo.customer.name} (${convo.customer.phone})`);
    console.log(`Language: ${convo.language}`);
    console.log("--------------------------------------------------");
    
    for (const msg of convo.messages) {
      const timeStr = new Date(msg.timestamp).toLocaleString();
      const direction = msg.direction === "INBOUND" ? "👤 CLIENT QUERY" : "🤖 AUTO-REPLY";
      console.log(`[${timeStr}] ${direction}:`);
      console.log(`   ${msg.content}`);
    }
  }
}

main()
  .catch(e => {
    console.error("Error querying messages:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
