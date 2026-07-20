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
  const orderNumber = 'ORD-PICK-1019';
  
  const pickup = await prisma.pickupOrder.findFirst({
    where: { masterOrder: { orderNumber } }
  });
  console.log('PickupOrder:', pickup);
  
  const drop = await prisma.dropOrder.findFirst({
    where: { masterOrder: { orderNumber } }
  });
  console.log('DropOrder:', drop);
}

main().finally(() => prisma.$disconnect());
