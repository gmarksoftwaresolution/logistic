const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-113' }, { orderId: 'ORD-2026-113' }] }
  });

  const pShgStatus = (o.pickupShgStatus || '').toUpperCase();
  const mStatus = (o.mainStatus || '').toUpperCase();

  const isPickedUpOld = pShgStatus === 'PICKED' || ['PARCEL_AT_PICKUP_SHG', 'IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'STORED', 'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'OUT_FOR_DELIVERY'].includes(mStatus);
  const isPickedUpFixed = pShgStatus === 'PICKED' || ['PARCEL_AT_PICKUP_SHG', 'IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'STORED', 'DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_DROP_SHG', 'OUT_FOR_DELIVERY'].includes(mStatus);

  console.log(`Order 113 mainStatus: ${mStatus}`);
  console.log(`Old Filter Output (Why Order 113 was hidden): ${isPickedUpOld}`);
  console.log(`Fixed Filter Output (Allows Order 113 to show): ${isPickedUpFixed}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
