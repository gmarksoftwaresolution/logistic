require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderId: { in: ['ORD-2026-105', 'ORD-2026-115', '105', '115'] } },
        { id: { in: ['ORD-2026-105', 'ORD-2026-115', '105', '115'] } }
      ]
    },
    include: {
      assignments: true,
      buyer: true,
      seller: true
    }
  });

  console.log(`Found ${orders.length} orders:`);
  orders.forEach((o) => {
    console.log("----------------------------------------");
    console.log("ID:", o.id);
    console.log("orderId:", o.orderId);
    console.log("returnType:", o.returnType);
    console.log("mainStatus:", o.mainStatus);
    console.log("pickupShgStatus:", o.pickupShgStatus);
    console.log("dropShgStatus:", o.dropShgStatus);
    console.log("pickupReturnShgId:", o.pickupReturnShgId);
    console.log("dropReturnShgId:", o.dropReturnShgId);
    console.log("returnTransporterId:", o.returnTransporterId);
    console.log("returnTransporterStatus:", o.returnTransporterStatus);
    console.log("pickupShgId:", o.pickupShgId);
    console.log("dropShgId:", o.dropShgId);
    console.log("pickupTransporterId:", o.pickupTransporterId);
    console.log("dropTransporterId:", o.dropTransporterId);
    console.log("Assignments:", o.assignments);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
