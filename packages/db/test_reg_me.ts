import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber: '9000000005' },
      include: {
        address: true,
        drivingDetail: true,
        bankDetails: true,
        otherDetails: true,
        routeDetail: true,
        milkVanDetail: true,
        transporterDetail: true,
        documents: true,
        stepTracking: true,
      },
    });
    console.log('Query User Success! User ID:', user?.id);
  } catch (err: any) {
    console.error('Prisma query error:', err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
