require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const orders = await prisma.order.findMany({
    where: { flowType: 'DIRECT_SHG_TO_SHG' },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderId: true,
      flowType: true,
      phase: true,
      mainStatus: true,
      seller: { select: { village: true, sellerName: true } },
      buyer: { select: { village: true, buyerName: true } },
    }
  });

  console.log('=== DIRECT SHG-TO-SHG TEST ORDERS IN DB ===');
  orders.forEach((o) => {
    console.log(`OrderID: ${o.orderId} | Status: ${o.mainStatus} | Route: ${o.seller?.village} -> ${o.buyer?.village} | Seller: ${o.seller?.sellerName} | Buyer: ${o.buyer?.buyerName}`);
  });
}

main().finally(async () => { await prisma.$disconnect(); });
