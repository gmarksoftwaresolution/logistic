import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- TESTING NEW PICKUP FLOW FOR ORD-2026-111 ---');

  // Find pickup order 111 (id 99)
  const pickup = await prisma.pickupOrder.findFirst({
    where: { masterOrder: { orderNumber: 'ORD-2026-111' } }
  });
  console.log('Current Pickup Order status:', pickup?.status);

  // Simulate completePickup legType='pickup'
  const masterOrder = await prisma.masterOrder.findUnique({
    where: { id: pickup!.masterOrderId }
  });

  const nextStatus = 'PICKED_UP';
  const updated = await prisma.pickupOrder.update({
    where: { id: pickup!.id },
    data: {
      status: nextStatus,
      pickupTime: new Date(),
      transporterId: null,
    },
  });

  const nextGmuStatus = 'PARCEL_AT_SHG';
  const nextShgStatus = 'PICKED';
  await prisma.$executeRawUnsafe(`
    UPDATE public."Order"
    SET "pickupShgStatus" = $1, "mainStatus" = $2, "pickupTransporterId" = NULL, "pickupTransporterStatus" = 'PENDING', "updatedAt" = NOW()
    WHERE "orderId" = $3 AND phase = 'PICKUP';
  `, nextShgStatus, nextGmuStatus, masterOrder!.orderNumber);

  await prisma.masterOrder.update({
    where: { id: pickup!.masterOrderId },
    data: { status: nextGmuStatus },
  });

  console.log('Updated Pickup Order status:', updated.status);

  // Now query assigned pickups as returned by GET /orders/new/assigned
  const assignedPickupOrderIds = [masterOrder!.orderNumber];
  const pickupsAssigned = await prisma.pickupOrder.findMany({
    where: {
      masterOrder: { orderNumber: { in: assignedPickupOrderIds } },
      OR: [{ status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'REJECTED', 'COMPLETED'] } }]
    },
    include: { masterOrder: true }
  });
  console.log('Assigned Pickups query returned:', pickupsAssigned.length, 'orders. Status:', pickupsAssigned[0]?.status);

  // Now query completed pickups as returned by GET /orders/completed
  const pickupsCompleted = await prisma.pickupOrder.findMany({
    where: { shgId: pickup!.shgId, status: 'COMPLETED' },
    include: { masterOrder: true }
  });
  console.log('Completed Pickups query returned:', pickupsCompleted.length, 'orders. Included 111?', pickupsCompleted.some(p => p.masterOrder.orderNumber === 'ORD-2026-111'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
