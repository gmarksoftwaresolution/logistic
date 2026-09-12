require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const url = process.env.DATABASE_URL.replace(':5432/', ':6543/') + '&pgbouncer=true';
const prisma = new PrismaClient({
  datasources: { db: { url } }
});

async function main() {
  console.log('=== UPDATING ALL ORDERS TO CONTAIN ALL PARCEL BARCODES IN DB ===');

  const orders = await prisma.order.findMany({
    include: { parcels: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${orders.length} orders in database.`);

  for (const order of orders) {
    const parcelBarcodes = order.parcels.map(p => p.parcelId).filter(Boolean);
    if (parcelBarcodes.length > 0) {
      const barcodeStr = parcelBarcodes.join(', ');
      await prisma.order.update({
        where: { id: order.id },
        data: { barcode: barcodeStr }
      });
      console.log(`✅ Order ${order.orderId} updated -> barcode: "${barcodeStr}" (${parcelBarcodes.length} parcels)`);
    }
  }

  console.log('=== ALL ORDERS UPDATED SUCCESSFULLY ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
