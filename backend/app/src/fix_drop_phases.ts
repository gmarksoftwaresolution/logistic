import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixPhases() {
  const result = await prisma.order.updateMany({
    where: {
      mainStatus: {
        in: [
          'DROP_ASSIGNED',
          'DROP_PENDING',
          'DROP_SHG_ACCEPTED',
          'DROP_TRANSPORTER_ACCEPTED',
          'IN_TRANSIT_TO_DROP_SHG',
          'DISPATCHED',
          'PARCEL_AT_DROP_SHG',
          'OUT_FOR_DELIVERY'
        ]
      }
    },
    data: {
      phase: 'DROP'
    }
  });

  console.log(`Updated ${result.count} Phase 2 orders to phase = 'DROP'`);
}

fixPhases().finally(() => prisma.$disconnect());
