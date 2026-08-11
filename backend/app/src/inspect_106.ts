import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check106() {
  const orders = await prisma.order.findMany({
    include: {
      seller: true,
      buyer: true,
      parcels: true
    }
  });

  const target = orders.find(o => String(o.id).includes('106') || String(o.orderId).includes('106'));
  console.log('--- FOUND ORDER 106 ---');
  console.log(JSON.stringify(target, null, 2));
}

check106().finally(() => prisma.$disconnect());
