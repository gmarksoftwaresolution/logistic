import { PrismaService } from './common/prisma/prisma.service';

async function inspect() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const orders = await prisma.order.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      parcels: true,
      seller: true,
      buyer: true,
      assignments: true,
    }
  });

  const scans = await prisma.parcelScanHistory.findMany({
    orderBy: { scanTime: 'desc' },
    take: 5,
  });

  console.log('=== LATEST 5 SCANS ===');
  console.log(JSON.stringify(scans, null, 2));

  console.log('\n=== LATEST 5 ORDERS ===');
  orders.forEach(o => {
    console.log({
      orderId: o.orderId,
      mainStatus: o.mainStatus,
      pickupShgId: o.pickupShgId,
      pickupShgStatus: o.pickupShgStatus,
      pickupTransporterId: o.pickupTransporterId,
      updatedAt: o.updatedAt,
      parcels: o.parcels.map(p => ({ parcelId: p.parcelId, parcelStatus: p.parcelStatus, currentHolderId: p.currentHolderId })),
    });
  });

  await prisma.$disconnect();
}

inspect().catch(console.error);
