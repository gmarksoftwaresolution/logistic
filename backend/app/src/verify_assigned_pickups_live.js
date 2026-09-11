const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }] },
    select: {
      id: true,
      orderId: true,
      phase: true,
      flowType: true,
      mainStatus: true,
      seller: { select: { village: true } },
      buyer: { select: { village: true } }
    }
  });

  console.log("Prisma query result with flowType: true:", JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
