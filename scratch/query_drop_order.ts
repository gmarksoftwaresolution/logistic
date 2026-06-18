import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const drop = await prisma.dropOrder.findUnique({
    where: { id: 352 },
    include: {
      masterOrder: true,
    }
  });
  console.log('DropOrder 352:', JSON.stringify(drop, null, 2));
}

main().finally(() => prisma.$disconnect());
