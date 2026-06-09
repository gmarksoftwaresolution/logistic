process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shg = await prisma.user.findFirst({
    where: { phoneNumber: '7777777777' }
  });

  if (!shg) {
    console.error('SHG user not found!');
    return;
  }

  const pickups = await prisma.pickupOrder.findMany({
    where: { shgId: shg.id }
  });

  const drops = await prisma.dropOrder.findMany({
    where: { shgId: shg.id }
  });

  console.log(`=== SHG User ID: ${shg.id} ===`);
  console.log(`Assigned Pickup Orders (${pickups.length}):`);
  pickups.forEach(p => {
    console.log(`- ID: ${p.id}, Number: ${p.pickupOrderNumber}, Status: ${p.status}`);
  });

  console.log(`\nAssigned Drop Orders (${drops.length}):`);
  drops.forEach(d => {
    console.log(`- ID: ${d.id}, Number: ${d.dropOrderNumber}, Status: ${d.status}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
