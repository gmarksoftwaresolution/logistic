import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.pickupOrder.updateMany({
    where: { masterOrder: { orderNumber: 'ORD-2026-111' } },
    data: { status: 'ACCEPTED' }
  });

  await prisma.$executeRawUnsafe(`
    UPDATE public."Order"
    SET "pickupShgStatus" = 'ACCEPTED', "mainStatus" = 'PICKUP_SHG_ACCEPTED'
    WHERE "orderId" = 'ORD-2026-111' AND phase = 'PICKUP';
  `);

  await prisma.masterOrder.updateMany({
    where: { orderNumber: 'ORD-2026-111' },
    data: { status: 'PICKUP_SHG_ACCEPTED' }
  });

  console.log('Reset ORD-2026-111 to ACCEPTED');
}

main().catch(console.error).finally(() => prisma.$disconnect());
