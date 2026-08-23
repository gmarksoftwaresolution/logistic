const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-111' }, { orderId: 'ORD-2026-111' }, { id: '111' }] },
    include: { seller: true, buyer: true, assignments: true }
  });

  console.log("Order 111 DB State:");
  console.log("  id:", o.id);
  console.log("  mainStatus:", o.mainStatus);
  console.log("  pickupShgStatus:", o.pickupShgStatus);
  console.log("  dropShgStatus:", o.dropShgStatus);
  console.log("  pickupTransporterStatus:", o.pickupTransporterStatus);
  console.log("  dropTransporterStatus:", o.dropTransporterStatus);
  console.log("  pickupTransporterId:", o.pickupTransporterId);
  console.log("  dropTransporterId:", o.dropTransporterId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
