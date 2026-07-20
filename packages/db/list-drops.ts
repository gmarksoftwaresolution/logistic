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
  
  console.log('--- DROP ORDERS ---');
  for (const d of drops) {
    console.log(`Drop ID: ${d.id}, Number: ${d.dropOrderNumber}, Master ID: ${d.masterOrderId}, OrderNumber: ${d.masterOrder?.orderNumber}, Status: ${d.status}`);
  }
  
  const gmuOrders = await prisma.$queryRawUnsafe(`
    SELECT id, "orderId", phase, "mainStatus", "dropShgStatus", "dropTransporterStatus", "updatedAt"
    FROM public."Order"
    ORDER BY "updatedAt" DESC;
  `) as any[];
  
  console.log('--- GMU ORDERS ---');
  for (const o of gmuOrders) {
    console.log(`ID: ${o.id}, OrderID: ${o.orderId}, Phase: ${o.phase}, MainStatus: ${o.mainStatus}, DropShgStatus: ${o.dropShgStatus}, DropTransporterStatus: ${o.dropTransporterStatus}, UpdatedAt: ${o.updatedAt}`);
  }
}

main().finally(() => prisma.$disconnect());
