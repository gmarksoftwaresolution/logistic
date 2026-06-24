const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteOrdersForUser() {
  try {
    const user = await prisma.user.findFirst({
      where: { phoneNumber: '7575757575' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`Found user: ${user.fullName} (ID: ${user.id})`);

    // Find all master orders related to this SHG
    const pickups = await prisma.pickupOrder.findMany({ where: { shgId: user.id } });
    const drops = await prisma.dropOrder.findMany({ where: { shgId: user.id } });
    
    const masterOrderIds = new Set([
      ...pickups.map(p => p.masterOrderId),
      ...drops.map(d => d.masterOrderId)
    ]);

    console.log(`Found ${masterOrderIds.size} master orders to delete.`);

    for (const masterOrderId of masterOrderIds) {
      // 1. Delete DropTrackings and DropOrderItems
      const dropOrders = await prisma.dropOrder.findMany({ where: { masterOrderId } });
      for (const drop of dropOrders) {
        await prisma.dropTracking.deleteMany({ where: { dropOrderId: drop.id } });
        await prisma.dropOrderItem.deleteMany({ where: { dropOrderId: drop.id } });
      }

      // 2. Delete PickupTrackings and PickupOrderItems
      const pickupOrders = await prisma.pickupOrder.findMany({ where: { masterOrderId } });
      for (const pickup of pickupOrders) {
        await prisma.pickupTracking.deleteMany({ where: { pickupOrderId: pickup.id } });
        await prisma.pickupOrderItem.deleteMany({ where: { pickupOrderId: pickup.id } });
      }

      // 3. Delete DropOrders and PickupOrders
      await prisma.dropOrder.deleteMany({ where: { masterOrderId } });
      await prisma.pickupOrder.deleteMany({ where: { masterOrderId } });

      // 4. Delete MasterOrderItems
      await prisma.masterOrderItem.deleteMany({ where: { masterOrderId } });

      // 5. Delete MasterOrder
      await prisma.masterOrder.delete({ where: { id: masterOrderId } });
    }

    console.log('Successfully deleted all seeded orders for user 7575757575');
  } catch (error) {
    console.error('Error deleting orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOrdersForUser();
