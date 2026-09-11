const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Inspecting All Orders in DB ===");
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderId: true,
      mainStatus: true,
      pickupShgStatus: true,
      dropShgStatus: true,
      pickupTransporterStatus: true,
      dropTransporterStatus: true,
      deliveredAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20
  });

  orders.forEach(o => {
    console.log(`Order ${o.id} (${o.orderId}): mainStatus=${o.mainStatus}, dropShgStatus=${o.dropShgStatus}, dropTransporterStatus=${o.dropTransporterStatus}`);
  });

  const completedCount = orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.mainStatus) || o.dropShgStatus === 'DELIVERED').length;
  console.log(`\nTotal Delivered/Completed Orders in DB: ${completedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
