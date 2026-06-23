process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pickup = await prisma.pickupOrder.findUnique({
    where: { id: 491 },
    include: {
      masterOrder: {
        include: {
          dropOrders: true,
          pickupOrders: true
        }
      }
    }
  });

  const drop = await prisma.dropOrder.findUnique({
    where: { id: 491 },
    include: {
      masterOrder: {
        include: {
          dropOrders: true,
          pickupOrders: true
        }
      }
    }
  });

  console.log('=== Pickup Order 491 ===');
  console.log(JSON.stringify(pickup, null, 2));

  console.log('\n=== Drop Order 491 ===');
  console.log(JSON.stringify(drop, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
