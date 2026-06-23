import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.pincode.findMany({
    where: { pincode: '416501' },
  });
  console.log('Total records for 416501:', records.length);
  console.log(JSON.stringify(records.slice(0, 10), null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
