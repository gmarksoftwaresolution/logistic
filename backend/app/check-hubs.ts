import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.hub.count();
  const hubs = await prisma.hub.findMany();
  console.log(`TOTAL_HUBS_COUNT: ${count}`);
  console.log('HUBS_DATA:', JSON.stringify(hubs, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
