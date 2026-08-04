import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderId: { contains: '129' } },
        { id: { contains: '129' } },
      ]
    }
  });

  console.log('Orders found for 129:');
  orders.forEach(o => {
    console.log({
      id: o.id,
      orderId: o.orderId,
      phase: o.phase,
      mainStatus: o.mainStatus,
      pickupTransporterStatus: o.pickupTransporterStatus,
      storedAt: o.storedAt,
      warehouseReceivedAt: o.warehouseReceivedAt,
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
