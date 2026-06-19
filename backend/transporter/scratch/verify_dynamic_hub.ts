process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient } from '@prisma/client';
import { OrderService } from '../src/order/order.service';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DYNAMIC RETURN HUB VERIFICATION ---');

  const orderService = new OrderService(prisma as any);
  const transporterId = 30;

  try {
    // Let's print out the drop order statuses and see if we get the dynamically resolved hub address
    const drops = await orderService.getAssignedDrops(transporterId);
    console.log(`Fetched ${drops.length} drop assignments successfully!`);

    // Let's print the delivery address and buyer details of drops in the list
    drops.forEach((d) => {
      console.log(`Drop ID: ${d.id}, Status: ${d.status}, Delivery Address: ${d.deliveryAddress}`);
      console.log(`Buyer Info:`, JSON.stringify(d.buyer));
      console.log('------------------------------------');
    });

  } catch (err: any) {
    console.error('Runtime error:', err.stack || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
