import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST FIND MANY ON ORDER FOR ASSIGNED PICKUP ===');
  try {
    const orders = await prisma.order.findMany({
      where: {
        phase: 'PICKUP',
        returnType: null,
        mainStatus: { in: ['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'SHG_PICKUP_DECLINED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'TRANSPORTER_DECLINED', 'IN_TRANSIT_TO_HUB', 'PICKUP_SHG_PENDING', 'PENDING_PICKUP'] }
      },
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`✅ SUCCESS! Found ${orders.length} assigned pickup orders.`);
  } catch (err: any) {
    console.error('❌ FIND MANY ERROR:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
