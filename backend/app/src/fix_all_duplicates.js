const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Deduplicate User uniqueCode & email
  const users = await prisma.user.findMany();
  const codeMap = new Map();
  const emailMap = new Map();

  for (const user of users) {
    if (user.uniqueCode) {
      if (codeMap.has(user.uniqueCode)) {
        const newCode = `${user.uniqueCode}_${user.id}`;
        console.log(`Fixing duplicate uniqueCode for User ${user.id}`);
        await prisma.user.update({ where: { id: user.id }, data: { uniqueCode: newCode } });
      } else {
        codeMap.set(user.uniqueCode, user.id);
      }
    }

    if (user.email) {
      if (emailMap.has(user.email)) {
        const newEmail = `user${user.id}_${user.email}`;
        console.log(`Fixing duplicate email for User ${user.id}`);
        await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });
      } else {
        emailMap.set(user.email, user.id);
      }
    }
  }

  // Deduplicate Seller sellerCode
  const sellers = await prisma.seller.findMany();
  const sellerMap = new Map();
  for (const s of sellers) {
    if (s.sellerCode) {
      if (sellerMap.has(s.sellerCode)) {
        await prisma.seller.update({ where: { id: s.id }, data: { sellerCode: `${s.sellerCode}_${s.id}` } });
      } else {
        sellerMap.set(s.sellerCode, s.id);
      }
    }
  }

  // Deduplicate Buyer buyerCode
  const buyers = await prisma.buyer.findMany();
  const buyerMap = new Map();
  for (const b of buyers) {
    if (b.buyerCode) {
      if (buyerMap.has(b.buyerCode)) {
        await prisma.buyer.update({ where: { id: b.id }, data: { buyerCode: `${b.buyerCode}_${b.id}` } });
      } else {
        buyerMap.set(b.buyerCode, b.id);
      }
    }
  }

  console.log("All unique constraints deduplicated successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
