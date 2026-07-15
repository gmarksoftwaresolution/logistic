import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const routeDetails = await prisma.routeDetail.findMany({
    include: {
      user: true
    }
  });
  console.log('--- Route Details ---');
  for (const rd of routeDetails) {
    console.log(`Transporter ${rd.userId} (${rd.user?.fullName}, ${rd.user?.phoneNumber}):`);
    console.log(`  operatingArea: ${rd.operatingArea}`);
    console.log(`  pickupLocations: ${rd.pickupLocations}`);
  }

  const milkVanDetails = await prisma.milkVanDetail.findMany({
    include: {
      user: true
    }
  });
  console.log('--- Milk Van Details ---');
  for (const mvd of milkVanDetails) {
    console.log(`Transporter ${mvd.userId} (${mvd.user?.fullName}, ${mvd.user?.phoneNumber}):`);
    console.log(`  assignedVillages: ${mvd.assignedVillages}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
