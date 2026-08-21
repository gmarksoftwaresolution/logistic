require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  console.log('=== RESETTING ALL PARCELS TO PENDING FOR END-TO-END SCAN TESTING ===');

  // Update all Parcel records to PENDING status and currentHolderType to SELLER
  const updatedParcels = await prisma.parcel.updateMany({
    data: {
      parcelStatus: 'PENDING',
      currentHolderType: 'SELLER'
    }
  });

  console.log(`✅ Updated ${updatedParcels.count} Parcel records to PENDING status.`);

  // Print summary of parcels across all 20 orders
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderId: true,
      mainStatus: true,
      parcels: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n=== PARCEL STATUS SUMMARY FOR ALL ${orders.length} ORDERS ===`);
  orders.forEach((o, idx) => {
    const statuses = o.parcels.map(p => p.parcelStatus).join(', ');
    console.log(`${idx + 1}. ${o.orderId} | OrderStatus: ${o.mainStatus} | Total Parcels: ${o.parcels.length} | Statuses: [${statuses}]`);
  });
}

main().finally(() => prisma.$disconnect());
