require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPincode416502() {
  const cleanPin = '416502';
  console.log('--- CHECKING DB VILLAGES FOR PINCODE 416502 ---');

  let dbPincodeRecords = [];
  try {
    dbPincodeRecords = await prisma.pincodeDirectory.findMany({
      where: { pincode: cleanPin }
    });
  } catch (pErr) {
    dbPincodeRecords = await prisma.$queryRawUnsafe(
      `SELECT * FROM pincode WHERE pincode = $1;`,
      cleanPin
    );
  }

  console.log(`Found ${dbPincodeRecords.length} DB records for 416502.`);
  const dbVillages = [...new Set(dbPincodeRecords.map(r => r.village).filter(Boolean))].sort();
  console.log('Official DB Villages for 416502:', dbVillages);
}

checkPincode416502().catch(console.error).finally(() => prisma.$disconnect());
