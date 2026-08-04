import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: { phase: 'PICKUP' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      orderId: true,
      mainStatus: true,
      pickupTransporterStatus: true,
      storedAt: true,
    }
  });

  console.log('Recent 15 PICKUP Orders in DB:');
  console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
