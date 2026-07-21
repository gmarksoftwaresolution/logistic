require('dotenv').config({ path: 'd:\\G-Mark PVT LTD\\Logistics 3 Apps\\logistic\\backend\\shg\\.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update all records in OtherDetails to have carryingCapacity of "30"
  const result = await prisma.otherDetails.updateMany({
    data: {
      carryingCapacity: "30"
    }
  });
  console.log(`Updated ${result.count} records in OtherDetails to carryingCapacity "30"`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
