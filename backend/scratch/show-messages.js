const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function show() {
  const messages = await prisma.message.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
  });
  
  for (const m of messages.reverse()) {
    console.log(`[${m.direction}] ${m.content} (Time: ${m.timestamp.toISOString()})`);
  }
}
show().finally(() => prisma.$disconnect().then(() => pool.end()));
