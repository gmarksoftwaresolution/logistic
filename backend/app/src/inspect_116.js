const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { seller: true, buyer: true, parcels: true, assignments: true }
  });

  console.log("Order 116 Details:", JSON.stringify(o, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
