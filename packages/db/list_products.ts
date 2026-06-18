process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, phoneNumber: true, fullName: true, role: true }
  });
  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));

  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true, weight: true }
  });
  console.log('--- PRODUCTS ---');
  console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
