import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPaths = [
  path.join(__dirname, '../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING ORD-PICK-1009 ===');
  
  const masterOrder = await prisma.masterOrder.findUnique({
    where: { orderNumber: 'ORD-PICK-1009' }
  });
  console.log('Master Order:', masterOrder);

  const dropOrder = await prisma.dropOrder.findMany({
    where: { masterOrder: { orderNumber: 'ORD-PICK-1009' } }
  });
  console.log('Drop Orders:', dropOrder);

  const gmuOrders = await prisma.$queryRawUnsafe(`
    SELECT * FROM public."Order" WHERE "orderId" = 'ORD-PICK-1009';
  `);
  console.log('GMU Orders:', gmuOrders);

  const scans = await prisma.scanSessionItem.findMany({
    where: { parcel: { orderId: 'ORD-PICK-1009' } }
  });
  console.log('Scan session items:', scans);
}

main().finally(() => prisma.$disconnect());
