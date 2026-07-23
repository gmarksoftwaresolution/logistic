require('dotenv').config({ path: 'd:\\G-Mark PVT LTD\\Logistics 3 Apps\\logistic\\backend\\shg\\.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 533 },
    include: {
      otherDetails: true
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
