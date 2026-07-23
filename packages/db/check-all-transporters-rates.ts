import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllTransporters() {
  console.log('=== ALL APPROVED TRANSPORTERS IN DB ===\n');

  const list = await prisma.$queryRawUnsafe(`
    SELECT u.id, u."fullName", u."phoneNumber", a.village as "homeVillage", a.pincode as "homePincode", 
           od."minWeight", od."maxWeight", od."ratePerKm", rd."operatingArea", rd."pickupLocations"
    FROM public."User" u
    JOIN public."Address" a ON u.id = a."userId"
    LEFT JOIN public."OtherDetails" od ON u.id = od."userId"
    LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
    WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
  `) as any[];

  for (const t of list) {
    console.log(`ID: ${t.id} | Name: ${t.fullName} | Mobile: ${t.phoneNumber}`);
    console.log(`   Address: Village=${t.homeVillage}, Pincode=${t.homePincode}`);
    console.log(`   OtherDetails: minWeight=${t.minWeight}, maxWeight=${t.maxWeight}, ratePerKm=${t.ratePerKm}`);
    console.log(`   RouteDetail: operatingArea="${t.operatingArea}" | pickupLocations="${t.pickupLocations}"\n`);
  }
}

checkAllTransporters()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
