require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const masterOrders = await prisma.masterOrder.findMany({
    where: {
      orderNumber: {
        startsWith: 'ORD-'
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    include: {
      items: true,
      pickupOrders: {
        include: {
          items: true,
          tracking: true
        }
      },
      dropOrders: {
        include: {
          items: true,
          tracking: true
        }
      }
    }
  });

  if (masterOrders.length === 0) {
    console.log("No seeded orders found to delete.");
    return;
  }

  console.log(`Found ${masterOrders.length} seeded orders to delete.`);

  for (const masterOrder of masterOrders) {
    console.log(`Deleting Master Order ID: ${masterOrder.id}`);

    // Delete DropOrderItems
    for (const dropOrder of masterOrder.dropOrders) {
      await prisma.dropOrderItem.deleteMany({
        where: { dropOrderId: dropOrder.id }
      });
      await prisma.dropTracking.deleteMany({
        where: { dropOrderId: dropOrder.id }
      });
    }

    // Delete DropOrders
    await prisma.dropOrder.deleteMany({
      where: { masterOrderId: masterOrder.id }
    });

    // Delete PickupOrderItems
    for (const pickupOrder of masterOrder.pickupOrders) {
      await prisma.pickupOrderItem.deleteMany({
        where: { pickupOrderId: pickupOrder.id }
      });
      await prisma.pickupTracking.deleteMany({
        where: { pickupOrderId: pickupOrder.id }
      });
    }

    // Delete PickupOrders
    await prisma.pickupOrder.deleteMany({
      where: { masterOrderId: masterOrder.id }
    });

    // Delete MasterOrderItems
    await prisma.masterOrderItem.deleteMany({
      where: { masterOrderId: masterOrder.id }
    });

    // Delete MasterOrder
    await prisma.masterOrder.delete({
      where: { id: masterOrder.id }
    });
  }

  console.log('Successfully deleted the 10 last seeded orders.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
