process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying transporter user with id 6...');
  
  const user = await prisma.user.findUnique({
    where: { id: 6 },
    include: {
      address: true,
      drivingDetail: true,
      bankDetails: true,
      vehicles: true,
      routeDetail: true,
      milkVanDetail: true,
      transporterDetail: true,
      documents: true,
    }
  });

  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(e => {
    console.error('Error during execution:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
