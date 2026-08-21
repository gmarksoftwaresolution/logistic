require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const orders = await prisma.order.findMany({
    where: { orderId: { in: ['ORD-2026-118', 'ORD-2026-115', 'ORD-2026-107', 'ORD-2026-120'] } },
    include: { assignments: true, parcels: true }
  });

  orders.forEach((o) => {
    console.log(`\n=== ORDER: ${o.orderId} ===`);
    console.log('mainStatus:', o.mainStatus);
    console.log('pickupShgStatus:', o.pickupShgStatus);
    console.log('pickupTransporterStatus:', o.pickupTransporterStatus);
    console.log('pickupShgId:', o.pickupShgId);
    console.log('pickupTransporterId:', o.pickupTransporterId);
    console.log('dropShgStatus:', o.dropShgStatus);
    console.log('dropTransporterStatus:', o.dropTransporterStatus);
    console.log('assignments:', o.assignments.map(a => ({ role: a.role, type: a.assigneeType, status: a.status })));
    console.log('parcels:', o.parcels.map(p => ({ status: p.parcelStatus, holder: p.currentHolderId })));
  });
}

main().finally(() => prisma.$disconnect());
