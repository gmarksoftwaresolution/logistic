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
  const drops = await prisma.dropOrder.findMany({
    include: { masterOrder: true }
  });
  
  console.log('--- ALL DROP ORDERS ---');
  for (const d of drops) {
    console.log(`Drop ID: ${d.id}, orderNumber: ${d.masterOrder?.orderNumber}, shgId: ${d.shgId}, status: ${d.status}`);
  }
  
  const assignments = await prisma.$queryRawUnsafe(`
    SELECT oa.*, o."orderId"
    FROM public."OrderAssignment" oa
    JOIN public."Order" o ON oa."orderId" = o.id
    WHERE oa.role = 'DROP' AND oa."assigneeType" = 'SHG';
  `) as any[];
  
  console.log('--- DROP SHG ASSIGNMENTS ---');
  for (const a of assignments) {
    console.log(`OrderId: ${a.orderId}, assigneeId: ${a.assigneeId}, status: ${a.status}`);
  }
}

main().finally(() => prisma.$disconnect());
