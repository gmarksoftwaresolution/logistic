require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shgUser = await prisma.user.findUnique({
    where: { phoneNumber: '7575757575' }
  });

  if (!shgUser) {
    console.log('SHG User with phone 7575757575 not found!');
    process.exit(1);
  }

  const pickupOrders = await prisma.pickupOrder.findMany({
    where: { shgId: shgUser.id }
  });

  const dropOrders = await prisma.dropOrder.findMany({
    where: { shgId: shgUser.id }
  });

  const masterOrderIds = new Set([
    ...pickupOrders.map(o => o.masterOrderId),
    ...dropOrders.map(o => o.masterOrderId)
  ]);

  const masterOrderIdsArray = Array.from(masterOrderIds);

  if (masterOrderIdsArray.length === 0) {
    console.log('No orders found for this SHG user.');
    return;
  }

  console.log(`Found ${masterOrderIdsArray.length} master orders associated with SHG user ${shgUser.id}. Deleting...`);

  // Delete dependencies first
  await prisma.pickupTracking.deleteMany({
    where: { pickupOrder: { masterOrderId: { in: masterOrderIdsArray } } }
  });

  await prisma.dropTracking.deleteMany({
    where: { dropOrder: { masterOrderId: { in: masterOrderIdsArray } } }
  });

  await prisma.pickupOrderItem.deleteMany({
    where: { pickupOrder: { masterOrderId: { in: masterOrderIdsArray } } }
  });

  await prisma.pickupOrder.deleteMany({
    where: { masterOrderId: { in: masterOrderIdsArray } }
  });

  await prisma.dropOrderItem.deleteMany({
    where: { dropOrder: { masterOrderId: { in: masterOrderIdsArray } } }
  });

  await prisma.dropOrder.deleteMany({
    where: { masterOrderId: { in: masterOrderIdsArray } }
  });

  await prisma.masterOrderItem.deleteMany({
    where: { masterOrderId: { in: masterOrderIdsArray } }
  });

  await prisma.masterOrder.deleteMany({
    where: { id: { in: masterOrderIdsArray } }
  });

  console.log('Successfully deleted all seeded orders for SHG user 7575757575.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
