require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  console.log('=== CLEAN RESETTING ALL 20 ORDERS TO DIRECT FLOW SPECIFICATION ===');

  // 1. Delete all records from RedirectedOrder table
  const deletedRedirects = await prisma.redirectedOrder.deleteMany({});
  console.log(`✅ Deleted ${deletedRedirects.count} records from RedirectedOrder table.`);

  // 2. Delete all DROP role OrderAssignment records
  const deletedDropAssignments = await prisma.orderAssignment.deleteMany({
    where: { role: 'DROP' }
  });
  console.log(`✅ Deleted ${deletedDropAssignments.count} leftover DROP assignments.`);

  // 3. Reset Order table fields according to specification:
  // Step 1: Order Created -> mainStatus = 'PICKUP_ASSIGNED', pickupShgStatus = 'ASSIGNED', pickupTransporter = null, dropShgStatus = 'PENDING_TRANSPORTER'
  const updatedOrders = await prisma.order.updateMany({
    data: {
      phase: 'PICKUP',
      isPickupRedirected: false,
      redirectedPickupAt: null,
      redirectedPickupShgId: null,
      mainStatus: 'PICKUP_ASSIGNED',
      pickupShgStatus: 'ASSIGNED',
      pickupTransporterId: null,
      pickupTransporterStatus: null,
      dropShgId: null,
      dropTransporterId: null,
      dropShgStatus: 'PENDING_TRANSPORTER',
      dropTransporterStatus: null,
      warehouseReceivedAt: null,
      storedAt: null,
      dispatchedAt: null,
      deliveredAt: null,
      remarks: null,
      rejectReason: null,
    }
  });
  console.log(`✅ Updated ${updatedOrders.count} Order records.`);

  // 4. Reset all Parcels to PENDING (CREATED)
  const updatedParcels = await prisma.parcel.updateMany({
    data: {
      parcelStatus: 'PENDING',
      currentHolderType: 'SELLER'
    }
  });
  console.log(`✅ Reset ${updatedParcels.count} Parcel records to PENDING status.`);

  // 5. Print summary
  const orders = await prisma.order.findMany({
    select: {
      orderId: true,
      flowType: true,
      phase: true,
      mainStatus: true,
      pickupShgStatus: true,
      pickupTransporterStatus: true,
      dropShgStatus: true,
      parcels: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n=== CURRENT TOTAL ORDERS IN DB: ${orders.length} ===`);
  orders.forEach((o, i) => {
    const statuses = o.parcels.map(p => p.parcelStatus).join(', ');
    console.log(`${i + 1}. ${o.orderId} | flow: ${o.flowType} | status: ${o.mainStatus} | shgStatus: ${o.pickupShgStatus} | transStatus: ${o.pickupTransporterStatus || 'unassigned'} | dropStatus: ${o.dropShgStatus}`);
  });
}

main().finally(() => prisma.$disconnect());
