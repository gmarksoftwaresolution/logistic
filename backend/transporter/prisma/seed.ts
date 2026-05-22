import { PrismaClient, UserRole, ApplicationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const superAdminMobile = '7896541230';

  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: superAdminMobile },
    update: {},
    create: {
      phoneNumber: superAdminMobile,
      role: UserRole.SUPER_ADMIN,
      applicationStatus: ApplicationStatus.APPROVED,
      isVerified: true,
      currentStep: 8, // Completed
      authId: randomUUID(),
    },
  });

  console.log('Super Admin Seeded:', superAdmin.phoneNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
