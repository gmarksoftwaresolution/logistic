require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const url = process.env.DATABASE_URL.replace(':5432/', ':6543/') + '&pgbouncer=true';
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function main() {
  const orders = await prisma.order.findMany({
    include: { parcels: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${orders.length} orders:`);
  orders.forEach(o => {
    const parcelBarcodes = o.parcels.map(p => p.parcelId).join(', ');
    console.log(`${o.orderId} | DB Order.barcode: "${o.barcode}" | Parcels count: ${o.parcels.length} | Parcels barcodes: [${parcelBarcodes}]`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
