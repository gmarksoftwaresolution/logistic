import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      phase: 'PICKUP',
      mainStatus: 'IN_TRANSIT_TO_HUB',
    },
    select: {
      id: true,
      orderId: true,
      mainStatus: true,
      pickupTransporterStatus: true,
      storedAt: true,
    }
  });

  console.log('Orders currently IN_TRANSIT_TO_HUB in DB:');
  console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
