require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const orders = await prisma.order.findMany({
    include: { assignments: true }
  });

  console.log(`TOTAL ORDERS IN DB: ${orders.length}`);

  orders.forEach((o, i) => {
    const isRejected = ['REJECTED', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED', 'DECLINED'].includes(o.mainStatus) ||
      o.pickupShgStatus?.toLowerCase() === 'rejected' ||
      o.pickupTransporterStatus?.toLowerCase() === 'rejected' ||
      o.dropShgStatus?.toLowerCase() === 'rejected' ||
      o.dropTransporterStatus?.toLowerCase() === 'rejected' ||
      o.assignments?.some(a => a.status?.toLowerCase() === 'rejected');

    const isNew = !o.pickupShgId && !['PICKUP_ASSIGNED'].includes(o.mainStatus) && (!o.pickupShgStatus || o.pickupShgStatus === 'pending') && ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING'].includes(o.mainStatus);

    const isCompleted = ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'RETURN_COMPLETED', 'BUYER_RETURN_COMPLETED', 'TRANSPORTER_RETURN_COMPLETED'].includes(o.mainStatus);

    const isReturn = Boolean(o.returnType) || Boolean(o.mainStatus && o.mainStatus.includes('RETURN'));

    const isInTransit = !isRejected && !isNew && !isCompleted;

    console.log(`${i+1}. OrderID: ${o.orderId} | flowType: ${o.flowType} | mainStatus: ${o.mainStatus} | pickupShgId: ${o.pickupShgId} | returnType: ${o.returnType} | isRejected: ${isRejected} | isInTransit: ${isInTransit}`);
    if (isRejected) {
      console.log(`   REJECTED REASON DETAILS -> pickupShgStatus: ${o.pickupShgStatus}, pickupTransporterStatus: ${o.pickupTransporterStatus}, dropShgStatus: ${o.dropShgStatus}, dropTransporterStatus: ${o.dropTransporterStatus}, assignments:`, o.assignments.map(a => `${a.assigneeType}:${a.status}`));
    }
    if (!isInTransit) {
      console.log(`   EXCLUDED FROM IN TRANSIT -> isNew: ${isNew}, isCompleted: ${isCompleted}, isReturn: ${isReturn}, isRejected: ${isRejected}`);
    }
  });
}

main().finally(() => prisma.$disconnect());
