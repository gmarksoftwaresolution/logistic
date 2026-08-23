const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const parcels = await prisma.parcel.findMany({ select: { parcelId: true } });
  const validParcelIds = new Set(parcels.map(p => p.parcelId));

  const items = await prisma.scanSessionItem.findMany();
  let count = 0;
  for (const item of items) {
    if (!validParcelIds.has(item.parcelId)) {
      console.log(`Deleting orphan scan item ${item.id} for parcelId ${item.parcelId}`);
      await prisma.scanSessionItem.delete({ where: { id: item.id } });
      count++;
    }
  }

  console.log(`Deleted ${count} orphan ScanSessionItems`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
