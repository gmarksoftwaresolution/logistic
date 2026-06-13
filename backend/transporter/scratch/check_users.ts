import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      phoneNumber: true,
      fullName: true,
      applicationStatus: true,
      currentStep: true,
    }
  });
  console.log('--- DATABASE USERS ---');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
