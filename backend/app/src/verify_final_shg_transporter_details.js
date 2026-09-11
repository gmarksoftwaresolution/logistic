const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { seller: true, buyer: true, assignments: true }
  });

  const transporterAssignment = o.assignments.find(a => a.assigneeType === 'TRANSPORTER');
  const transporterUser = transporterAssignment
    ? await prisma.user.findFirst({
        where: { id: parseInt(transporterAssignment.assigneeId, 10) },
        include: { address: true, transporterDetail: true }
      })
    : null;

  console.log("Transporter details resolved for Order 116:");
  console.log("  transporterName:", transporterUser?.fullName);
  console.log("  transporterMobile:", transporterUser?.phoneNumber);
  console.log("  vehicleNumber:", (transporterUser?.transporterDetail)?.vehicleNumber || 'MH-09-XX-1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());
