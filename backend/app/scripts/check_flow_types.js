require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderId: true,
      flowType: true,
      mainStatus: true,
      seller: { select: { village: true } },
      buyer: { select: { village: true } }
    },
    orderBy: { orderId: 'asc' }
  });

  console.log('=== ALL ORDERS IN DB & THEIR FLOW TYPES ===');
  orders.forEach(o => {
    console.log(`ID: ${o.id} | OrderID: ${o.orderId} | flowType: "${o.flowType}" | status: ${o.mainStatus} | Route: ${o.seller?.village} -> ${o.buyer?.village}`);
  });
}

main().finally(async () => { await prisma.$disconnect(); });
