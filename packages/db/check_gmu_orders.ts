import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const gmuOrders = await prisma.$queryRawUnsafe(`
    SELECT id, "orderId", phase, "mainStatus", "pickupShgStatus", "pickupShgId", "pickupTransporterStatus", "pickupTransporterId"
    FROM public."Order"
    LIMIT 20;
  `) as any[];
  console.log('GMU Orders:', gmuOrders);
  
  const assignments = await prisma.$queryRawUnsafe(`
    SELECT id, "orderId", "assigneeId", "assigneeType", role, status
    FROM public."OrderAssignment"
    LIMIT 30;
  `) as any[];
  console.log('Assignments:', assignments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
