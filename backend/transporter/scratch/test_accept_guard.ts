process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient } from '@prisma/client';
import { OrderService } from '../src/order/order.service';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DIRECT ACCEPT SERVICE GUARD TEST ---');

  // Let's create an instance of OrderService using PrismaClient as PrismaService
  const orderService = new OrderService(prisma as any);
  const pickupId = 66;
  const transporterId = 30;

  try {
    // 1. Reset to PENDING first
    console.log('Resetting order 66 to PENDING...');
    await prisma.pickupOrder.update({
      where: { id: pickupId },
      data: { status: 'PENDING' }
    });

    // 2. Reject the pickup order
    console.log('Rejecting order 66 in database...');
    await prisma.pickupOrder.update({
      where: { id: pickupId },
      data: { status: 'REJECTED' }
    });

    console.log('Trying to accept the REJECTED order via orderService.acceptPickup()...');
    try {
      await orderService.acceptPickup(pickupId, transporterId);
      console.error('FAIL: Order accepted successfully! (Validation guard did NOT catch it)');
    } catch (err: any) {
      console.log('SUCCESS: Validation guard caught the exception as expected!');
      console.log('Caught Error Message:', err.message);
      console.log('Error Status/Response:', err.status || err.response);
    }

  } catch (err: any) {
    console.error('Test error:', err.message);
  } finally {
    // Reset back to PENDING for the user to use
    await prisma.pickupOrder.update({
      where: { id: pickupId },
      data: { status: 'PENDING' }
    });
    console.log('Order 66 reset back to PENDING.');
    await prisma.$disconnect();
  }
}

main();
