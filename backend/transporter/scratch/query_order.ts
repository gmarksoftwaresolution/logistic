process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Find the pickup order by ID
    // The pickup order ID in the database is numeric. Since the app prepends "pickup-", the DB id is 48.
    const pickupOrder = await prisma.pickupOrder.findUnique({
      where: { id: 48 },
      include: { seller: true }
    });

    console.log('--- PICKUP ORDER 48 ---');
    console.log(JSON.stringify(pickupOrder, null, 2));

    // 2. Find associated drop orders
    if (pickupOrder) {
      const dropOrders = await prisma.dropOrder.findMany({
        where: { masterOrderId: pickupOrder.masterOrderId },
        include: { buyer: true }
      });
      console.log('--- ASSOCIATED DROP ORDERS ---');
      console.log(JSON.stringify(dropOrders, null, 2));
    }

  } catch (err: any) {
    console.error('Script error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
