import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPaths = [
  path.join(__dirname, '../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const shgId = 516; // Pooja Patil
  
  // 1. Regular Pickup Orders (seller -> SHG)
  const pickupAssignments = await prisma.$queryRawUnsafe(`
    SELECT o."orderId" 
    FROM public."OrderAssignment" oa
    JOIN public."Order" o ON oa."orderId" = o.id
    WHERE oa."assigneeId" = $1 AND oa.role = 'PICKUP' AND oa."assigneeType" = 'SHG' AND oa.status IN ('PENDING', 'ACCEPTED', 'COMPLETED') AND o.phase = 'PICKUP';
  `, '00000000-0000-4000-8000-267746776214') as any[];
  const assignedPickupOrderIds = pickupAssignments.map(a => a.orderId);

  const pickups = await prisma.pickupOrder.findMany({
    where: {
      masterOrder: {
        orderNumber: { in: assignedPickupOrderIds }
      },
      OR: [
        { status: { in: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'] } }
      ]
    },
    include: {
      seller: true,
      items: { include: { product: true } },
      masterOrder: { include: { items: { include: { seller: true } } } },
      tracking: true,
      transporter: { include: { transporterDetail: true, address: true, routeDetail: true, otherDetails: true } },
    },
  });

  // 3. Regular Delivery Drop Orders (SHG delivers to buyer, buyerId !== shgId)
  const regularDrops = await prisma.dropOrder.findMany({
    where: {
      AND: [
        { shgId },
        { buyerId: { not: shgId } },
        { status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'REJECTED', 'DELIVERED'] } },
        { NOT: { dropOrderNumber: { startsWith: 'RET-' } } }
      ]
    },
    include: {
      buyer: true,
      items: { include: { product: true } },
      masterOrder: { include: { items: { include: { seller: true } } } },
      tracking: true,
      transporter: { include: { transporterDetail: true, address: true, routeDetail: true, otherDetails: true } },
    },
  });

  const formattedPickups = pickups.map(p => ({
    id: p.id,
    legType: 'pickup',
    status: p.status,
  }));
  
  const formattedDrops = regularDrops.map(d => ({
    id: d.id,
    legType: 'drop',
    status: d.status,
  }));
  
  console.log('Pickups:', formattedPickups);
  console.log('Drops:', formattedDrops);
}

main().finally(() => prisma.$disconnect());
