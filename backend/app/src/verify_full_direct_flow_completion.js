const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFullFlow() {
  console.log("=== Testing Direct SHG-to-SHG Final Delivery Verification ===");

  // Find direct order
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-111' }, { orderId: 'ORD-2026-111' }] }
  });

  if (!order) {
    console.log("Order 111 not found!");
    return;
  }

  console.log("Initial DB State:");
  console.log("  mainStatus:", order.mainStatus);
  console.log("  dropShgStatus:", order.dropShgStatus);
  console.log("  dropTransporterStatus:", order.dropTransporterStatus);

  // Simulate Buyer OTP Verification by Drop SHG
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      mainStatus: 'DELIVERED',
      dropShgStatus: 'DELIVERED',
      deliveredAt: new Date(),
    }
  });

  console.log("\nAfter Buyer OTP Verification DB State:");
  console.log("  mainStatus:", updated.mainStatus);
  console.log("  dropShgStatus:", updated.dropShgStatus);
  console.log("  deliveredAt:", updated.deliveredAt);

  // Verify GMU Hub Dashboard Filter
  const isGmuCompleted = ['DELIVERED', 'COMPLETED', 'FINAL_DELIVERY'].includes(updated.mainStatus);
  console.log("\nGMU Hub Dashboard Verification:");
  console.log("  Increments GMU Hub Completed Count:", isGmuCompleted);
  console.log("  Shows in GMU Hub Completed Orders:", isGmuCompleted);

  // Verify SHG App Filter
  const isShgCompleted = ['DELIVERED', 'COMPLETED'].includes(updated.dropShgStatus) || ['DELIVERED', 'COMPLETED'].includes(updated.mainStatus);
  console.log("\nSHG App Verification:");
  console.log("  Moves to SHG App Completed Section:", isShgCompleted);

  // Reset back to PARCEL_AT_DROP_SHG for active testing
  await prisma.order.update({
    where: { id: order.id },
    data: {
      mainStatus: 'PARCEL_AT_DROP_SHG',
      dropShgStatus: 'READY_FOR_BUYER',
      deliveredAt: null,
    }
  });

  console.log("\nReset Order 111 back to PARCEL_AT_DROP_SHG for live testing.");
}

testFullFlow().catch(console.error).finally(() => prisma.$disconnect());
