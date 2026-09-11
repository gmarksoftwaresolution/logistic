const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing getInventoryStoredOrders & getInventoryDispatchedOrders ===");

  // Stored condition
  const stored = await prisma.order.findMany({
    where: {
      returnType: null,
      mainStatus: { in: ['STORED', 'HUB_RECEIVED', 'AT_HUB', 'PARCEL_AT_HUB', 'PARCEL_AT_GMU', 'BARCODE_GENERATED', 'DROP_PENDING', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED'] }
    }
  });

  const filteredStored = stored.filter(o => o.dropTransporterStatus !== 'PICKED' && o.mainStatus !== 'DISPATCHED' && o.mainStatus !== 'IN_TRANSIT_TO_DROP_SHG' && o.mainStatus !== 'PARCEL_AT_DROP_SHG' && o.mainStatus !== 'DELIVERED' && o.mainStatus !== 'COMPLETED');

  console.log(`Stored Count (raw query): ${stored.length}`);
  console.log(`Stored Count (filtered): ${filteredStored.length}`);
  filteredStored.forEach(o => console.log(`  - Stored Order ${o.id}: mainStatus=${o.mainStatus}, dtStatus=${o.dropTransporterStatus}`));

  // Dispatched condition
  const dispatched = await prisma.order.findMany({
    where: {
      returnType: null,
      mainStatus: { in: ['DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'IN_TRANSIT_TO_BUYER', 'OUT_FOR_DELIVERY', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED'] }
    }
  });

  console.log(`\nDispatched Count: ${dispatched.length}`);
  dispatched.forEach(o => console.log(`  - Dispatched Order ${o.id}: mainStatus=${o.mainStatus}, dtStatus=${o.dropTransporterStatus}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
