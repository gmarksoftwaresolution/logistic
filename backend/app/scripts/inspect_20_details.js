require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderId: true,
      phase: true,
      returnType: true,
      mainStatus: true,
      pickupShgStatus: true,
      isPickupRedirected: true,
    }
  });

  console.log(`TOTAL ORDERS IN DB: ${orders.length}`);
  orders.forEach((o, idx) => {
    console.log(`${idx + 1}. ${o.orderId} | phase: ${o.phase} | mainStatus: ${o.mainStatus} | returnType: ${o.returnType} | isPickupRedirected: ${o.isPickupRedirected}`);
  });
}

main().finally(() => prisma.$disconnect());
