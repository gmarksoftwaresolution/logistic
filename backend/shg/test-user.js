require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { id: 284 } });
  console.log('User 284:', user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
