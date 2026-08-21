require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const orders = await prisma.order.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderId: true,
      flowType: true,
      phase: true,
      mainStatus: true,
      seller: { select: { village: true } },
      buyer: { select: { village: true } },
    }
  });

  console.log('=== NORMAL FLOW ORDERS (VIA_HUB) ===');
  orders.filter(o => o.flowType === 'VIA_HUB' || !o.flowType).forEach(o => {
    console.log(`OrderID: ${o.orderId} | Status: ${o.mainStatus} | ${o.seller?.village} -> ${o.buyer?.village}`);
  });

  console.log('\n=== DIRECT SHG-TO-SHG ORDERS (DIRECT_SHG_TO_SHG) ===');
  orders.filter(o => o.flowType === 'DIRECT_SHG_TO_SHG').forEach(o => {
    console.log(`OrderID: ${o.orderId} | Status: ${o.mainStatus} | ${o.seller?.village} -> ${o.buyer?.village}`);
  });
}

main().finally(async () => { await prisma.$disconnect(); });
