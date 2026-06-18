require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findUnique({ where: { phoneNumber: '7777777777' } });
  if (user) {
    const updatedPickups = await prisma.pickupOrder.updateMany({
      where: { shgId: 284 },
      data: { shgId: user.id }
    });
    const updatedDrops = await prisma.dropOrder.updateMany({
      where: { shgId: 284 },
      data: { shgId: user.id }
    });
    console.log('Reassigned', updatedPickups.count, 'pickups and', updatedDrops.count, 'drops to user', user.id);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
