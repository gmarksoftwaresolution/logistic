import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.dropOrder.update({
    where: { id: 11 },
    data: { status: 'RETURN_ACCEPTED' }
  });
  console.log('Successfully updated DropOrder 11 status to RETURN_ACCEPTED:', updated.status);
}

main().catch(console.error).finally(() => prisma.$disconnect());
