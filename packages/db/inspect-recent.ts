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
  console.log('=== SEARCHING FOR THE MOST RECENTLY UPDATED MASTER ORDERS ===');
  
  const masters = await prisma.masterOrder.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      pickupOrders: true,
      dropOrders: true,
    }
  });

  for (const m of masters) {
    console.log(`\nOrder Number: ${m.orderNumber} (ID: ${m.id})`);
    console.log(`  Master Status: ${m.status}`);
    console.log(`  UpdatedAt: ${m.updatedAt}`);
    console.log(`  Pickup Legs:`, m.pickupOrders.map(p => `ID=${p.id}, status=${p.status}, shgId=${p.shgId}`));
    console.log(`  Drop Legs:`, m.dropOrders.map(d => `ID=${d.id}, status=${d.status}, shgId=${d.shgId}`));
    
    const pubOrders = await prisma.$queryRawUnsafe(`
      SELECT phase, "mainStatus", "pickupShgStatus", "pickupTransporterStatus", "dropShgStatus", "dropTransporterStatus"
      FROM public."Order" WHERE "orderId" = $1;
    `, m.orderNumber) as any[];
    console.log(`  Public.Order phase records:`);
    for (const po of pubOrders) {
      console.log(`    Phase=${po.phase}, mainStatus=${po.mainStatus}, pickupShgStatus=${po.pickupShgStatus}, dropShgStatus=${po.dropShgStatus}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
