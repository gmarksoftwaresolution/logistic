require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const details = await prisma.$queryRawUnsafe(`
    SELECT u.id, u."phoneNumber", u."fullName", rd."operatingArea", rd."pickupLocations", mv."assignedVillages"
    FROM public."User" u
    LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
    LEFT JOIN public."MilkVanDetail" mv ON u.id = mv."userId"
    WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED';
  `);

  console.log('=== APPROVED TRANSPORTER ROUTE DETAILS ===');
  console.log(JSON.stringify(details, null, 2));
}

main().finally(async () => { await prisma.$disconnect(); });
