const { PrismaClient } = require('@prisma/client');

const databaseUrl = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const directUrl = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

async function checkUrl(name, url) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });
  try {
    const res = await prisma.$queryRaw`
      SELECT 
        table_name, 
        column_name, 
        data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id';
    `;
    console.log(`${name} User.id type:`, res[0] ? res[0].data_type : 'table/column not found');
  } catch (error) {
    console.error(`${name} error:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkUrl('DATABASE_URL (Pooled)', databaseUrl);
  await checkUrl('DIRECT_URL (Direct)', directUrl);
}

main();
