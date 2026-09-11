const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update order 116 in DB to active IN_TRANSIT drop leg state
  await prisma.order.updateMany({
    where: {
      OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }]
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

  console.log("Updated Order 116 to active IN_TRANSIT state.");

  // Check Transporter 150 assigned pickups & drops
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { assignments: true }
  });

  console.log("\nOrder 116 DB State:");
  console.log("  mainStatus:", o.mainStatus);
  console.log("  pickupTransporterStatus:", o.pickupTransporterStatus);
  console.log("  dropTransporterStatus:", o.dropTransporterStatus);
  console.log("  pickupTransporterId:", o.pickupTransporterId);
  console.log("  dropTransporterId:", o.dropTransporterId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
