const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.order.updateMany({
    where: {
      OR: [{ id: 'ORD-2026-111' }, { orderId: 'ORD-2026-111' }, { id: '111' }]
    },
    data: {
      mainStatus: 'IN_TRANSIT',
      pickupShgStatus: 'COMPLETED',
      pickupTransporterStatus: 'COMPLETED',
      pickupTransporterId: '150',
      dropTransporterId: '150',
      dropTransporterStatus: 'ACCEPTED',
      dropShgStatus: 'PENDING'
    }
  });

  // Ensure OrderAssignments for Transporter exist
  await prisma.orderAssignment.deleteMany({
    where: {
      orderId: 'ORD-2026-111',
      assigneeType: 'TRANSPORTER',
    }
  }).catch(() => {});

  await prisma.orderAssignment.createMany({
    data: [
      { orderId: 'ORD-2026-111', assigneeId: '150', assigneeType: 'TRANSPORTER', role: 'PICKUP', status: 'ACCEPTED' },
      { orderId: 'ORD-2026-111', assigneeId: '150', assigneeType: 'TRANSPORTER', role: 'DROP', status: 'ACCEPTED' }
    ]
  }).catch(() => {});

  console.log("Order 111 DB State after update:");
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-111' }, { orderId: 'ORD-2026-111' }, { id: '111' }] }
  });
  console.log("  id:", o.id);
  console.log("  mainStatus:", o.mainStatus);
  console.log("  pickupTransporterStatus:", o.pickupTransporterStatus);
  console.log("  dropTransporterStatus:", o.dropTransporterStatus);
  console.log("  pickupTransporterId:", o.pickupTransporterId);
  console.log("  dropTransporterId:", o.dropTransporterId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
