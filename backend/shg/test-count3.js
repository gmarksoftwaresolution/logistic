require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { phoneNumber: '7777777777' } });
  const pickups = await prisma.pickupOrder.findMany({ where: { shgId: user?.id } });
  const drops = await prisma.dropOrder.findMany({ where: { shgId: user?.id } });
  console.log('Pickups for this user:', pickups.map(p => ({ id: p.id, status: p.status })));
  console.log('Drops for this user:', drops.map(d => ({ id: d.id, status: d.status })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
