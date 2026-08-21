require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const o = await prisma.order.findFirst({
    where: { orderId: 'ORD-2026-117' },
    include: {
      seller: true,
      assignments: true,
    }
  });

  console.log('=== ORDER ORD-2026-117 STATUS ===');
  console.log('mainStatus:', o.mainStatus);
  console.log('pickupShgStatus:', o.pickupShgStatus);
  console.log('pickupTransporterStatus:', o.pickupTransporterStatus);
  console.log('pickupTransporterId:', o.pickupTransporterId);
  console.log('Assignments:', o.assignments);

  const transporters = await prisma.user.findMany({
    where: { role: 'TRANSPORTER' },
    select: { id: true, phoneNumber: true, fullName: true, role: true, applicationStatus: true }
  });

  console.log('\n=== TRANSPORTERS IN DB ===');
  console.log(transporters);
}

main().finally(async () => { await prisma.$disconnect(); });
