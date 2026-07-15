import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all SHG and Transporter users...');
  
  // Clean OTPVerification
  await prisma.$executeRawUnsafe('DELETE FROM public."OTPVerification";');
  
  const uIds = await prisma.user.findMany({
    where: { role: { in: ['SHG', 'TRANSPORTER', 'INDIVIDUAL'] } },
    select: { id: true }
  }) as any[];
  
  console.log(`Found ${uIds.length} users to delete.`);
  
  for (const u of uIds) {
    const uId = u.id;
    await prisma.$executeRawUnsafe(`DELETE FROM public."TransporterDetail" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."DrivingDetail" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."Address" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."BankDetail" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."RouteDetail" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."OtherDetails" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."StepTracking" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."Application" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."MilkVanDetail" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."AuditLog" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."ShgDetail" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."BusinessDetail" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."Document" WHERE "userId" = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public.products WHERE seller_id = $1;`, uId);
    await prisma.$executeRawUnsafe(`DELETE FROM public."User" WHERE id = $1;`, uId);
  }
  
  console.log('Successfully deleted all SHG and Transporter users and their related data.');
}

main()
  .catch((e) => {
    console.error('Error clearing partner data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
