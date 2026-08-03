"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
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
            }
            else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            process.env[key] = value.trim();
        }
    });
}
if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const prisma = new client_1.PrismaClient();
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
async function main() {
    const csvPath = path.join(__dirname, '../India_pincodes.csv');
    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at: ${csvPath}`);
        process.exit(1);
    }
    console.log('Starting seed process for PincodeDirectory...');
    console.log(`Reading CSV from: ${csvPath}`);
    console.log('Truncating existing pincode_directory table...');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE public.pincode_directory RESTART IDENTITY CASCADE;');
    const fileStream = fs.createReadStream(csvPath, 'utf8');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    let isHeader = true;
    let batch = [];
    const BATCH_SIZE = 5000;
    const seenUniqueKeys = new Set();
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalDuplicates = 0;
    let totalSkipped = 0;
    let nameIdx = 0;
    let descIdx = 1;
    let branchTypeIdx = 2;
    let deliveryStatusIdx = 3;
    let circleIdx = 4;
    let districtIdx = 5;
    let divisionIdx = 6;
    let regionIdx = 7;
    let blockIdx = 8;
    let stateIdx = 9;
    let countryIdx = 10;
    let pincodeIdx = 11;
    for await (const line of rl) {
        if (!line.trim())
            continue;
        if (isHeader) {
            isHeader = false;
            const headers = parseCSVLine(line);
            nameIdx = headers.indexOf('Name');
            descIdx = headers.indexOf('Description');
            branchTypeIdx = headers.indexOf('BranchType');
            deliveryStatusIdx = headers.indexOf('DeliveryStatus');
            circleIdx = headers.indexOf('Circle');
            districtIdx = headers.indexOf('District');
            divisionIdx = headers.indexOf('Division');
            regionIdx = headers.indexOf('Region');
            blockIdx = headers.indexOf('Block');
            stateIdx = headers.indexOf('State');
            countryIdx = headers.indexOf('Country');
            pincodeIdx = headers.indexOf('Pincode');
            console.log('Detected CSV Column Headers Mapping successfully.');
            continue;
        }
        totalProcessed++;
        const columns = parseCSVLine(line);
        if (columns.length < 12) {
            totalSkipped++;
            continue;
        }
        const name = columns[nameIdx];
        const description = columns[descIdx] || null;
        const branchType = columns[branchTypeIdx] || null;
        const deliveryStatus = columns[deliveryStatusIdx] || null;
        const circle = columns[circleIdx] || null;
        const district = columns[districtIdx];
        const division = columns[divisionIdx] || null;
        const region = columns[regionIdx] || null;
        const block = columns[blockIdx] || null;
        const state = columns[stateIdx];
        const country = columns[countryIdx] || 'India';
        const pincode = columns[pincodeIdx];
        if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode) || !name || !district || !state) {
            totalSkipped++;
            continue;
        }
        const uniqueKey = `${pincode}_${name.toLowerCase().trim()}`;
        if (seenUniqueKeys.has(uniqueKey)) {
            totalDuplicates++;
            continue;
        }
        seenUniqueKeys.add(uniqueKey);
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
            pincode,
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
//# sourceMappingURL=seed-pincode.js.map