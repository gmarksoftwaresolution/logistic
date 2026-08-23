const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { seller: true, buyer: true, assignments: true }
  });

  const dropShgAssignment = o.assignments.find(a => a.role === 'DROP' && a.assigneeType === 'SHG');
  const dropShgUser = dropShgAssignment
    ? await prisma.user.findFirst({
        where: { id: parseInt(dropShgAssignment.assigneeId, 10) },
        include: { address: true, shgDetail: true }
      })
    : null;

  console.log("Direct SHG-to-SHG Order 116 Drop Contact Resolution:");
  console.log("  dropShgId:", o.dropShgId);
  console.log("  Drop SHG CRP Lead Name:", dropShgUser?.shgDetail?.crpName || dropShgUser?.fullName);
  console.log("  Drop SHG Mobile Number:", dropShgUser?.shgDetail?.crpMobile || dropShgUser?.phoneNumber);
  console.log("  Drop SHG Village:", dropShgUser?.address?.village || o.buyer?.village);
}

main().catch(console.error).finally(() => prisma.$disconnect());
