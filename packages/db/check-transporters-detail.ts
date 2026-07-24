import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDetails() {
  console.log('=== TRANSPORTER ROUTE DETAILS & OTHER DETAILS ===\n');

  const transporters = await prisma.$queryRawUnsafe(`
    SELECT u.id, u."fullName", a.village, a.pincode, rd."operatingArea", rd."pickupLocations", od."minWeight", od."maxWeight", od."ratePerKm"
    FROM public."User" u
    JOIN public."Address" a ON u.id = a."userId"
    LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
    LEFT JOIN public."OtherDetails" od ON u.id = od."userId"
    WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
  `) as any[];

  for (const t of transporters) {
    console.log(`Transporter ID: ${t.id} (${t.fullName})`);
    console.log(`  Address: Village=${t.village}, Pincode=${t.pincode}`);
    console.log(`  operatingArea: "${t.operatingArea}"`);
    console.log(`  pickupLocations: "${t.pickupLocations}"`);
    console.log(`  minWeight: ${t.minWeight}, maxWeight: ${t.maxWeight}, ratePerKm: ${t.ratePerKm}\n`);
  }
}

checkDetails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
