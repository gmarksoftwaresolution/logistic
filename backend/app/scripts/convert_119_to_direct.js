require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  await prisma.order.updateMany({
    where: { orderId: 'ORD-2026-119' },
    data: { flowType: 'DIRECT_SHG_TO_SHG' }
  });
  console.log('Updated ORD-2026-119 to DIRECT_SHG_TO_SHG!');
}

main().finally(async () => { await prisma.$disconnect(); });
