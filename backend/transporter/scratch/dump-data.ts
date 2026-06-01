import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  console.log('Total Users:', userCount);

  const roleCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
  });
  console.log('User roles distribution:', roleCounts);

  const users = await prisma.user.findMany({
    take: 10,
    select: {
      id: true,
      phoneNumber: true,
      role: true,
      fullName: true,
    }
  });
  console.log('Sample Users:', users);

  const products = await prisma.product.findMany({
    take: 5,
  });
  console.log('Sample Products:', products);

  const masterOrders = await prisma.masterOrder.findMany({ take: 5 });
  console.log('Sample MasterOrders:', masterOrders);

  const pickupOrders = await prisma.pickupOrder.findMany({ take: 5 });
  console.log('Sample PickupOrders:', pickupOrders);

  const dropOrders = await prisma.dropOrder.findMany({ take: 5 });
  console.log('Sample DropOrders:', dropOrders);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
