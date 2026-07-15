import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING ALL ROWS FOR ORD-PICK-1020 ===');
  
  const orders = await prisma.order.findMany({
    where: { orderId: 'ORD-PICK-1020' }
  });
  console.log('Orders found:', orders);

  const dropOrders = await prisma.dropOrder.findMany({
    where: {
      masterOrder: {
        orderNumber: 'ORD-PICK-1020'
      }
    }
  });
  console.log('drop_orders found:', dropOrders);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
