const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTransporterAssignments() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { flowType: 'DIRECT_SHG_TO_SHG' },
        { flowType: 'shg_to_shg' }
      ]
    },
    include: { assignments: true }
  });

  console.log(`Checking ${orders.length} direct SHG-to-SHG orders for Transporter alignment...`);

  for (const order of orders) {
    const pickupTransporterAssignment = order.assignments.find(a => a.role === 'PICKUP' && a.assigneeType === 'TRANSPORTER' && a.status === 'ACCEPTED');
    const transId = order.pickupTransporterId || pickupTransporterAssignment?.assigneeId;

    if (transId) {
      const transIdStr = String(transId);

      await prisma.order.updateMany({
        where: {
          OR: [
            { id: order.id },
            { orderId: order.id },
            ...(order.orderId ? [{ id: order.orderId }, { orderId: order.orderId }] : [])
          ]
        },
        data: {
          pickupTransporterId: transIdStr,
          dropTransporterId: transIdStr,
          dropTransporterStatus: order.pickupTransporterStatus === 'COMPLETED' ? 'ACCEPTED' : (order.dropTransporterStatus || 'ACCEPTED')
        }
      });

      // Ensure DROP OrderAssignment for Transporter exists
      await prisma.orderAssignment.deleteMany({
        where: {
          orderId: order.id,
          role: 'DROP',
          assigneeType: 'TRANSPORTER',
        }
      });

      await prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transIdStr,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'ACCEPTED'
        }
      });

      console.log(`Order ${order.id} (${order.orderId}): Set pickupTransporterId & dropTransporterId = ${transIdStr}`);
    }
  }

  console.log("Transporter Direct Flow Fix Completed!");
}

fixTransporterAssignments().catch(console.error).finally(() => prisma.$disconnect());
