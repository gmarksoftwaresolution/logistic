const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const phoneMap = new Map();

  for (const user of users) {
    if (!user.phoneNumber) continue;
    if (phoneMap.has(user.phoneNumber)) {
      const dupId = user.id;
      const newPhone = `${user.phoneNumber}_dup_${dupId}`;
      console.log(`Fixing duplicate phone for user ${dupId}: ${user.phoneNumber} -> ${newPhone}`);
      await prisma.user.update({
        where: { id: dupId },
        data: { phoneNumber: newPhone }
      });
    } else {
      phoneMap.set(user.phoneNumber, user.id);
    }
  }

  console.log("Deduplication completed!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
