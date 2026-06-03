process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar%4021@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const transporterId = 1;
  const pickups = await prisma.pickupOrder.findMany({
    where: {
      transporterId,
      status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
    },
    include: {
      items: true,
    }
  });

  const drops = await prisma.dropOrder.findMany({
    where: {
      transporterId,
      status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] },
    },
    include: {
      items: true,
    }
  });

  console.log(`Pickups for transporter ${transporterId}:`, pickups.length);
  console.log(`Drops for transporter ${transporterId}:`, drops.length);
  if(pickups.length > 0) {
      console.log('Sample Pickup:', JSON.stringify(pickups[0], null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
