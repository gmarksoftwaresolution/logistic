import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environmental variables
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../backend/gmu/.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Running raw SQL to create ScanSession and ScanSessionItem tables...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."ScanSession" (
      "sessionId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "userRole" TEXT NOT NULL,
      "sessionType" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "orderIds" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScanSession_pkey" PRIMARY KEY ("sessionId")
    );
  `);
  console.log('- ScanSession table checked/created.');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."ScanSessionItem" (
      "id" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "parcelId" TEXT NOT NULL,
      "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScanSessionItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ScanSessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."ScanSession"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ScanSessionItem_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES public."Parcel"("parcelId") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('- ScanSessionItem table checked/created.');

  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ScanSessionItem_sessionId_parcelId_key" ON public."ScanSessionItem"("sessionId", "parcelId");
    `);
    console.log('- ScanSessionItem unique index checked/created.');
  } catch (e) {
    console.log('- Note: ScanSessionItem unique index already exists or could not be created.');
  }

  console.log('Finished raw SQL table setup successfully.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
