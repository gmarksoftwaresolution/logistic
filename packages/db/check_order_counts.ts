import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== ORDER COUNTS IN DB ===');
  const masterCount = await prisma.masterOrder.count();
  const gmuOrderCount = await prisma.order.count();
  const pickupCount = await prisma.pickupOrder.count();
  const dropCount = await prisma.dropOrder.count();

  console.log(`master_orders count: ${masterCount}`);
  console.log(`gmu orders count: ${gmuOrderCount}`);
  console.log(`pickup_orders count: ${pickupCount}`);
  console.log(`drop_orders count: ${dropCount}`);

  const gmuByStatus = await prisma.order.groupBy({
    by: ['phase', 'mainStatus'],
    _count: true,
  });
  console.log('GMU Orders grouped by phase and mainStatus:', JSON.stringify(gmuByStatus, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
