require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPincodeTable() {
  console.log('Creating "pincode" table in PostgreSQL database...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "pincode" (
      "id" SERIAL NOT NULL,
      "village" TEXT NOT NULL,
      "post_office" TEXT NOT NULL,
      "pincode" TEXT NOT NULL,
      "taluka" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "pincode_pkey" PRIMARY KEY ("id")
    );
  `);

  console.log('Creating indexes on "pincode" table...');
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_village_idx" ON "pincode"("village");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_pincode_idx" ON "pincode"("pincode");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_district_idx" ON "pincode"("district");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_taluka_idx" ON "pincode"("taluka");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pincode_village_pincode_idx" ON "pincode"("village", "pincode");`);

  console.log('Successfully created "pincode" table and indexes!');
}

createPincodeTable()
  .catch((err) => {
    console.error('Error creating table:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
