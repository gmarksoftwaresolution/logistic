require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  // Set ORD-2026-117 as DIRECT_SHG_TO_SHG test order
  await prisma.order.updateMany({
    where: { orderId: 'ORD-2026-117' },
    data: { flowType: 'DIRECT_SHG_TO_SHG' }
  });

  // Ensure ORD-2026-120 is VIA_HUB (Normal Flow)
  await prisma.order.updateMany({
    where: { orderId: 'ORD-2026-120' },
    data: { flowType: 'VIA_HUB' }
  });

  console.log('Successfully configured test orders!');
}

main().finally(async () => { await prisma.$disconnect(); });
