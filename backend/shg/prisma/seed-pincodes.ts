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

function parseBranchType(name: string): string {
  const upper = name.toUpperCase().trim();
  if (upper.endsWith(' H.O') || upper.endsWith(' H.O.') || upper.endsWith(' HO')) {
    return 'Head Office';
  }
  if (upper.endsWith(' S.O') || upper.endsWith(' S.O.') || upper.endsWith(' SO')) {
    return 'Sub Office';
  }
  if (upper.endsWith(' B.O') || upper.endsWith(' B.O.') || upper.endsWith(' BO')) {
    return 'Branch Office';
  }
  return 'Sub Office'; // Default
}

async function main() {
  const csvPath = path.join(__dirname, '../../gmu/pincode_file.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at path: ${csvPath}`);
    process.exit(1);
  }

  console.log('Starting pincodes database seeding...');
  console.log(`Reading CSV from: ${csvPath}`);

  // Truncate existing pincodes data before seeding to avoid duplicates
  console.log('Clearing existing pincodes table...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE public.pincodes RESTART IDENTITY CASCADE;');

  const fileStream = fs.createReadStream(csvPath, 'utf8');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let batch: any[] = [];
  const BATCH_SIZE = 5000;
  
  // Dynamic header indexing
  let villageIdx = 0;      // Village/Locality name
  let nameIdx = 1;         // Officename ( BO/SO/HO)
  let pincodeIdx = 2;      // Pincode
  let blockIdx = 3;        // Sub-distname
  let districtIdx = 4;     // Districtname
  let stateIdx = 5;        // StateName

  const seenInBatch = new Set<string>();

  let processedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isHeader) {
      isHeader = false;
      const headers = parseCSVLine(line);
      villageIdx = headers.indexOf('Village/Locality name') !== -1 ? headers.indexOf('Village/Locality name') : 0;
      nameIdx = headers.indexOf('Officename ( BO/SO/HO)') !== -1 ? headers.indexOf('Officename ( BO/SO/HO)') : 1;
      pincodeIdx = headers.indexOf('Pincode') !== -1 ? headers.indexOf('Pincode') : 2;
      blockIdx = headers.indexOf('Sub-distname') !== -1 ? headers.indexOf('Sub-distname') : 3;
      districtIdx = headers.indexOf('Districtname') !== -1 ? headers.indexOf('Districtname') : 4;
      stateIdx = headers.indexOf('StateName') !== -1 ? headers.indexOf('StateName') : 5;
      console.log(`Detected header mappings -> Village: ${villageIdx}, Officename: ${nameIdx}, Pincode: ${pincodeIdx}, Block: ${blockIdx}, District: ${districtIdx}, State: ${stateIdx}`);
      continue;
    }

    const columns = parseCSVLine(line);
    if (columns.length < 6) {
      skippedCount++;
      continue;
    }

    const pincode = columns[pincodeIdx];
    const name = columns[nameIdx];
    const village = columns[villageIdx];
    const block = columns[blockIdx];
    const district = columns[districtIdx];
    const state = columns[stateIdx];

    if (!pincode || !name || !village) {
      skippedCount++;
      continue;
    }

    // In-memory deduplication for identical village + pincode + officename
    const uniqueKey = `${pincode}_${name}_${village}`;
    if (seenInBatch.has(uniqueKey)) {
      skippedCount++;
      continue;
    }
    seenInBatch.add(uniqueKey);

    batch.push({
      pincode,
      name,
      village,
      block,
      district,
      state,
      branchType: parseBranchType(name),
      deliveryStatus: 'Delivery',
      circle: 'N/A',
      division: 'N/A',
      region: 'N/A',
      country: 'India'
    });

    processedCount++;

    if (batch.length >= BATCH_SIZE) {
      const result = await prisma.pincode.createMany({
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
    const result = await prisma.pincode.createMany({
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
