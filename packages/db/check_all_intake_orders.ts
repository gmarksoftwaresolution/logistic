import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      phase: 'PICKUP',
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log('Recent 20 PICKUP Orders:');
  orders.forEach(o => {
    console.log(`- ID: ${o.id} | orderId: ${o.orderId} | mainStatus: ${o.mainStatus} | transporterStatus: ${o.pickupTransporterStatus} | storedAt: ${o.storedAt}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
