import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function main() {
  const results: any[] = [];
  const csvFilePath = path.join(__dirname, '../pincode/India_pincodes (1).csv');

  console.log('Reading CSV file from:', csvFilePath);

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data: any) => {
        // Name,Description,BranchType,DeliveryStatus,Circle,District,Division,Region,Block,State,Country,Pincode
        if (data.Pincode && data.Name) {
          results.push({
            pincode: data.Pincode,
            village: data.Name,
            taluka: data.Block || data.District, // fallback to district if block is empty
            district: data.District,
            state: data.State,
            country: data.Country || 'India',
          });
        }
      })
      .on('end', async () => {
        console.log(`Parsed ${results.length} rows. Start inserting...`);
        
        // Chunk the results to avoid memory issues and query limits
        const chunkSize = 10000;
        for (let i = 0; i < results.length; i += chunkSize) {
          const chunk = results.slice(i, i + chunkSize);
          await (prisma as any).pincodeDirectory.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          console.log(`Inserted rows ${i} to ${i + chunk.length}`);
        }

        console.log('Pincodes seed completed.');
        resolve(null);
      })
      .on('error', (error: any) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
