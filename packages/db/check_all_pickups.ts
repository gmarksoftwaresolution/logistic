import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const completedPickups = await prisma.$queryRawUnsafe(`
    SELECT po.id, po.status, mo.order_number, o."mainStatus", o."pickupShgStatus"
    FROM public.pickup_orders po
    JOIN public.master_orders mo ON po.master_order_id = mo.id
    LEFT JOIN public."Order" o ON o."orderId" = mo.order_number AND o.phase = 'PICKUP';
  `);
  console.log('ALL PICKUP ORDERS:', JSON.stringify(completedPickups, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
