const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-113' }, { orderId: 'ORD-2026-113' }, { id: '113' }] },
    include: { assignments: true, seller: true, buyer: true }
  });

  if (!order) {
    console.log("Order 113 not found!");
    return;
  }

  console.log("=== Order 113 Full DB State ===");
  console.log("ID:", order.id);
  console.log("orderId:", order.orderId);
  console.log("mainStatus:", order.mainStatus);
  console.log("phase:", order.phase);
  console.log("flowType:", order.flowType);
  console.log("dropShgId:", order.dropShgId);
  console.log("dropShgStatus:", order.dropShgStatus);
  console.log("dropTransporterId:", order.dropTransporterId);
  console.log("dropTransporterStatus:", order.dropTransporterStatus);
  console.log("\nAssignments:");
  order.assignments.forEach(a => {
    console.log(`  - Role: ${a.role}, Type: ${a.assigneeType}, AssigneeId: ${a.assigneeId}, Status: ${a.status}`);
  });

  // Check drop SHG user details
  if (order.dropShgId) {
    const dropUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: Number(order.dropShgId) || -1 },
          { authId: order.dropShgId }
        ]
      },
      include: { address: true, shgDetail: true }
    });
    console.log("\nDrop SHG User Details in DB:");
    if (dropUser) {
      console.log(`  User ID: ${dropUser.id}, Auth ID: ${dropUser.authId}, Name: ${dropUser.fullName}, Phone: ${dropUser.phoneNumber}, Village: ${dropUser.address?.village}`);
    } else {
      console.log("  No matching user found for dropShgId:", order.dropShgId);
    }
  }

  // Check all SHG Users in village of buyer
  console.log("\nBuyer Village:", order.buyer?.village || order.buyerVillage);
}

main().catch(console.error).finally(() => prisma.$disconnect());
