import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transporters = await prisma.user.findMany({
    where: {
      role: UserRole.TRANSPORTER,
    },
    select: {
      id: true,
      phoneNumber: true,
      applicationStatus: true,
      currentStep: true,
    }
  });
  console.log('Transporters in DB:', JSON.stringify(transporters, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
