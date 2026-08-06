import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateAllOrdersCleanId() {
  console.log('=== UPDATING ALL ORDERS TO HAVE CLEAN HUMAN ORDER IDs (ORD-2026-XXX) ===\n');

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'asc' },
    include: { parcels: true }
  });

  console.log(`Found total ${orders.length} orders in database.`);

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const cleanNum = 101 + i;
    const cleanOrderId = `ORD-2026-${cleanNum}`;

    // Update order.orderId in database
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderId: cleanOrderId,
      }
    });

    // Update all linked parcels for this order
    const parcels = await prisma.parcel.findMany({
      where: {
        OR: [
          { orderId: order.id },
          { orderId: order.orderId },
        ]
      }
    });

    for (let pIdx = 0; pIdx < parcels.length; pIdx++) {
      const parcel = parcels[pIdx];
      const parcelNum = pIdx + 1;
      const barcodeValue = `QR-2026-${cleanNum}-PCL-${parcelNum}`;
      const verificationCode = `V-2026-${cleanNum}-0${parcelNum}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(barcodeValue)}`;

      await prisma.parcel.update({
        where: { parcelId: parcel.parcelId },
        data: {
          orderId: cleanOrderId,
          qrCodeValue: barcodeValue,
          verificationToken: verificationCode,
          qrImage: qrImageUrl,
        }
      });
    }

    console.log(`  - Updated Order ${order.id} -> orderId: '${cleanOrderId}' (${parcels.length} parcels updated)`);
  }

  console.log('\n🎉 ALL ORDERS AND PARCELS UPDATED WITH CLEAN ORDER IDs (ORD-2026-101 onwards)!');
  await prisma.$disconnect();
}

updateAllOrdersCleanId().catch(e => {
  console.error('Error updating orders:', e);
  process.exit(1);
});
