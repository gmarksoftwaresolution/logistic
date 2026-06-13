process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING CLEANUP OF NON-PENDING ORDERS ---');

  // 1. Fetch non-pending pickups and drops
  const nonPendingPickups = await prisma.pickupOrder.findMany({
    where: {
      status: { not: 'PENDING' }
    },
    select: { id: true }
  });
  const pickupIds = nonPendingPickups.map(p => p.id);

  const nonPendingDrops = await prisma.dropOrder.findMany({
    where: {
      status: { not: 'PENDING' }
    },
    select: { id: true }
  });
  const dropIds = nonPendingDrops.map(d => d.id);

  console.log(`Found ${pickupIds.length} non-pending Pickup Orders to delete.`);
  console.log(`Found ${dropIds.length} non-pending Drop Orders to delete.`);

  // 2. Delete relations and orders in a transaction
  await prisma.$transaction(async (tx) => {
    if (pickupIds.length > 0) {
      await tx.pickupTracking.deleteMany({
        where: { pickupOrderId: { in: pickupIds } }
      });
      await tx.pickupOrderItem.deleteMany({
        where: { pickupOrderId: { in: pickupIds } }
      });
      await tx.pickupOrder.deleteMany({
        where: { id: { in: pickupIds } }
      });
    }

    if (dropIds.length > 0) {
      await tx.dropTracking.deleteMany({
        where: { dropOrderId: { in: dropIds } }
      });
      await tx.dropOrderItem.deleteMany({
        where: { dropOrderId: { in: dropIds } }
      });
      await tx.dropOrder.deleteMany({
        where: { id: { in: dropIds } }
      });
    }
  });

  console.log('Cleanup completed successfully.');
}

main()
  .catch((e) => {
    console.error('Cleanup error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
