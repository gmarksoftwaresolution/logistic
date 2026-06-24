const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "pincode_directory";`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "pincode_directory" (
      "id" SERIAL PRIMARY KEY,
      "pincode" TEXT NOT NULL,
      "village" TEXT NOT NULL,
      "taluka" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "country" TEXT NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "pincode_directory_pincode_idx" ON "pincode_directory"("pincode");
  `);
  console.log('Table created successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
