const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const dotenvPath = path.join(__dirname, '../../../backend/transporter/.env');
if (fs.existsSync(dotenvPath)) {
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
  dotenvContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log('Altering database tables to add drop item-wise verification columns...');
  
  // Public schema alter
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.drop_order_items ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.drop_order_items ADD COLUMN IF NOT EXISTS generated_time TIMESTAMP WITH TIME ZONE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.drop_order_items ADD COLUMN IF NOT EXISTS verified_time TIMESTAMP WITH TIME ZONE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.drop_order_items ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING';
  `);
  console.log('Public schema tables altered successfully.');

  // GMU schema alter
  await prisma.$executeRawUnsafe(`
    ALTER TABLE gmu.drop_order_items ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE gmu.drop_order_items ADD COLUMN IF NOT EXISTS generated_time TIMESTAMP WITH TIME ZONE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE gmu.drop_order_items ADD COLUMN IF NOT EXISTS verified_time TIMESTAMP WITH TIME ZONE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE gmu.drop_order_items ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING';
  `);
  console.log('GMU schema tables altered successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
