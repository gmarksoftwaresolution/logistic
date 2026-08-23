const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-111' }, { orderId: 'ORD-2026-111' }, { id: '111' }] },
    include: { buyer: true, seller: true, assignments: true }
  });

  console.log("Order 111 SHG Assignment Details:");
  console.log("  pickupShgId:", o.pickupShgId);
  console.log("  dropShgId:", o.dropShgId);
  console.log("  buyer.village:", o.buyer?.village);
  console.log("  assignments:", o.assignments);

  const shgs = await prisma.user.findMany({
    where: { role: 'SHG' },
    include: { address: true }
  });

  console.log("\nRegistered SHG Users:");
  shgs.forEach(u => {
    console.log(`  SHG ID ${u.id} (${u.fullName}): village = ${u.address?.village}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
