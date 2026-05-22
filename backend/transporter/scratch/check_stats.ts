import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total Users:', users.length);
  
  const statusCounts = users.reduce((acc, u) => {
    acc[u.applicationStatus] = (acc[u.applicationStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Status Counts:', statusCounts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
