import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Legacy SHG pincode seed script disabled. Please use npm run seed:pincode instead.');
}

main().finally(async () => {
  await prisma.$disconnect();
});
