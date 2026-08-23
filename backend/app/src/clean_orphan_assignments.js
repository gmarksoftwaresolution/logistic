const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({ select: { id: true } });
  const validOrderIds = new Set(orders.map(o => o.id));

  const assignments = await prisma.orderAssignment.findMany();
  let count = 0;
  for (const a of assignments) {
    if (!validOrderIds.has(a.orderId)) {
      await prisma.orderAssignment.delete({ where: { id: a.id } });
      count++;
    }
  }

  console.log(`Deleted ${count} orphan OrderAssignments`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
