import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'gmu' AND table_name IN ('TransporterMember', 'OrderAssignment')
    ORDER BY table_name, ordinal_position;
  `) as any[];
  console.log('Columns in gmu.TransporterMember and gmu.OrderAssignment:');
  console.log(JSON.stringify(columns, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
