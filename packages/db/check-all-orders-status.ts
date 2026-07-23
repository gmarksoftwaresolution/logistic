import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllOrders() {
  console.log('=== INSPECTING ALL ORDERS & TRANSPORTER ASSIGNMENTS ===\n');

  const orders = await prisma.order.findMany({
    include: {
      seller: true,
      buyer: true,
      assignments: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${orders.length} total orders in database:\n`);

  for (const o of orders) {
    const transporterAssignments = o.assignments.filter(a => a.assigneeType === 'TRANSPORTER');
    if (transporterAssignments.length > 0 || o.mainStatus === 'PARCEL_AT_SHG') {
      console.log(`Order Number / ID: ${o.orderId} (${o.id})`);
      console.log(`  Phase: ${o.phase}, Main Status: ${o.mainStatus}`);
      console.log(`  Total Weight: ${o.totalWeight} kg`);
      console.log(`  Seller: Village=${o.seller?.village}, Pincode=${o.seller?.pincode}`);
      console.log(`  pickupTransporterStatus: ${o.pickupTransporterStatus}`);
      console.log(`  Transporter Assignments (${transporterAssignments.length}):`);
      for (const a of transporterAssignments) {
        console.log(`    - Assignee ID: ${a.assigneeId}, Role: ${a.role}, Status: ${a.status}, CreatedAt: ${a.createdAt.toISOString()}`);
      }
      console.log('--------------------------------------------------\n');
    }
  }
}

checkAllOrders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
