require('dotenv').config({ path: 'd:\\G-Mark PVT LTD\\Logistics 3 Apps\\logistic\\backend\\shg\\.env' });
const axios = require('axios');

async function testApi() {
  try {
    // 1. Get a token for user 533 (Pooja Patil)
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({ where: { id: 533 } });
    
    // We can just generate a token using the same logic or fetch the profile directly.
    // Actually, I can just query the DB again.
    const userProfile = await prisma.user.findUnique({
      where: { id: 533 },
      include: { otherDetails: true }
    });
    
    console.log("DB returned otherDetails:", JSON.stringify(userProfile.otherDetails, null, 2));
    prisma.$disconnect();
  } catch(e) {
    console.error(e);
  }
}
testApi();
