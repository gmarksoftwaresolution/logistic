const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const parcels = await prisma.parcel.findMany({ select: { parcelId: true } });
  const validParcelIds = new Set(parcels.map(p => p.parcelId));

  const scans = await prisma.parcelScanHistory.findMany();
  let count = 0;
  for (const s of scans) {
    if (!validParcelIds.has(s.parcelId)) {
      console.log(`Deleting orphan scan history ${s.id} for parcelId ${s.parcelId}`);
      await prisma.parcelScanHistory.delete({ where: { id: s.id } });
      count++;
    }
  }

  console.log(`Deleted ${count} orphan ParcelScanHistory records`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
