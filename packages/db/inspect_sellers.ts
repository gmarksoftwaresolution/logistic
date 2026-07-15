import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sellers = await prisma.seller.findMany();
  console.log('--- Sellers ---');
  for (const s of sellers) {
    console.log(`ID: ${s.id}, Name: ${s.sellerName}, Mobile: ${s.mobileNumber}, Village: ${s.village}, Pincode: ${s.pincode}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
