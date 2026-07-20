import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environmental variables
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../backend/gmu/.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    },
  },
});

async function main() {
  console.log('Querying all tables in the database...');
  const tables: any = await prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name;
  `);
  console.log(JSON.stringify(tables, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
