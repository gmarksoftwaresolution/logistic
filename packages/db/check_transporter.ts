process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying all users with phone number contains 8494833669...');
  
  const users = await prisma.user.findMany({
    where: {
      phoneNumber: {
        contains: '8494833669'
      }
    },
    include: {
      applications: true,
      transporterDetail: true,
      shgDetail: true
    }
  });

  console.log(`Found ${users.length} users:`);
  for (const user of users) {
    console.log(JSON.stringify({
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      applicationStatus: user.applicationStatus,
      uniqueCode: user.uniqueCode,
      applications: user.applications.map(a => ({ id: a.id, status: a.status })),
      transporterDetail: user.transporterDetail,
      shgDetail: user.shgDetail
    }, null, 2));
  }
}

main()
  .catch(e => {
    console.error('Error during execution:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
