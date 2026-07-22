import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables manually from the root .env
const dotenvPath = path.join(__dirname, '../../../.env');
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

// Override connection for stable seeding if DIRECT_URL is present
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

// Helper to parse CSV line correctly handling quotes and commas
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
  const csvPath = path.join(__dirname, '../Locality_village_pincode_final_mar-2017.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  console.log('Starting seed process for PincodeDirectory...');
  console.log(`Reading CSV from: ${csvPath}`);

  // Safe to execute multiple times: truncate existing table first
  console.log('Truncating existing pincode_directory table...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE public.pincode_directory RESTART IDENTITY CASCADE;');

  const fileStream = fs.createReadStream(csvPath, 'utf8');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let batch: any[] = [];
  const BATCH_SIZE = 5000;

  // In-memory unique verification key: Pincode + name (Village)
  const seenUniqueKeys = new Set<string>();

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalSkipped = 0;

  // Headers structure in new CSV: Village/Locality name,Officename ( BO/SO/HO),Pincode,Sub-distname,Districtname,StateName
  let villageIdx = 0;
  let officenameIdx = 1;
  let pincodeIdx = 2;
  let subdistIdx = 3;
  let districtIdx = 4;
  let stateIdx = 5;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isHeader) {
      isHeader = false;
      const headers = parseCSVLine(line).map(h => h.trim());
      villageIdx = headers.findIndex(h => h.toLowerCase() === 'village/locality name');
      officenameIdx = headers.findIndex(h => h.toLowerCase().startsWith('officename'));
      pincodeIdx = headers.findIndex(h => h.toLowerCase() === 'pincode');
      subdistIdx = headers.findIndex(h => h.toLowerCase() === 'sub-distname');
      districtIdx = headers.findIndex(h => h.toLowerCase() === 'districtname');
      stateIdx = headers.findIndex(h => h.toLowerCase() === 'statename');
      
      console.log('Detected CSV Column Headers Mapping successfully.');
      continue;
    }

    totalProcessed++;
    const columns = parseCSVLine(line);
    if (columns.length < 6) {
      totalSkipped++;
      continue;
    }

    const village = columns[villageIdx];
    const postOffice = columns[officenameIdx];
    const pincode = columns[pincodeIdx];
    const taluka = columns[subdistIdx];
    const district = columns[districtIdx];
    const state = columns[stateIdx];

    // Validations: Required fields and pincode length
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode) || !village || !district || !state) {
      totalSkipped++;
      continue;
    }

    // Ignore duplicates (pincode + village combination)
    const uniqueKey = `${pincode}_${village.toLowerCase().trim()}`;
    if (seenUniqueKeys.has(uniqueKey)) {
      totalDuplicates++;
      continue;
    }
    seenUniqueKeys.add(uniqueKey);

    batch.push({
      village,
      postOffice,
      pincode,
      taluka,
      district,
      state,
    });

    if (batch.length >= BATCH_SIZE) {
      const result = await prisma.pincodeDirectory.createMany({
        data: batch,
        skipDuplicates: true
      });
      totalInserted += result.count;
      console.log(`Processed ${totalProcessed} rows. Inserted ${totalInserted} records so far...`);
      batch = [];
    }
  }

  // Insert any remaining items in the last batch
  if (batch.length > 0) {
    const result = await prisma.pincodeDirectory.createMany({
      data: batch,
      skipDuplicates: true
    });
    totalInserted += result.count;
  }

  console.log('\n--- Seeding Completed Successfully ---');
  console.log(`Total CSV rows processed: ${totalProcessed}`);
  console.log(`Successfully inserted:   ${totalInserted}`);
  console.log(`Duplicate records:       ${totalDuplicates}`);
  console.log(`Skipped (invalid rows):  ${totalSkipped}`);
  console.log('-------------------------------------\n');
}

main()
  .catch(err => {
    console.error('CRITICAL: Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
