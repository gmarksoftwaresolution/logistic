process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: 'TRANSPORTER',
    },
    select: {
      id: true,
      phoneNumber: true,
      fullName: true,
    }
  });
  console.log('Transporters in DB:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
