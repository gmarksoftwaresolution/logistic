const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const validUserIds = new Set(users.map(u => u.id));

  const products = await prisma.product.findMany();
  let count = 0;
  for (const p of products) {
    if (!validUserIds.has(p.sellerId)) {
      console.log(`Deleting orphan product ${p.id} with sellerId ${p.sellerId}`);
      await prisma.product.delete({ where: { id: p.id } });
      count++;
    }
  }

  console.log(`Deleted ${count} orphan Products`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
