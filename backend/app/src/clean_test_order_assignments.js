require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderId: { in: ['ORD-2026-105', 'ORD-2026-115'] } },
        { id: { in: ['ORD-2026-105', 'ORD-2026-115'] } }
      ]
    },
    include: { assignments: true }
  });

  for (const o of orders) {
    console.log(`Order: ${o.orderId || o.id}`);
    console.log(`  mainStatus: ${o.mainStatus}`);
    console.log(`  returnType: ${o.returnType}`);
    console.log(`  pickupShgStatus: ${o.pickupShgStatus}`);
    console.log(`  dropShgStatus: ${o.dropShgStatus}`);
    console.log(`  Assignments:`, o.assignments);

    // Keep the single valid order record in BUYER_RETURN workflow
    // Reset ORD-2026-105 to RETURN_SHG_ACCEPTED / PENDING so the user can test OTP verification
    // Reset ORD-2026-115 to RETURN_SHG_ACCEPTED / PENDING
    await prisma.order.update({
      where: { id: o.id },
      data: {
        returnType: 'BUYER_RETURN',
        mainStatus: 'RETURN_SHG_ACCEPTED',
        pickupShgStatus: 'PENDING',
        dropShgStatus: 'PENDING',
        pickupReturnShgId: o.dropShgId || o.pickupReturnShgId || '146'
      }
    });

    // Clean up any stray DROP assignments for SHG that might have been marked ACCEPTED during testing
    await prisma.orderAssignment.updateMany({
      where: {
        orderId: o.id,
        assigneeType: 'SHG',
        role: 'DROP'
      },
      data: { status: 'COMPLETED' } // Mark old forward drop as completed so it's not active
    });
  }

  console.log("\nCleanup and reset complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
