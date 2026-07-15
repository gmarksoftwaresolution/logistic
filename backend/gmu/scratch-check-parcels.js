require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const parcels = await prisma.parcel.findMany({
    where: { orderId: 'ORD-PICK-1004' }
  });
  console.log(parcels);
}

main().finally(() => prisma.$disconnect());
