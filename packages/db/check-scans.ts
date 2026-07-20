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
  const orderNumber = 'ORD-PICK-1008';
  console.log(`=== SCAN HISTORY FOR ${orderNumber} ===`);
  const scans = await prisma.$queryRawUnsafe(`
    SELECT * FROM public."ScanHistory"
    WHERE "orderId" = $1 OR "orderId" = (SELECT id::text FROM public."Order" WHERE "orderId" = $1 LIMIT 1)
    ORDER BY "timestamp" ASC;
  `, orderNumber) as any[];
  
  for (const s of scans) {
    console.log(`Scan: type=${s.scanType}, location=${s.scanLocation}, by=${s.scannedBy}, role=${s.userRole}, result=${s.scanResult}, time=${s.timestamp}`);
  }
  
  console.log(`=== TRACKING FOR ${orderNumber} ===`);
  const dropOrder = await prisma.dropOrder.findFirst({
    where: { masterOrder: { orderNumber } }
  });
  if (dropOrder) {
    const tracking = await prisma.dropTracking.findMany({
      where: { dropOrderId: dropOrder.id },
      orderBy: { updatedAt: 'asc' }
    });
    for (const t of tracking) {
      console.log(`Tracking: status=${t.status}, remarks=${t.remarks}, time=${t.updatedAt}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
