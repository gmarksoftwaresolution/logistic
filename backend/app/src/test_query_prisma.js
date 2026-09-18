require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o1 = await prisma.order.findMany({
    where: {
      NOT: { returnType: 'BUYER_RETURN' },
      orderId: { in: ['ORD-2026-105', 'ORD-2026-115'] }
    }
  });
  console.log('NOT BUYER_RETURN count:', o1.length);

  const o2 = await prisma.order.findMany({
    where: {
      returnType: 'BUYER_RETURN',
      orderId: { in: ['ORD-2026-105', 'ORD-2026-115'] }
    }
  });
  console.log('BUYER_RETURN count:', o2.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
