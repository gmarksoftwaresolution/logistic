const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { id: 145 },
    include: { address: true, shgDetail: true }
  });

  console.log("Found Drop SHG User 145:");
  console.log("  Name:", user.fullName);
  console.log("  Phone:", user.phoneNumber);
  console.log("  Village:", user.address?.village);

  const shgUuid = String(user.id);
  const shgAuthId = user.authId || '';

  const assignedOrders = await prisma.orderAssignment.findMany({
    where: {
      assigneeId: { in: [shgUuid, shgAuthId].filter(Boolean) },
      assigneeType: 'SHG',
      status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
    },
    select: { orderId: true, role: true }
  });

  const assignedOrderIds = assignedOrders.map(a => a.orderId);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { id: { in: assignedOrderIds } },
        { orderId: { in: assignedOrderIds } },
        { pickupShgId: shgUuid },
        { pickupShgId: shgAuthId },
        { dropShgId: shgUuid },
        { dropShgId: shgAuthId },
      ]
    },
    include: { seller: true, buyer: true, assignments: true }
  });

  console.log(`\nFound ${orders.length} assigned orders in DB for SHG 145 (Rutuja):`);
  for (const o of orders) {
    console.log(`  - Order ID: ${o.id} (${o.orderId}), flowType: ${o.flowType}, mainStatus: ${o.mainStatus}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
