import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'gmu' AND table_name = 'Order'
    ORDER BY ordinal_position;
  `) as any[];
  console.log('Columns in gmu.Order:');
  console.log(JSON.stringify(columns, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
