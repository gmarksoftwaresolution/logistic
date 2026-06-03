const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapDbOrderToUi = (dbOrder, type) => {
  const items = dbOrder.items || [];
  return {
    id: `${type}-${dbOrder.id}`,
    status: dbOrder.status === 'PENDING' ? 'assigned' : dbOrder.status === 'ACCEPTED' ? 'Accepted' : dbOrder.status === 'REJECTED' ? 'REJECTED' : 'COMPLETED',
  };
};

async function test() {
  const rawPickups = await prisma.pickupOrder.findMany({
    where: {
      shgId: 9,
      status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] },
    },
    include: {
      seller: { select: { fullName: true, phoneNumber: true, address: true } },
      items: { include: { product: true } },
      masterOrder: true,
      pickupTracking: true,
    }
  });

  const rawDrops = await prisma.dropOrder.findMany({
    where: {
      shgId: 9,
      status: { in: ['ACCEPTED', 'COMPLETED', 'REJECTED'] },
    },
    include: {
      buyer: { select: { fullName: true, phoneNumber: true, address: true } },
      items: { include: { product: true } },
      masterOrder: true,
      dropTracking: true,
    }
  });

  console.log(`Raw Pickups count: ${rawPickups.length}`);
  console.log(`Raw Drops count: ${rawDrops.length}`);

  const mappedPickups = rawPickups.map(o => mapDbOrderToUi(o, 'pickup'));
  const mappedDrops = rawDrops.map(o => mapDbOrderToUi(o, 'drop'));
  const allMapped = [...mappedPickups, ...mappedDrops];

  console.log(`All mapped length: ${allMapped.length}`);
  const rejected = allMapped.filter(o => o.status === 'REJECTED');
  console.log(`Rejected length: ${rejected.length}`);
  
  process.exit(0);
}

test().catch(console.error);
