require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { phoneNumber: '7777777777' } });
  console.log('User:', user?.id);
  const pickups = await prisma.pickupOrder.findMany({ where: { shgId: user?.id } });
  console.log('Pickups for this user:', pickups.length);
  const drops = await prisma.dropOrder.findMany({ where: { shgId: user?.id } });
  console.log('Drops for this user:', drops.length);
  const allPickups = await prisma.pickupOrder.findMany();
  console.log('Total pickups in DB:', allPickups.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
