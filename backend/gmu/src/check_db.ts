import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderId: true,
      mainStatus: true,
      returnType: true,
    },
  });
  console.log('Orders in database:');
  console.dir(orders, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
