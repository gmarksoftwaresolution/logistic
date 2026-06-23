process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const transporters = await prisma.user.findMany({
    where: { role: 'TRANSPORTER' }
  });
  
  console.log('=== ASSIGNMENT COUNTS ===');
  for (const t of transporters) {
    const pickupCount = await prisma.pickupOrder.count({
      where: { transporterId: t.id }
    });
    const dropCount = await prisma.dropOrder.count({
      where: { transporterId: t.id }
    });
    if (pickupCount > 0 || dropCount > 0) {
      console.log(`Transporter ID ${t.id} (${t.fullName || 'No Name'}, phone: ${t.phoneNumber}): Pickups = ${pickupCount}, Drops = ${dropCount}`);
    }
  }

  const unassignedPickups = await prisma.pickupOrder.count({ where: { transporterId: null } });
  const unassignedDrops = await prisma.dropOrder.count({ where: { transporterId: null } });
  console.log(`\nUnassigned Pickups: ${unassignedPickups}`);
  console.log(`Unassigned Drops: ${unassignedDrops}`);

  const totalPickups = await prisma.pickupOrder.count();
  const totalDrops = await prisma.dropOrder.count();
  console.log(`\nTotal Pickups in DB: ${totalPickups}`);
  console.log(`Total Drops in DB: ${totalDrops}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
