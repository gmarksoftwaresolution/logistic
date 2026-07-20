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
  const shgId = 516; // Pooja Patil
  
  // Regular drop orders assigned to 516
  const drops = await prisma.dropOrder.findMany({
    where: {
      shgId,
      buyerId: { not: shgId },
      status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'REJECTED', 'DELIVERED'] },
      NOT: { dropOrderNumber: { startsWith: 'RET-' } }
    },
    include: { masterOrder: true }
  });
  
  console.log('--- regularDrops in backend ---');
  for (const d of drops) {
    console.log(`Drop ID: ${d.id}, MasterOrderId: ${d.masterOrderId}, orderNumber: ${d.masterOrder?.orderNumber}, status: ${d.status}`);
  }
}

main().finally(() => prisma.$disconnect());
