process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pickupTracking = await prisma.pickupTracking.findMany({
    where: { pickupOrderId: 491 },
    orderBy: { updatedAt: 'asc' }
  });

  const dropTracking = await prisma.dropTracking.findMany({
    where: { dropOrderId: 92 },
    orderBy: { updatedAt: 'asc' }
  });

  console.log('=== Pickup Tracking 491 ===');
  console.log(JSON.stringify(pickupTracking, null, 2));

  console.log('\n=== Drop Tracking 92 ===');
  console.log(JSON.stringify(dropTracking, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
