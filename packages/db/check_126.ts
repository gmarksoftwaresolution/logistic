import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pickup = await prisma.$queryRawUnsafe(`
    SELECT id, status, shg_id, master_order_id FROM public.pickup_orders WHERE master_order_id IN (
      SELECT id FROM public.master_orders WHERE order_number LIKE '%126%'
    );
  `);
  console.log('PICKUP ORDER:', JSON.stringify(pickup, null, 2));

  const gmuOrder = await prisma.$queryRawUnsafe(`
    SELECT id, "orderId", phase, "mainStatus", "pickupShgStatus", "pickupTransporterStatus" FROM public."Order" WHERE "orderId" LIKE '%126%';
  `);
  console.log('GMU ORDER:', JSON.stringify(gmuOrder, null, 2));

  const masterOrder = await prisma.$queryRawUnsafe(`
    SELECT id, order_number, status FROM public.master_orders WHERE order_number LIKE '%126%';
  `);
  console.log('MASTER ORDER:', JSON.stringify(masterOrder, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
