import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('   UNIFIED MASTER RESET & TEST SEEDING UTILITY       ');
  console.log('====================================================');

  await prisma.$transaction(async (tx) => {
    // 1. Clear transient scan sessions and items
    console.log('[1/4] Clearing transient scan sessions...');
    await tx.scanSessionItem.deleteMany({});
    await tx.scanSession.deleteMany({});

    // 2. Clear stale OrderAssignments
    console.log('[2/4] Resetting OrderAssignments...');
    await tx.orderAssignment.deleteMany({});

    // 3. Reset Order main status and phase
    console.log('[3/4] Resetting Order statuses...');
    await tx.order.updateMany({
      data: {
        phase: 'PICKUP',
        mainStatus: 'PICKUP_SHG_ACCEPTED',
        pickupShgStatus: 'ACCEPTED',
        pickupTransporterId: null,
        pickupTransporterStatus: 'PENDING',
        dropShgId: null,
        dropShgStatus: 'PENDING',
        dropTransporterId: null,
        dropTransporterStatus: 'PENDING',
      }
    });

    // 4. Align test partner addresses for guaranteed location matching
    console.log('[4/4] Aligning test addresses to matching Pincode & Village...');
    await tx.address.updateMany({
      data: {
        pincode: '411001',
        village: 'Wagholi',
      }
    });

    await tx.seller.updateMany({
      data: {
        pincode: '411001',
        village: 'Wagholi',
      }
    });

    await tx.buyer.updateMany({
      data: {
        pincode: '411001',
        village: 'Wagholi',
      }
    });

    // Bulk assign OrderAssignments for SHG pickup
    const allOrders = await tx.order.findMany({ select: { id: true } });
    const firstApprovedShg = await tx.user.findFirst({ where: { role: 'SHG', applicationStatus: 'APPROVED' } });
    if (firstApprovedShg) {
      const assignmentData = allOrders.map(ord => ({
        orderId: ord.id,
        assigneeId: String(firstApprovedShg.id),
        assigneeType: 'SHG',
        role: 'PICKUP',
        status: 'ACCEPTED',
      }));
      await tx.orderAssignment.createMany({ data: assignmentData });
    }
  }, {
    timeout: 30000,
  });

  console.log('====================================================');
  console.log('✅ Environment reset successfully in 1 atomic transaction.');
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('❌ Reset error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
