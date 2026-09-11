const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-111' }, { orderId: 'ORD-2026-111' }, { id: '111' }] },
    include: { seller: true, buyer: true, assignments: true }
  });

  const pickupShgAssignment = o.assignments.find(a => a.role === 'PICKUP' && a.assigneeType === 'SHG');
  const pickupShgUser = pickupShgAssignment
    ? await prisma.user.findFirst({
        where: { id: parseInt(pickupShgAssignment.assigneeId, 10) },
        include: { address: true, shgDetail: true }
      })
    : null;

  console.log("Order 111 Backend Values:");
  console.log("  o.flowType:", o.flowType);
  console.log("  o.seller.village:", o.seller?.village);
  console.log("  o.buyer.village:", o.buyer?.village);
  console.log("  pickupShgUser.village:", pickupShgUser?.address?.village);
  console.log("  pickupShgUser.shgName:", pickupShgUser?.shgDetail?.shgName);
}

main().catch(console.error).finally(() => prisma.$disconnect());
