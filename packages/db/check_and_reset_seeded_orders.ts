import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING AND RESETTING ALL SEEDED ORDERS FOR TESTING ===');

  // Reset all pickup orders in pickup_orders table to ACCEPTED if they were modified during testing
  const resetPickupCount = await prisma.pickupOrder.updateMany({
    where: {
      status: { in: ['COMPLETED', 'PICKED_UP'] }
    },
    data: {
      status: 'ACCEPTED',
      transporterId: null,
    }
  });

  // Reset public."Order" table pickup statuses
  await prisma.$executeRawUnsafe(`
    UPDATE public."Order"
    SET "pickupShgStatus" = 'ACCEPTED', "mainStatus" = 'PICKUP_SHG_ACCEPTED', "pickupTransporterId" = NULL, "pickupTransporterStatus" = 'PENDING', "updatedAt" = NOW()
    WHERE phase = 'PICKUP' AND "mainStatus" IN ('COMPLETED', 'PARCEL_AT_SHG', 'IN_TRANSIT_TO_HUB', 'HUB_RECEIVED');
  `);

  // Reset public.master_orders table
  await prisma.masterOrder.updateMany({
    where: {
      status: { in: ['COMPLETED', 'PARCEL_AT_SHG', 'IN_TRANSIT_TO_HUB', 'HUB_RECEIVED'] }
    },
    data: {
      status: 'PICKUP_SHG_ACCEPTED'
    }
  });

  // Query updated counts
  const allPickups = await prisma.pickupOrder.findMany({
    select: {
      id: true,
      status: true,
      masterOrder: {
        select: { orderNumber: true }
      }
    },
    orderBy: { id: 'asc' }
  });

  console.log(`Successfully reset ${resetPickupCount.count} modified pickup orders.`);
  console.log(`Total Seeded Pickup Orders in DB: ${allPickups.length}`);
  console.log('Sample of ready seeded orders:');
  console.log(allPickups.slice(0, 10).map(p => `${p.masterOrder?.orderNumber} (id: ${p.id}) -> status: ${p.status}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
