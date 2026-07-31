require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all orders in public schema...');
  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        orderId: true,
        phase: true,
        mainStatus: true,
        pickupShgStatus: true,
        returnType: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Total orders found: ${orders.length}`);
    console.log(JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error('Error fetching orders:', err);
  }
}

main().finally(() => prisma.$disconnect());
