const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFilter() {
  const shg145Orders = await prisma.order.findMany({
    where: {
      OR: [
        { dropShgId: '145' },
        { assignments: { some: { assigneeId: '145', role: 'DROP', assigneeType: 'SHG' } } }
      ]
    },
    include: { seller: true, buyer: true }
  });

  console.log(`Checking Drop Orders for Drop SHG 145 (Rutuja, Inchanal):`);
  for (const o of shg145Orders) {
    const dShgStatus = (o.dropShgStatus || '').toUpperCase();
    const pShgStatus = (o.pickupShgStatus || '').toUpperCase();
    const mStatus = (o.mainStatus || '').toUpperCase();

    const isDelivered = dShgStatus === 'DELIVERED' || dShgStatus === 'COMPLETED' || mStatus === 'DELIVERED' || mStatus === 'COMPLETED';
    const isPickedUpByPickupShg = pShgStatus === 'PICKED' || ['PARCEL_AT_PICKUP_SHG', 'IN_TRANSIT', 'IN_DIRECT_TRANSIT', 'STORED', 'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'OUT_FOR_DELIVERY'].includes(mStatus);

    const isVisibleToDropShg = !isDelivered && isPickedUpByPickupShg;

    console.log(`  - Order ${o.id} (${o.orderId}): mainStatus = ${o.mainStatus}, pickupShgStatus = ${o.pickupShgStatus} => Visible in Drop SHG App? ${isVisibleToDropShg ? 'YES (Picked up by Pickup SHG)' : 'NO (Waiting for Pickup SHG to pick up from seller)'}`);
  }
}

testFilter().catch(console.error).finally(() => prisma.$disconnect());
