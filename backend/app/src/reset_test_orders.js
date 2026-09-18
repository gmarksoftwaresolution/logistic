require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.order.updateMany({
    where: { OR: [{ orderId: 'ORD-2026-105' }, { id: 'ORD-2026-105' }, { orderId: 'ORD-2026-115' }, { id: 'ORD-2026-115' }] },
    data: {
      returnType: 'BUYER_RETURN',
      mainStatus: 'RETURN_SHG_ACCEPTED',
      pickupShgStatus: 'PENDING',
      dropShgStatus: 'PENDING'
    }
  });
  console.log('Successfully reset ORD-2026-105 and ORD-2026-115 to RETURN_SHG_ACCEPTED / PENDING for user testing.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
