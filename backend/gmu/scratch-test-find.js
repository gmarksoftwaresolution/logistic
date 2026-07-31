require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function main() {
  console.log('Testing prisma.order.findMany...');
  try {
    const orders = await prisma.order.findMany({
      where: { phase: 'PICKUP', returnType: null },
      include: {
        assignments: true,
        seller: true,
        buyer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });
    console.log('Fetched successfully, count:', orders.length);
    if (orders.length > 0) {
      console.log('First order details (keys):', Object.keys(orders[0]));
    }
  } catch (err) {
    console.error('Error in findMany:', err);
  }
}

main().finally(() => prisma.$disconnect());
