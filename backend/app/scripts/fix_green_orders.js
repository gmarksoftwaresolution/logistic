require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  console.log('=== FIXING LEFTOVER DROP ASSIGNMENTS & STATUSES ===');

  // 1. Delete all DROP role OrderAssignment records (from previous test flows)
  const deletedDropAssignments = await prisma.orderAssignment.deleteMany({
    where: { role: 'DROP' }
  });
  console.log(`✅ Deleted ${deletedDropAssignments.count} leftover DROP assignments.`);

  // 2. Clean Order table drop-related columns
  const updatedOrders = await prisma.order.updateMany({
    data: {
      dropShgId: null,
      dropTransporterId: null,
      dropShgStatus: 'PENDING',
      dropTransporterStatus: 'PENDING',
      warehouseReceivedAt: null,
      storedAt: null,
      dispatchedAt: null,
      deliveredAt: null,
    }
  });
  console.log(`✅ Cleaned drop/warehouse fields on ${updatedOrders.count} orders.`);

  // 3. Inspect all 20 orders assignments & parcel statuses
  const orders = await prisma.order.findMany({
    include: { assignments: true }
  });

  console.log(`\n=== CURRENT STATUS OF ALL 20 ORDERS ===`);
  orders.forEach((o, idx) => {
    console.log(`${idx + 1}. ${o.orderId} | mainStatus: ${o.mainStatus} | pickupShgStatus: ${o.pickupShgStatus} | pickupTransporterStatus: ${o.pickupTransporterStatus} | dropShgId: ${o.dropShgId} | assignments:`, o.assignments.map(a => `${a.role}:${a.assigneeType}:${a.status}`));
  });
}

main().finally(() => prisma.$disconnect());
