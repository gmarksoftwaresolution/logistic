const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { id: '102' },
        { orderId: { contains: '102' } }
      ]
    },
    include: {
      seller: true,
      buyer: true,
      assignments: true,
      parcels: true
    }
  });

  console.log("Found orders count:", orders.length);
  for (const o of orders) {
    console.log("FULL ORDER OBJECT:", JSON.stringify(o, null, 2));
    console.log("----------------------------------------");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
