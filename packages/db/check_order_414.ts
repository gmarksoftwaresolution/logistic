import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dropOrder = await prisma.dropOrder.findUnique({
    where: { id: 414 },
    include: {
      masterOrder: true,
      buyer: {
        include: { address: true }
      }
    }
  });

  console.log('--- DROP ORDER 414 ---');
  console.log(JSON.stringify(dropOrder, null, 2));

  if (dropOrder) {
    const pickupOrder = await prisma.pickupOrder.findFirst({
      where: { masterOrderId: dropOrder.masterOrderId },
      include: { seller: true }
    });
    console.log('--- ASSOCIATED PICKUP ORDER ---');
    console.log(JSON.stringify(pickupOrder, null, 2));

    const pickupTrackings = await prisma.pickupTracking.findMany({
      where: { pickupOrderId: pickupOrder?.id },
      orderBy: { createdAt: 'asc' }
    });
    console.log('--- PICKUP TRACKING ---');
    console.log(JSON.stringify(pickupTrackings, null, 2));

    const dropTrackings = await prisma.dropTracking.findMany({
      where: { dropOrderId: dropOrder.id },
      orderBy: { createdAt: 'asc' }
    });
    console.log('--- DROP TRACKING ---');
    console.log(JSON.stringify(dropTrackings, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
