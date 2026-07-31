require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying pincode_directory...');
  try {
    const records = await prisma.pincodeDirectory.findMany({
      where: { pincode: '140108' },
      take: 3
    });
    console.log(JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main().finally(() => prisma.$disconnect());
