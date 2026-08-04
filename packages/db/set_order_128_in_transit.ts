import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderId: 'ORD-2026-128', phase: 'PICKUP' }
  });

  if (order) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        mainStatus: 'IN_TRANSIT_TO_HUB',
        pickupTransporterStatus: 'IN_TRANSIT_TO_HUB',
        storedAt: null,
      }
    });
    console.log(`Order ORD-2026-128 is now IN_TRANSIT_TO_HUB in DB for manual user testing!`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
