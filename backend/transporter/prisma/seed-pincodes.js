const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables from .env manually to be directory-agnostic
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

// Override DATABASE_URL with DIRECT_URL for stable direct connection (avoiding PgBouncer timeouts)
if (process.env.DIRECT_URL) {
  console.log('Using DIRECT_URL connection for seeding...');
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Character-by-character CSV parser to handle potential quoted commas correctly
function parseCSVLine(line) {
  const result = [];
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

  console.log('Starting pincode database seeding...');
  console.log(`Reading CSV from: ${csvPath}`);
  
  const fileStream = fs.createReadStream(csvPath, 'utf8');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let batch = [];
  const BATCH_SIZE = 4000;
  
  // Track duplicates in the current run/batch to avoid sending duplicates in a single transaction
  const seenInBatch = new Set();
  
  let processedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isHeader) {
      isHeader = false;
      continue;
    }

    const columns = parseCSVLine(line);
    
    if (columns.length < 12) {
      skippedCount++;
      continue;
    }

    const name = columns[0];
    const description = columns[1] || null;
    const branchType = columns[2] || null;
    const deliveryStatus = columns[3] || null;
    const circle = columns[4] || null;
    const district = columns[5] || null;
    const division = columns[6] || null;
    const region = columns[7] || null;
    const block = columns[8] || null;
    const state = columns[9] || null;
    const country = columns[10] || null;
    const pincode = columns[11];

    if (!pincode || !name) {
      skippedCount++;
      continue;
    }

    // Deduplicate in-memory for the current batch/process run
    const uniqueKey = `${pincode}_${name}`;
    if (seenInBatch.has(uniqueKey)) {
      skippedCount++;
      continue;
    }
    seenInBatch.add(uniqueKey);

    batch.push({
      name,
      description,
      branchType,
      deliveryStatus,
      circle,
      district,
      division,
      region,
      block,
      state,
      country,
      pincode
    });

    processedCount++;

    if (batch.length >= BATCH_SIZE) {
      const result = await prisma.pincode.createMany({
        data: batch,
        skipDuplicates: true
      });
      insertedCount += result.count;
      console.log(`Processed: ${processedCount} rows... Seeded: ${insertedCount} new records...`);
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
