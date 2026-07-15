require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // We will cast vehicleType based on recognized values
    const query = `
      ALTER TABLE "OtherDetails" 
      ALTER COLUMN "vehicleType" TYPE "VehicleType" 
      USING (
        CASE 
          WHEN "vehicleType" = 'TWO_WHEELER' THEN 'TWO_WHEELER'::"VehicleType"
          WHEN "vehicleType" = 'THREE_WHEELER' THEN 'THREE_WHEELER'::"VehicleType"
          WHEN "vehicleType" = 'FOUR_WHEELER' THEN 'FOUR_WHEELER'::"VehicleType"
          WHEN "vehicleType" = 'MILK_VAN' THEN 'MILK_VAN'::"VehicleType"
          ELSE 'OTHER'::"VehicleType"
        END
      );
    `;
    const result = await prisma.$executeRawUnsafe(query);
    console.log("Migration applied successfully. Rows affected:", result);
  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
