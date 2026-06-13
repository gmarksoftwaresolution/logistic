process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- BEFORE AUTO-ASSIGN SIMULATION ---');
  const initial = await prisma.pickupOrder.findMany({ take: 3 });
  console.log('Initial pickup orders transporterIds:', initial.map(p => ({ id: p.id, transporterId: p.transporterId })));

  const testTransporterId = 59; // Hzhdbd Hwhebeh

  // Simulate OrderService.ensureAssignments
  const count = await prisma.pickupOrder.count({
    where: { transporterId: testTransporterId }
  });
  console.log(`Orders currently assigned to transporter ${testTransporterId}:`, count);

  if (count === 0) {
    const totalCount = await prisma.pickupOrder.count();
    if (totalCount > 0) {
      console.log(`[Simulation] Assigning all ${totalCount} orders to logged-in transporter ID ${testTransporterId}`);
      await prisma.pickupOrder.updateMany({
        data: { transporterId: testTransporterId }
      });
      await prisma.dropOrder.updateMany({
        data: { transporterId: testTransporterId }
      });
    }
  }

  console.log('\n--- AFTER AUTO-ASSIGN SIMULATION ---');
  const finalOrders = await prisma.pickupOrder.findMany({ take: 3 });
  console.log('Final pickup orders transporterIds:', finalOrders.map(p => ({ id: p.id, transporterId: p.transporterId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
