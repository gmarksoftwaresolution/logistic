import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE public.pickup_orders
    SET status = 'PICKED_UP'
    WHERE id IN (109, 114);
  `);
  console.log('Updated pickup_orders rows to PICKED_UP:', result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
