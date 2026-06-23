process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pickups = await prisma.pickupOrder.findMany({
    where: { transporterId: 66 },
    select: { id: true, status: true }
  });

  const drops = await prisma.dropOrder.findMany({
    where: { transporterId: 66 },
    select: { id: true, status: true }
  });

  console.log('=== Pickup Orders statuses ===');
  pickups.forEach(p => console.log(`Pickup ID ${p.id}: status = ${p.status}`));

  console.log('\n=== Drop Orders statuses ===');
  drops.forEach(d => console.log(`Drop ID ${d.id}: status = ${d.status}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
