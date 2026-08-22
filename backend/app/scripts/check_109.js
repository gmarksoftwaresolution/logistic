require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const o = await prisma.order.findFirst({
    where: { orderId: 'ORD-2026-109' },
    include: {
      seller: true,
      buyer: true,
      assignments: true,
      parcels: true
    }
  });

  console.log('=== ORDER ORD-2026-109 DETAILS ===');
  console.log('ID:', o.id);
  console.log('orderId:', o.orderId);
  console.log('flowType:', o.flowType);
  console.log('phase:', o.phase);
  console.log('mainStatus:', o.mainStatus);
  console.log('pickupShgId:', o.pickupShgId);
  console.log('pickupShgStatus:', o.pickupShgStatus);
  console.log('pickupTransporterId:', o.pickupTransporterId);
  console.log('pickupTransporterStatus:', o.pickupTransporterStatus);
  console.log('Seller:', o.seller);
  console.log('Buyer:', o.buyer);
  console.log('Assignments:', o.assignments);
  console.log('Parcels:', o.parcels);
}

main().finally(async () => { await prisma.$disconnect(); });
