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

  const dropShgAssignment = o.assignments.find(a => a.role === 'DROP' && a.assigneeType === 'SHG');
  const dropShgUser = dropShgAssignment
    ? await prisma.user.findFirst({
        where: { id: parseInt(dropShgAssignment.assigneeId, 10) },
        include: { address: true, shgDetail: true }
      })
    : null;

  console.log("Order 111 Resolved Both Cards:");
  console.log("Card 1 (Pickup Location Contact):");
  console.log("  Person Name:", pickupShgUser?.shgDetail?.crpName || pickupShgUser?.fullName || o.seller?.sellerName);
  console.log("  Phone Number:", pickupShgUser?.shgDetail?.crpMobile || pickupShgUser?.phoneNumber || o.seller?.mobileNumber);
  console.log("  Village:", pickupShgUser?.address?.village || o.seller?.village);

  console.log("\nCard 2 (Drop Location Contact):");
  console.log("  Person Name:", dropShgUser?.shgDetail?.crpName || dropShgUser?.fullName || o.buyer?.buyerName);
  console.log("  Phone Number:", dropShgUser?.shgDetail?.crpMobile || dropShgUser?.phoneNumber || o.buyer?.mobileNumber);
  console.log("  Village:", dropShgUser?.address?.village || o.buyer?.village);
}

main().catch(console.error).finally(() => prisma.$disconnect());
