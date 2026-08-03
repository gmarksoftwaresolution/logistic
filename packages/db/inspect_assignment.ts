import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECT ASSIGNMENT FOR ORD-2026-121 ===');
  const orderId = 'ORD-2026-121';

  const gmuOrders = await prisma.order.findMany({ where: { orderId } });
  console.log('gmu.Orders found:', gmuOrders.map(o => ({ id: o.id, phase: o.phase, mainStatus: o.mainStatus, pickupTransporterId: o.pickupTransporterId, pickupTransporterStatus: o.pickupTransporterStatus })));

  const orderUuids = gmuOrders.map(o => o.id);
  const assignments = await prisma.orderAssignment.findMany({
    where: { orderId: { in: orderUuids } }
  });

  console.log('OrderAssignments found:', assignments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
