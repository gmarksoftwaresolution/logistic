const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { flowType: 'DIRECT_SHG_TO_SHG' },
        { flowType: 'shg_to_shg' }
      ]
    },
    include: { seller: true, buyer: true }
  });

  console.log(`Found ${orders.length} direct flow orders`);
  for (const o of orders) {
    console.log(`Order ${o.id}: flowType=${o.flowType}, Seller Village=${o.seller?.village}, Buyer Village=${o.buyer?.village}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
