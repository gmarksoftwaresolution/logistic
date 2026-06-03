process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing specific backend data to trigger UI mock generation...');

  // 1. Clear seller address so it counts as "missing"
  await prisma.address.updateMany({
    data: {
      addressLine1: null,
      village: null,
    }
  });

  // 2. Clear delivery addresses on drops so they count as "missing"
  await prisma.dropOrder.updateMany({
    data: {
      deliveryAddress: null,
      distance: null
    }
  });

  // 3. Clear pickup distances
  await prisma.pickupOrder.updateMany({
    data: {
      distance: null
    }
  });

  console.log('Data cleared! UI will now generate mock data.');
}

main().finally(() => prisma.$disconnect());
