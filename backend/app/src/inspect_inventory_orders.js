const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = ['ORD-2026-113', 'ORD-2026-118', 'ORD-2026-105', 'ORD-2026-114', 'ORD-2026-108'];
  const orders = await prisma.order.findMany({
    where: {
      OR: ids.map(id => ({ id }))
    },
    include: { assignments: true }
  });

  console.log("=== DB State of Inventory Orders ===");
  orders.forEach(o => {
    console.log(`Order ${o.id}:`);
    console.log("  mainStatus:", o.mainStatus);
    console.log("  dropTransporterStatus:", o.dropTransporterStatus);
    console.log("  pickupTransporterStatus:", o.pickupTransporterStatus);
    console.log("  returnType:", o.returnType);
    console.log("  phase:", o.phase);
    console.log("  flowType:", o.flowType);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
