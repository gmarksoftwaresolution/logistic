import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Seed Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: '7204555909' },
    update: {},
    create: {
      authId: randomUUID(),
      phoneNumber: '7204555909',
      role: 'SUPER_ADMIN',
      isVerified: true,
      fullName: 'Super Admin',
    },
  });

  console.log('Super Admin seeded:', superAdmin.phoneNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
