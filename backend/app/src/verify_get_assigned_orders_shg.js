const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { id: 145 },
    include: { address: true, shgDetail: true }
  });

  const shgUuid = String(user.id);
  const shgAuthId = user.authId || '';

  const assignedOrders = await prisma.orderAssignment.findMany({
    where: {
      assigneeId: shgUuid,
      assigneeType: 'SHG',
      status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
    },
    select: { orderId: true, role: true }
  });

  const assignedOrderIds = assignedOrders.map(a => a.orderId);

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
    select: {
      id: true, orderId: true, barcode: true, phase: true, flowType: true,
      sellerId: true, buyerId: true, productCount: true, totalQty: true,
      totalWeight: true, pickupShgId: true, pickupTransporterId: true,
      dropShgId: true, dropTransporterId: true, mainStatus: true,
      pickupShgStatus: true, pickupTransporterStatus: true, dropShgStatus: true,
      dropTransporterStatus: true, createdAt: true,
      seller: true, buyer: true, parcels: true, assignments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  }).catch(err => {
    console.error('Prisma Error:', err);
    return [];
  });

  console.log(`Successfully fetched ${orders.length} orders for SHG 145`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
