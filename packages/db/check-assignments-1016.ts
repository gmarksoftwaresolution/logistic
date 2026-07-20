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
  const orderNumber = 'ORD-PICK-1016';
  
  const pickup = await prisma.pickupOrder.findFirst({
    where: { masterOrder: { orderNumber } }
  });
  console.log('PickupOrder:', pickup);
  
  const assignments = await prisma.$queryRawUnsafe(`
    SELECT oa.*, o."orderId"
    FROM public."OrderAssignment" oa
    JOIN public."Order" o ON oa."orderId" = o.id
    WHERE o."orderId" = $1;
  `, orderNumber) as any[];
  
  console.log('Assignments:', assignments);
}

main().finally(() => prisma.$disconnect());
