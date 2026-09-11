const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testShgAssigned(userId, userName) {
  console.log(`\n=== Testing getAssignedOrders for SHG User ${userId} (${userName}) ===`);
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { pickupShgId: String(userId) },
        { dropShgId: String(userId) },
        { assignments: { some: { assigneeId: String(userId), status: { in: ['ACCEPTED', 'PENDING'] } } } }
      ]
    },
    select: { id: true, orderId: true, mainStatus: true, phase: true, dropShgId: true, pickupShgId: true }
  });

  console.log(`Found ${orders.length} orders for ${userName}:`);
  orders.forEach(o => {
    console.log(`  - Order ${o.id}: mainStatus=${o.mainStatus}, phase=${o.phase}, pickupShgId=${o.pickupShgId}, dropShgId=${o.dropShgId}`);
  });
}

async function main() {
  await testShgAssigned(144, "Anita Patil (Nesari)");
  await testShgAssigned(145, "Rutuja (Inchanal)");
  await testShgAssigned(142, "Adwaita Shinde (Hitni)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
