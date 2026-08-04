import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== PERMANENTLY ENSURE ALL COLUMNS EXIST IN POSTGRESQL ===');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public."Order" ADD COLUMN IF NOT EXISTS "currentStage" TEXT;
  `);
  console.log('✅ Added currentStage column to public."Order" in PostgreSQL!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
