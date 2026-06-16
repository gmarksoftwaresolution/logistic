require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { phoneNumber: '7777777777' } });
  const pickups = await prisma.pickupOrder.findMany({ where: { shgId: user?.id }, include: { masterOrder: true } });
  const drops = await prisma.dropOrder.findMany({ where: { shgId: user?.id }, include: { masterOrder: true } });
  console.log('Pickups for this user:', pickups.map(p => ({ id: p.id, orderNumber: p.masterOrder.orderNumber })));
  console.log('Drops for this user:', drops.map(d => ({ id: d.id, orderNumber: d.masterOrder.orderNumber })));
  const otherPickups = await prisma.pickupOrder.findMany({ where: { shgId: { not: user?.id } }, include: { masterOrder: true } });
  console.log('Other pickups:', otherPickups.map(p => ({ id: p.id, shgId: p.shgId, orderNumber: p.masterOrder.orderNumber })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
