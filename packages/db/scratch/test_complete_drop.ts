process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';
import { OrderService } from '../../../backend/transporter/src/order/order.service';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING STATUS TRANSITION VERIFICATION ---');
  const orderService = new OrderService(prisma as any);

  const pickupId = 491;
  const dropId = 92;
  const transporterId = 66;

  try {
    // ----------------------------------------------------
    // TEST 1: Test completing a PENDING drop order directly
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Complete PENDING drop directly ---');
    console.log(`Setting drop order ${dropId} to PENDING...`);
    await prisma.dropOrder.update({
      where: { id: dropId },
      data: { status: 'PENDING' }
    });

    console.log(`Executing orderService.completeDrop(${dropId}, ${transporterId})...`);
    // Pass verification code as '1234' (default) since it might be required
    await orderService.completeDrop(dropId, transporterId, '1234');

    const updatedDrop = await prisma.dropOrder.findUnique({
      where: { id: dropId }
    });
    console.log(`Updated drop status: ${updatedDrop?.status}`);
    if (updatedDrop?.status === 'COMPLETED') {
      console.log('SUCCESS: Successfully completed PENDING drop order directly!');
    } else {
      console.error(`FAIL: Drop status is ${updatedDrop?.status}, expected COMPLETED`);
    }

    // ----------------------------------------------------
    // TEST 2: Test auto-accepting PENDING drops on completePickup
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Auto-accept PENDING drop on completePickup ---');
    console.log(`Setting pickup order ${pickupId} to ACCEPTED and drop order ${dropId} to PENDING...`);
    await prisma.pickupOrder.update({
      where: { id: pickupId },
      data: { status: 'ACCEPTED' }
    });
    await prisma.dropOrder.update({
      where: { id: dropId },
      data: { status: 'PENDING' }
    });

    console.log(`Executing orderService.completePickup(${pickupId}, ${transporterId})...`);
    await orderService.completePickup(pickupId, transporterId, '1234');

    const finalPickup = await prisma.pickupOrder.findUnique({
      where: { id: pickupId }
    });
    const finalDrop = await prisma.dropOrder.findUnique({
      where: { id: dropId }
    });

    console.log(`Final pickup status: ${finalPickup?.status}`);
    console.log(`Final drop status: ${finalDrop?.status}`);

    if (finalPickup?.status === 'COMPLETED' && finalDrop?.status === 'ACCEPTED') {
      console.log('SUCCESS: Successfully completed pickup and automatically transitioned drop order to ACCEPTED!');
    } else {
      console.error(`FAIL: Status mismatch. Expected pickup to be COMPLETED and drop to be ACCEPTED.`);
    }

  } catch (err: any) {
    console.error('Test script encountered an error:', err.message, err.stack);
  } finally {
    // Leave database in a clean/expected state:
    // Drop completed, pickup completed.
    console.log('\nRestoring database states to completed/finalized for normal operation...');
    await prisma.pickupOrder.update({
      where: { id: pickupId },
      data: { status: 'COMPLETED' }
    });
    await prisma.dropOrder.update({
      where: { id: dropId },
      data: { status: 'COMPLETED' }
    });
    console.log('Restored pickup/drop to COMPLETED.');
    await prisma.$disconnect();
  }
}

main();
