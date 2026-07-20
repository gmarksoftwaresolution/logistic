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
  console.log('=== FETCHING COMPLETED ORDERS FOR SHG 517 ===');
  
  const pickups = await prisma.pickupOrder.findMany({
    where: { shgId: 517, status: 'COMPLETED' },
    include: {
      seller: true,
      items: { include: { product: true } },
      masterOrder: true,
      tracking: true,
    },
  });

  const drops = await prisma.dropOrder.findMany({
    where: {
      shgId: 517,
      buyerId: { not: 517 },
      status: { in: ['DELIVERED', 'COMPLETED'] },
      NOT: { dropOrderNumber: { startsWith: 'RET-' } }
    },
    include: {
      buyer: true,
      items: { include: { product: true } },
      masterOrder: {
        include: { items: { include: { seller: true } } },
      },
      tracking: true,
    },
  });

  console.log('Pickups found:', pickups.length);
  pickups.forEach(p => console.log(`- ${p.pickupOrderNumber}: status=${p.status}`));

  console.log('Drops found:', drops.length);
  drops.forEach(d => console.log(`- ${d.dropOrderNumber}: status=${d.status}`));
}

main().finally(() => prisma.$disconnect());
