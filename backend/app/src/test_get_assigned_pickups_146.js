require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shgId = 146; // Drop SHG for 105 & 115
  const shgUuid = String(shgId);

  // Run the exact query from order.service.ts getAssignedPickups
  const orders = await prisma.order.findMany({
    where: {
      NOT: {
        returnType: 'BUYER_RETURN',
      },
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
    include: { assignments: true }
  });

  console.log(`Total non-BUYER_RETURN orders fetched: ${orders.length}`);
  const ids = orders.map(o => o.orderId || o.id);
  console.log("Order IDs fetched:", ids);

  // Check all orders in DB for 105 and 115 specifically
  const testOrders = await prisma.order.findMany({
    where: {
      OR: [
        { orderId: { in: ['ORD-2026-105', 'ORD-2026-115'] } },
        { id: { in: ['ORD-2026-105', 'ORD-2026-115'] } }
      ]
    }
  });

  console.log("\nSpecific test orders in DB:");
  testOrders.forEach(o => {
    console.log(`Order ${o.id} (${o.orderId}): returnType=${o.returnType}, mainStatus=${o.mainStatus}, dropShgId=${o.dropShgId}, pickupReturnShgId=${o.pickupReturnShgId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
