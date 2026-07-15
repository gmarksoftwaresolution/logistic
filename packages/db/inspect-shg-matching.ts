import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING ALL ROWS FOR ORD-PICK-1020 ===');
  
  const shgs = await prisma.user.findMany({
    where: { role: 'SHG' },
    include: { address: true, shgDetail: true }
  });
  console.log('SHGs in database:', shgs.map(s => ({
    id: s.id,
    fullName: s.fullName,
    phoneNumber: s.phoneNumber,
    applicationStatus: s.applicationStatus,
    isVerified: s.isVerified,
    deletedAt: s.deletedAt,
    address: s.address ? {
      village: s.address.village,
      pincode: s.address.pincode
    } : null
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
