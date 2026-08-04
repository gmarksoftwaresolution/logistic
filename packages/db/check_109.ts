import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderId: 'ORD-2026-109' },
        { orderId: '109' }
      ]
    }
  });

  console.log('Orders found for 109:');
  orders.forEach(o => console.log({ id: o.id, orderId: o.orderId, phase: o.phase, mainStatus: o.mainStatus, sellerId: o.sellerId, buyerId: o.buyerId }));
}

main().catch(console.error).finally(() => prisma.$disconnect());
