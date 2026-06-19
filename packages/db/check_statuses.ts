import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pickupStatuses = await prisma.pickupOrder.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Pickup Order Statuses:', pickupStatuses);

  const dropStatuses = await prisma.dropOrder.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Drop Order Statuses:', dropStatuses);

  const masterStatuses = await prisma.masterOrder.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Master Order Statuses:', masterStatuses);
}

main().catch(console.error).finally(() => prisma.$disconnect());
