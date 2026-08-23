const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dropUser = await prisma.user.findFirst({
    where: { id: '144' },
    select: { id: true, authId: true, fullName: true, phoneNumber: true, address: true }
  }).catch(() => null);

  console.log("=== Drop SHG User Assigned to Order 113 ===");
  console.log(dropUser);

  const allShgs = await prisma.user.findMany({
    where: { role: 'SHG' },
    select: { id: true, authId: true, fullName: true, phoneNumber: true, address: true }
  });
  console.log("\n=== All SHG Users in DB ===");
  allShgs.forEach(u => console.log(`SHG User ID ${u.id} (${u.fullName}): phone=${u.phoneNumber}, village=${u.address?.village}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
