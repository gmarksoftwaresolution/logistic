require('dotenv').config({ path: '../../.env' });
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- TESTING RAW QUERY ON SEEDED PINCODE TABLE ---');
  const records = await prisma.$queryRawUnsafe(`SELECT * FROM pincode WHERE pincode = '416502';`);
  console.log('Seeded records found for 416502:', records.length);
  if (records.length > 0) {
    console.log('Sample record from 906K seeded dataset:', records[0]);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
