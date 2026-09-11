const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-111' }, { orderId: 'ORD-2026-111' }, { id: '111' }] }
  });

  console.log("=== DB State of Order 111 ===");
  console.log("  id:", o.id);
  console.log("  mainStatus:", o.mainStatus);
  console.log("  pickupShgStatus:", o.pickupShgStatus);
  console.log("  dropShgStatus:", o.dropShgStatus);
  console.log("  pickupTransporterStatus:", o.pickupTransporterStatus);
  console.log("  dropTransporterStatus:", o.dropTransporterStatus);

  // Check Drop SHG active filtering
  const isPhase2ActiveForDropShg = ['DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'IN_TRANSIT', 'IN_DIRECT_TRANSIT'].includes(o.mainStatus) && o.dropShgStatus !== 'DROPPED' && o.dropShgStatus !== 'DELIVERED' && o.dropShgStatus !== 'COMPLETED';

  console.log("\n=== Filter Checks ===");
  console.log("  Is Phase 2 Active For Drop SHG (shows in Drop Section):", isPhase2ActiveForDropShg);
  console.log("  Is Excluded from SHG Completed List:", isPhase2ActiveForDropShg);
}

main().catch(console.error).finally(() => prisma.$disconnect());
