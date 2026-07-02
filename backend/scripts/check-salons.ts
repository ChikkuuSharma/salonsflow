import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const salons = await prisma.salon.findMany({
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      whatsappPhoneNumberId: true,
      whatsappBusinessAccountId: true,
      whatsappAccessToken: true,
      isProfileComplete: true,
    }
  });
  console.log('SALONS:', JSON.stringify(salons, null, 2));
}
main().finally(() => prisma.$disconnect());
