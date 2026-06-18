import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ids = [307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319];

  console.log(`Clearing ${ids.length} pickup orders...`);

  // Delete related items
  await prisma.pickupOrderItem.deleteMany({
    where: {
      pickupOrderId: { in: ids }
    }
  });

  // Delete related tracking
  await prisma.pickupTracking.deleteMany({
    where: {
      pickupOrderId: { in: ids }
    }
  });

  // Delete the pickup orders
  await prisma.pickupOrder.deleteMany({
    where: {
      id: { in: ids }
    }
  });

  console.log('Orders cleared successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
