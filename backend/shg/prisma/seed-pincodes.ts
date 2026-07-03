import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load env variables manually from backend/shg/.env to ensure stable connection
const dotenvPath = path.join(__dirname, '../.env');
if (fs.existsSync(dotenvPath)) {
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
  dotenvContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

// Direct connection override for stable inserts
if (process.env.DIRECT_URL) {
  console.log('Using DIRECT_URL connection for seeding...');
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

// Memory-efficient line-by-line CSV parser with quote support
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const csvPath = path.join(__dirname, '../pincode/India_pincodes (1).csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at path: ${csvPath}`);
    process.exit(1);
  }

  console.log('Starting pincode_directory database seeding...');
  console.log(`Reading CSV from: ${csvPath}`);

  // Truncate existing pincode_directory data before seeding to avoid duplicates
  console.log('Clearing existing pincode_directory table...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE public.pincode_directory RESTART IDENTITY CASCADE;');

  const fileStream = fs.createReadStream(csvPath, 'utf8');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let batch: any[] = [];
  const BATCH_SIZE = 5000;
  
  // Dynamic header indexing
  let nameIdx = 0;
  let pincodeIdx = 11;
  let blockIdx = 8;
  let districtIdx = 5;
  let stateIdx = 9;
  let countryIdx = 10;

  const seenInBatch = new Set<string>();

  let processedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isHeader) {
      isHeader = false;
      const headers = parseCSVLine(line);
      nameIdx = headers.indexOf('Name') !== -1 ? headers.indexOf('Name') : 0;
      pincodeIdx = headers.indexOf('Pincode') !== -1 ? headers.indexOf('Pincode') : 11;
      blockIdx = headers.indexOf('Block') !== -1 ? headers.indexOf('Block') : 8;
      districtIdx = headers.indexOf('District') !== -1 ? headers.indexOf('District') : 5;
      stateIdx = headers.indexOf('State') !== -1 ? headers.indexOf('State') : 9;
      countryIdx = headers.indexOf('Country') !== -1 ? headers.indexOf('Country') : 10;
      console.log(`Detected header mappings -> Name: ${nameIdx}, Pincode: ${pincodeIdx}, Block: ${blockIdx}, District: ${districtIdx}, State: ${stateIdx}, Country: ${countryIdx}`);
      continue;
    }

    const columns = parseCSVLine(line);
    if (columns.length < 12) {
      skippedCount++;
      continue;
    }

    const pincode = columns[pincodeIdx];
    const village = columns[nameIdx];
    const taluka = columns[blockIdx] || columns[districtIdx] || 'N/A';
    const district = columns[districtIdx];
    const state = columns[stateIdx];
    const country = columns[countryIdx] || 'India';

    if (!pincode || !village) {
      skippedCount++;
      continue;
    }

    // In-memory deduplication for identical village + pincode
    const uniqueKey = `${pincode}_${village}`;
    if (seenInBatch.has(uniqueKey)) {
      skippedCount++;
      continue;
    }
    seenInBatch.add(uniqueKey);

    batch.push({
      pincode,
      village,
      taluka,
      district,
      state,
      country
    });

    processedCount++;

    if (batch.length >= BATCH_SIZE) {
      const result = await (prisma as any).pincodeDirectory.createMany({
        data: batch,
        skipDuplicates: true
      });
      insertedCount += result.count;
      console.log(`Processed: ${processedCount} rows... Seeded: ${insertedCount} records...`);
      batch = [];
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    const result = await (prisma as any).pincodeDirectory.createMany({
      data: batch,
      skipDuplicates: true
    });
    insertedCount += result.count;
  }

  console.log('\n--- Seeding Process Completed ---');
  console.log(`Total rows processed: ${processedCount}`);
  console.log(`Successfully inserted: ${insertedCount} new records`);
  console.log(`Skipped (invalid/duplicate rows): ${skippedCount}`);
  console.log('---------------------------------\n');
}

main()
  .catch(err => {
    console.error('CRITICAL: Seeding script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
