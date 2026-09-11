const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { flowType: 'DIRECT_SHG_TO_SHG' },
        { flowType: 'shg_to_shg' }
      ]
    },
    include: {
      seller: true,
      buyer: true,
      assignments: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`Inspecting ${orders.length} direct SHG-to-SHG orders:`);
  for (const o of orders) {
    console.log(`\nOrder ID: ${o.id} (${o.orderId})`);
    console.log(`  flowType: ${o.flowType}`);
    console.log(`  pickupShgId: ${o.pickupShgId}`);
    console.log(`  dropShgId: ${o.dropShgId}`);
    console.log(`  pickupTransporterId: ${o.pickupTransporterId}`);
    console.log(`  dropTransporterId: ${o.dropTransporterId}`);
    console.log(`  mainStatus: ${o.mainStatus}, pickupShgStatus: ${o.pickupShgStatus}, dropShgStatus: ${o.dropShgStatus}`);
    console.log(`  Assignments (${o.assignments.length}):`);
    for (const a of o.assignments) {
      console.log(`    - ID: ${a.id}, assigneeId: ${a.assigneeId}, assigneeType: ${a.assigneeType}, role: ${a.role}, status: ${a.status}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
