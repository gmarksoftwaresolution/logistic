const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Inspecting Orders for Anita Patil (User 144 / authId 144 / phone 9000000005) ===");

  const orders113 = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-113' }, { orderId: 'ORD-2026-113' }] },
    include: { assignments: true }
  });

  console.log("Order 113 DB State:");
  console.log("  id:", orders113?.id);
  console.log("  mainStatus:", orders113?.mainStatus);
  console.log("  phase:", orders113?.phase);
  console.log("  pickupShgId:", orders113?.pickupShgId);
  console.log("  dropShgId:", orders113?.dropShgId);
  console.log("  dropShgStatus:", orders113?.dropShgStatus);
  console.log("  assignments:", orders113?.assignments.map(a => `${a.role}:${a.assigneeType}:${a.assigneeId}:${a.status}`));

  const orders118 = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-118' }, { orderId: 'ORD-2026-118' }] },
    include: { assignments: true }
  });

  console.log("\nOrder 118 DB State:");
  console.log("  id:", orders118?.id);
  console.log("  mainStatus:", orders118?.mainStatus);
  console.log("  phase:", orders118?.phase);
  console.log("  pickupShgId:", orders118?.pickupShgId);
  console.log("  dropShgId:", orders118?.dropShgId);
  console.log("  dropShgStatus:", orders118?.dropShgStatus);
  console.log("  assignments:", orders118?.assignments.map(a => `${a.role}:${a.assigneeType}:${a.assigneeId}:${a.status}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
