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
  const orderNumber = process.argv[2] || 'ORD-PICK-1011';
  console.log(`=== ORDER RECORD FOR ${orderNumber} ===`);
  const orders = await prisma.$queryRawUnsafe(`
    SELECT * FROM public."Order"
    WHERE "orderId" = $1;
  `, orderNumber) as any[];
  
  for (const o of orders) {
    console.log(`ID: ${o.id}, Phase: ${o.phase}, MainStatus: ${o.mainStatus}, pickupShg: ${o.pickupShgId}, dropShg: ${o.dropShgId}, pickupShgStatus: ${o.pickupShgStatus}`);
  }
  
  console.log(`=== ORDER ASSIGNMENTS FOR ${orderNumber} ===`);
  const assignments = await prisma.$queryRawUnsafe(`
    SELECT * FROM public."OrderAssignment"
    WHERE "orderId" IN (SELECT id::text FROM public."Order" WHERE "orderId" = $1)
    ORDER BY "createdAt" ASC;
  `, orderNumber) as any[];
  
  for (const a of assignments) {
    console.log(`Assignment: assigneeId=${a.assigneeId}, assigneeType=${a.assigneeType}, role=${a.role}, status=${a.status}`);
  }
}

main().finally(() => prisma.$disconnect());
