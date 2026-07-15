require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const history = await prisma.parcelScanHistory.findMany({
    where: { orderId: 'ORD-PICK-1004' },
    orderBy: { scanTime: 'asc' }
  });
  console.log('Scan History:', history);
}

main().finally(() => prisma.$disconnect());
