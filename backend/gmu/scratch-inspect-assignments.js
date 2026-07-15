require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.orderAssignment.findMany({
    where: { assigneeType: 'SHG' }
  });
  
  for (const a of assignments) {
    const user = await prisma.user.findUnique({ where: { id: parseInt(a.assigneeId, 10) } });
    const order = await prisma.order.findUnique({ where: { id: a.orderId } });
    console.log(`Assignment for SHG ${user?.fullName} (Phone: ${user?.phoneNumber}) - Order: ${order?.orderId} - Status: ${a.status}`);
  }
}

main().finally(() => prisma.$disconnect());
