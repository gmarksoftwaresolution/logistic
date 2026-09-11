const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { seller: true, buyer: true, assignments: true }
  });

  const transporterIds = o.assignments
    .filter(a => a.assigneeType === 'TRANSPORTER')
    .map(a => parseInt(a.assigneeId, 10))
    .filter(id => !isNaN(id));

  const transporters = await prisma.user.findMany({
    where: { id: { in: transporterIds } },
    include: { transporterDetail: true }
  });

  const t = transporters[0];
  console.log("Transporter for Order 116:");
  console.log("  Full Name:", t?.fullName);
  console.log("  Phone Number:", t?.phoneNumber);
  console.log("  Vehicle Number:", (t?.transporterDetail)?.vehicleNumber || (t?.transporterDetail)?.registrationNumber);
}

main().catch(console.error).finally(() => prisma.$disconnect());
