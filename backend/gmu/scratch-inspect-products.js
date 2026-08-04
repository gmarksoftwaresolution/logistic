const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
  dotenvContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const prisma = new PrismaClient();

async function run() {
  const products = await prisma.$queryRawUnsafe('SELECT * FROM public.products LIMIT 10');
  console.log('Products:', products);
}

run().catch(console.error).finally(() => prisma.$disconnect());
