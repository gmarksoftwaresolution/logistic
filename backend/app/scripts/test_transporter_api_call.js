require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAssignedPickups(transporterId) {
  const numId = Number(transporterId);
  const strId = String(transporterId);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(isNaN(numId) ? [] : [{ id: numId }]),
        ...(UUID_REGEX.test(strId) ? [{ authId: strId }] : [])
      ]
    }
  });

  if (!user || user.role !== 'TRANSPORTER') return [];

  const idVariants = [String(user.id), user.authId].filter(Boolean);

  const assignedOrders = await prisma.orderAssignment.findMany({
    where: {
      assigneeId: { in: idVariants },
      assigneeType: 'TRANSPORTER',
      role: { in: ['PICKUP', 'RETURN'] },
      status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED'] },
    },
    select: { orderId: true }
  });

  const assignedOrderIds = assignedOrders.map(a => a.orderId);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { id: { in: assignedOrderIds } },
        { orderId: { in: assignedOrderIds } },
        { pickupTransporterId: { in: idVariants } },
        { returnTransporterId: { in: idVariants } },
      ],
    },
    include: { seller: true, buyer: true }
  });

  return orders;
}

async function main() {
  console.log('=== TEST FOR TRANSPORTER 151 (9000000003) ===');
  const res151 = await getAssignedPickups(151);
  console.log('Count:', res151.length);
  res151.forEach(o => console.log(`OrderID: ${o.orderId} | flowType: ${o.flowType} | status: ${o.mainStatus} | ${o.seller?.village} -> ${o.buyer?.village}`));

  console.log('\n=== TEST FOR TRANSPORTER 150 (9000000002) ===');
  const res150 = await getAssignedPickups(150);
  console.log('Count:', res150.length);
  res150.forEach(o => console.log(`OrderID: ${o.orderId} | flowType: ${o.flowType} | status: ${o.mainStatus} | ${o.seller?.village} -> ${o.buyer?.village}`));
}

main().finally(async () => { await prisma.$disconnect(); });
