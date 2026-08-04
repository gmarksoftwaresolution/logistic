import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public."DrivingDetail" ADD COLUMN IF NOT EXISTS "drivingLicenseNo" TEXT;
  `);
  console.log('Successfully added drivingLicenseNo column to public."DrivingDetail"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
