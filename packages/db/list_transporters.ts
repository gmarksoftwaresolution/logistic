process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying all transporter users...');
  
  const users = await prisma.user.findMany({
    where: {
      role: 'TRANSPORTER'
    },
    include: {
      applications: true,
      transporterDetail: true,
      drivingDetail: true
    }
  });

  console.log(`Found ${users.length} transporters:`);
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
      drivingDetail: user.drivingDetail
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
