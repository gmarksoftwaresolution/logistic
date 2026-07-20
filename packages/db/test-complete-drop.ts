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
  console.log('=== TESTING COMPLETE DROP SIMULATION ===');
  
  const dropOrder = await prisma.dropOrder.findFirst({
    where: { masterOrder: { orderNumber: 'ORD-PICK-1009' } }
  });
  console.log('Found Drop Order:', dropOrder);

  if (!dropOrder) return;

  const masterOrder = await prisma.masterOrder.findUnique({
    where: { id: dropOrder.masterOrderId }
  });
  console.log('Found Master Order:', masterOrder);

  if (!masterOrder) return;

  const nextStatus = 'DELIVERED';
  const nextGmuStatus = 'DELIVERED';

  console.log('Updating dropOrder status to DELIVERED...');
  await prisma.dropOrder.update({
    where: { id: dropOrder.id },
    data: { status: nextStatus },
  });

  console.log('Running Raw SQL update on public."Order"...');
  const result = await prisma.$executeRawUnsafe(`
    UPDATE public."Order"
    SET "dropShgStatus" = 'DROPPED', "mainStatus" = $1, "updatedAt" = NOW()
    WHERE "orderId" = $2 AND phase = 'DROP';
  `, nextGmuStatus, masterOrder.orderNumber);

  console.log('Rows affected by Raw SQL update:', result);

  const updatedRows = await prisma.$queryRawUnsafe(`
    SELECT "orderId", phase, "mainStatus", "dropShgStatus" FROM public."Order" WHERE "orderId" = 'ORD-PICK-1009';
  `);
  console.log('After update rows:', updatedRows);
}

main().finally(() => prisma.$disconnect());
