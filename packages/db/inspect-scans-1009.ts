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
  console.log('=== INSPECTING SCAN HISTORY FOR ORDER 1009 ===');
  
  const scanHistory = await prisma.$queryRawUnsafe(`
    SELECT * FROM public."ScanHistory" WHERE "orderId" = '9';
  `);
  console.dir(scanHistory, { depth: null });

  console.log('=== INSPECTING PARCEL SCAN HISTORY FOR ORDER 1009 ===');
  const parcelHistory = await prisma.parcelScanHistory.findMany({
    where: { orderId: 'ORD-PICK-1009' }
  });
  console.dir(parcelHistory, { depth: null });
}

main().finally(() => prisma.$disconnect());
