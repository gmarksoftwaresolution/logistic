require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function dropPincodeDirectory() {
  console.log('Dropping table "pincode_directory" from database...');
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "pincode_directory" CASCADE;`);
  console.log('Successfully dropped "pincode_directory" table!');
}

dropPincodeDirectory()
  .catch((err) => {
    console.error('Error dropping table:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
