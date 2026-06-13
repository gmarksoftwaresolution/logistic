process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

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
