import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.pickupOrder.updateMany({
    where: { masterOrder: { orderNumber: 'ORD-2026-116' } },
    data: { status: 'PICKED_UP' }
  });

  await prisma.$executeRawUnsafe(`
    UPDATE public."Order"
    SET "pickupShgStatus" = 'PICKED', "mainStatus" = 'PARCEL_AT_SHG'
    WHERE "orderId" = 'ORD-2026-116' AND phase = 'PICKUP';
  `);

  await prisma.masterOrder.updateMany({
    where: { orderNumber: 'ORD-2026-116' },
    data: { status: 'PARCEL_AT_SHG' }
  });

  console.log('Fixed ORD-2026-116 status to PICKED_UP in DB');
}

main().catch(console.error).finally(() => prisma.$disconnect());
