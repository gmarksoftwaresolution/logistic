const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({ select: { id: true } });
  const validOrderIds = new Set(orders.map(o => o.id));

  const parcels = await prisma.parcel.findMany();
  let count = 0;
  for (const p of parcels) {
    if (!validOrderIds.has(p.orderId)) {
      console.log(`Deleting orphan parcel ${p.parcelId} with orderId ${p.orderId}`);
      await prisma.parcel.delete({ where: { parcelId: p.parcelId } });
      count++;
    }
  }

  console.log(`Deleted ${count} orphan Parcels`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
