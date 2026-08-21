require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function seedPincodes() {
  console.log('=== Starting Pincode Seeding Process (DATABASE_URL) ===');

  const csvPath = path.join(__dirname, '..', 'Locality_village_pincode_final_mar-2017.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  // Ensure table pincode exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "pincode" (
      "id" SERIAL NOT NULL,
      "village" TEXT NOT NULL,
      "post_office" TEXT NOT NULL,
      "pincode" TEXT NOT NULL,
      "taluka" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "pincode_pkey" PRIMARY KEY ("id")
    );
  `);

  const initialCount = await prisma.pincode.count();
  console.log(`Current pincode records in database: ${initialCount.toLocaleString()}`);

  const startTime = Date.now();
  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let batch = [];
  let totalRead = 0;
  let totalInserted = 0;
  const BATCH_SIZE = 2500;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    totalRead++;

    // Resume skip if already partially seeded
    if (totalRead <= initialCount) {
      continue;
    }

    const parts = parseCsvLine(line);
    if (parts.length >= 6) {
      const village = (parts[0] || '').trim();
      const postOffice = (parts[1] || '').trim();
      const pincode = (parts[2] || '').trim();
      const taluka = (parts[3] || '').trim();
      const district = (parts[4] || '').trim();
      const state = (parts[5] || '').trim();

      if (pincode && village) {
        batch.push({
          village,
          postOffice,
          pincode,
          taluka,
          district,
          state,
        });
      }
    }

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch);
      totalInserted += batch.length;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const percent = Math.round((totalRead / 906267) * 100);
      console.log(
        `[Progress] Read ${totalRead.toLocaleString()} lines | Inserted ${totalInserted.toLocaleString()} new records (Total: ${(initialCount + totalInserted).toLocaleString()} / ${percent}%) | Time: ${elapsed}s`
      );
      batch = [];
    }
  }

  if (batch.length > 0) {
    await insertBatch(batch);
    totalInserted += batch.length;
    console.log(`[Progress] Inserted final batch of ${batch.length} records.`);
  }

  console.log('Creating database indexes on "pincode" table...');
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_village_idx" ON "pincode"("village");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_pincode_idx" ON "pincode"("pincode");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_district_idx" ON "pincode"("district");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_taluka_idx" ON "pincode"("taluka");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_village_pincode_idx" ON "pincode"("village", "pincode");`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n=== Seeding Completed in ${durationSec} seconds ===`);
  console.log(`Total CSV lines processed: ${totalRead.toLocaleString()}`);

  const finalCount = await prisma.pincode.count();
  console.log(`Final total count in "pincode" table: ${finalCount.toLocaleString()}`);
}

async function insertBatch(batch) {
  if (batch.length === 0) return;
  try {
    await prisma.pincode.createMany({
      data: batch,
      skipDuplicates: true,
    });
  } catch (err) {
    console.error('Batch error, retrying with smaller sub-batches...', err.message);
    const subSize = 500;
    for (let i = 0; i < batch.length; i += subSize) {
      const subBatch = batch.slice(i, i + subSize);
      try {
        await prisma.pincode.createMany({
          data: subBatch,
          skipDuplicates: true,
        });
      } catch (subErr) {
        console.error('Sub-batch error:', subErr.message);
      }
    }
  }
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

seedPincodes()
  .catch((err) => {
    console.error('Fatal error during pincode seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
