const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderId: true,
      mainStatus: true,
      pickupShgStatus: true,
      dropShgStatus: true,
      pickupTransporterStatus: true,
      dropTransporterStatus: true,
      phase: true,
      flowType: true,
    }
  });

  const isOrderCompleted = (o) => {
    const ms = (o.mainStatus || o.status || '').toUpperCase();
    const ds = (o.dropShgStatus || '').toUpperCase();
    const dt = (o.dropTransporterStatus || '').toUpperCase();
    return ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'RETURN_COMPLETED', 'BUYER_RETURN_COMPLETED', 'TRANSPORTER_RETURN_COMPLETED'].includes(ms) ||
           ds === 'COMPLETED' || ds === 'DROPPED' || (dt === 'COMPLETED' && o.phase === 'DROP');
  };

  console.log("Orders matching isOrderCompleted:");
  orders.forEach(o => {
    if (isOrderCompleted(o)) {
      console.log(`- Order ID: ${o.id} (${o.orderId}) | mainStatus: ${o.mainStatus} | dropShgStatus: ${o.dropShgStatus} | dropTransporterStatus: ${o.dropTransporterStatus} | phase: ${o.phase} | flowType: ${o.flowType}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
