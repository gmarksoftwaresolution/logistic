import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING PICKUP ASSIGNMENTS ===');

  const orders = await prisma.order.findMany({
    where: { phase: 'PICKUP' }
  });

  console.log('Pickup Orders Count:', orders.length);
  for (const o of orders) {
    const assignments = await prisma.orderAssignment.findMany({
      where: { orderId: o.id }
    });
    console.log(`Order ${o.orderId} (${o.id}) mainStatus: ${o.mainStatus}, pickupShgStatus: ${o.pickupShgStatus}, pickupTransporterStatus: ${o.pickupTransporterStatus}`);
    console.log(`Assignments for this order:`, assignments.map(a => ({
      id: a.id,
      assigneeId: a.assigneeId,
      assigneeType: a.assigneeType,
      role: a.role,
      status: a.status
    })));
    console.log('----------------------------------------------------');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
