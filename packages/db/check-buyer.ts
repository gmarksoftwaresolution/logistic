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
  const orderNumber = 'ORD-PICK-1011';
  console.log(`=== DETAILS FOR ${orderNumber} ===`);
  const masterOrder = await prisma.masterOrder.findUnique({
    where: { orderNumber },
    include: { buyer: true }
  });
  console.log('MasterOrder buyer:', masterOrder?.buyer);
  
  const dropOrder = await prisma.dropOrder.findFirst({
    where: { masterOrder: { orderNumber } },
    include: { buyer: true, shg: true }
  });
  console.log('DropOrder buyer:', dropOrder?.buyer);
  console.log('DropOrder shg:', dropOrder?.shg);
}

main().finally(() => prisma.$disconnect());
