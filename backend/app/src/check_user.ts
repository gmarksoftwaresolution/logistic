import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phoneNumber: '9999999993' },
        { phoneNumber: '+9199999993' }
      ]
    },
    include: { shgDetail: true, address: true }
  });
  console.log('--- USER 9999999993 ---');
  console.log(JSON.stringify(users, null, 2));
}

check().finally(() => prisma.$disconnect());
