const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shgId = 145; // Rutuja (Drop SHG for Order 111)
  const shgUuid = String(shgId);

  const orders = await prisma.order.findMany({
    where: {
      mainStatus: {
        in: [
          'NEW', 'ORDER_PLACED', 'PENDING', 'PENDING_PICKUP', 'PICKUP_ASSIGNED',
          'PICKUP_SHG_PENDING', 'ACCEPTED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG',
          'PARCEL_AT_PICKUP_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED',
          'IN_TRANSIT_TO_HUB', 'STORED', 'BARCODE_GENERATED', 'DROP_PENDING',
          'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED',
          'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG', 'DISPATCHED',
          'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG',
          'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'REDIRECTED'
        ]
      }
    },
    include: { seller: true, buyer: true, parcels: true, assignments: true }
  });

  const matched = orders.filter((o) => {
    const isDropUser = (o.dropShgId && String(o.dropShgId) === shgUuid) ||
      o.assignments?.some(a => a.role === 'DROP' && a.assigneeType === 'SHG' && String(a.assigneeId) === shgUuid);

    if (isDropUser) {
      const dShgStatus = (o.dropShgStatus || '').toUpperCase();
      const pShgStatus = (o.pickupShgStatus || '').toUpperCase();
      const mStatus = (o.mainStatus || '').toUpperCase();

      if (dShgStatus === 'DELIVERED' || dShgStatus === 'COMPLETED' || dShgStatus === 'DROPPED' || mStatus === 'DELIVERED' || mStatus === 'COMPLETED') {
        return false;
      }
      const isPickedUpByPickupShg = pShgStatus === 'PICKED' || ['PARCEL_AT_PICKUP_SHG', 'IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'STORED', 'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'OUT_FOR_DELIVERY'].includes(mStatus);
      if (!isPickedUpByPickupShg) {
        return false;
      }
      return true;
    }
    return false;
  });

  console.log("Matched assigned drop orders for SHG 145 (Rutuja):");
  matched.forEach(m => console.log(`  - Order ${m.id} (${m.orderId}): mainStatus = ${m.mainStatus}, dropShgStatus = ${m.dropShgStatus}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
