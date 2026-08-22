require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function main() {
  console.log('Adding flowType and directDropShgId columns to Order table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "flowType" TEXT DEFAULT 'VIA_HUB';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "directDropShgId" TEXT;
  `);
  console.log('Columns successfully added to "Order" table!');
}

main()
  .catch((err) => {
    console.error('Error adding columns:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
