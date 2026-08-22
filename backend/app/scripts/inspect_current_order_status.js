require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { pickupShgStatus: { in: ['PICKED', 'PARCEL_AT_SHG', 'COMPLETED', 'DROPPED'] } },
        { mainStatus: { in: ['PARCEL_AT_SHG', 'PICKUP_ASSIGNED', 'IN_TRANSIT_TO_HUB', 'IN_DIRECT_TRANSIT'] } }
      ]
    },
    include: {
      seller: true,
      buyer: true,
      assignments: true,
      parcels: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });

  console.log('=== LATEST UPDATED ORDERS IN DB ===');
  orders.forEach((o) => {
    console.log('\n--- ORDER:', o.orderId, '---');
    console.log('flowType:', o.flowType);
    console.log('mainStatus:', o.mainStatus);
    console.log('pickupShgStatus:', o.pickupShgStatus);
    console.log('pickupTransporterId:', o.pickupTransporterId);
    console.log('pickupTransporterStatus:', o.pickupTransporterStatus);
    console.log('Seller:', o.seller?.village, o.seller?.pincode);
    console.log('Assignments:', o.assignments);
    console.log('Parcels:', o.parcels.map(p => ({ id: p.parcelId, status: p.parcelStatus, holder: p.currentHolderId })));
  });
}

main().finally(async () => { await prisma.$disconnect(); });
