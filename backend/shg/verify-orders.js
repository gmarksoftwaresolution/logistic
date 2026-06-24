require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetPhone = '7575757575';
  const targetUser = await prisma.user.findUnique({
    where: { phoneNumber: targetPhone }
  });

  console.log(`Target User ID: ${targetUser?.id}`);

  const pickupOrders = await prisma.pickupOrder.findMany({
    where: { shgId: targetUser?.id }
  });

  const dropOrders = await prisma.dropOrder.findMany({
    where: { shgId: targetUser?.id }
  });

  console.log(`Pickups found: ${pickupOrders.length}`);
  console.log(`Drops found: ${dropOrders.length}`);
  
  if (pickupOrders.length > 0) {
    console.log(`First pickup order status: ${pickupOrders[0].status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
