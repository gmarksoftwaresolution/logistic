require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.pincodeDirectory.findMany({
    where: { pincode: '416503' }
  });
  console.log('Count for 416503:', records.length);
  console.log(JSON.stringify(records, null, 2));
}

main().then(() => prisma.$disconnect()).catch(err => { console.error(err); prisma.$disconnect(); });
