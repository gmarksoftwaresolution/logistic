import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const drop = await prisma.dropOrder.findUnique({
    where: { id: 352 },
    include: {
      tracking: true,
    }
  });
  console.log('DropOrder 352 Tracking:', JSON.stringify(drop, null, 2));

  const pickup = await prisma.pickupOrder.findUnique({
    where: { id: 299 },
    include: {
      tracking: true,
    }
  });
  console.log('PickupOrder 299 Tracking:', JSON.stringify(pickup, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
