import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING ROUTE DETAILS FOR SURESH KADAM (id: 404) ===');

  const user = await prisma.user.findUnique({
    where: { id: 404 }
  });
  console.log('User:', user);

  const routeDetail = await prisma.routeDetail.findUnique({
    where: { userId: 404 }
  });
  console.log('RouteDetail:', routeDetail);

  const milkVanDetail = await prisma.milkVanDetail.findUnique({
    where: { userId: 404 }
  });
  console.log('MilkVanDetail:', milkVanDetail);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
