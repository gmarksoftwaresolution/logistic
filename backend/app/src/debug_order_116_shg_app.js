const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { seller: true, buyer: true, assignments: true }
  });

  console.log("Order 116 DB Details:");
  console.log("  id:", o.id);
  console.log("  orderId:", o.orderId);
  console.log("  flowType:", o.flowType);
  console.log("  phase:", o.phase);
  console.log("  mainStatus:", o.mainStatus);
  console.log("  pickupShgId:", o.pickupShgId);
  console.log("  dropShgId:", o.dropShgId);
  console.log("  pickupShgStatus:", o.pickupShgStatus);
  console.log("  dropShgStatus:", o.dropShgStatus);
  console.log("  Assignments:");
  for (const a of o.assignments) {
    console.log(`    - id: ${a.id}, assigneeId: ${a.assigneeId}, assigneeType: ${a.assigneeType}, role: ${a.role}, status: ${a.status}`);
  }

  // Find the Drop SHG user in DB
  const dropShgUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: parseInt(o.dropShgId, 10) },
        { authId: o.dropShgId }
      ]
    },
    include: { address: true, shgDetail: true }
  });

  console.log("\nAssigned Drop SHG User:");
  console.log("  ID:", dropShgUser?.id);
  console.log("  authId:", dropShgUser?.authId);
  console.log("  Name:", dropShgUser?.fullName);
  console.log("  Phone:", dropShgUser?.phoneNumber);
  console.log("  Village:", dropShgUser?.address?.village);
}

main().catch(console.error).finally(() => prisma.$disconnect());
