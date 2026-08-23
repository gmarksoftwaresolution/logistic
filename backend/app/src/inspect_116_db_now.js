const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { seller: true, buyer: true, assignments: true }
  });

  console.log("Order 116 DB State NOW:");
  console.log("  id:", o.id);
  console.log("  flowType:", o.flowType);
  console.log("  phase:", o.phase);
  console.log("  mainStatus:", o.mainStatus);
  console.log("  pickupShgId:", o.pickupShgId);
  console.log("  dropShgId:", o.dropShgId);
  console.log("  pickupTransporterId:", o.pickupTransporterId);
  console.log("  dropTransporterId:", o.dropTransporterId);
  console.log("  pickupShgStatus:", o.pickupShgStatus);
  console.log("  pickupTransporterStatus:", o.pickupTransporterStatus);
  console.log("  dropShgStatus:", o.dropShgStatus);
  console.log("  dropTransporterStatus:", o.dropTransporterStatus);
  console.log("  Assignments:");
  for (const a of o.assignments) {
    console.log(`    - id: ${a.id}, assigneeId: ${a.assigneeId}, assigneeType: ${a.assigneeType}, role: ${a.role}, status: ${a.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
