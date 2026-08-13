import { PrismaClient } from '@prisma/client';
import { triggerTransporterPickupBroadcast } from './shared/qr/qr-verification-engine';

const prisma = new PrismaClient();

async function fixPickedOrdersTransporter() {
  console.log('=== FIXING PICKED ORDERS TRANSPORTER STATUS & ASSIGNMENTS ===\n');

  const allOrders = await prisma.order.findMany({
    include: { seller: true }
  });

  const pickedOrders = allOrders.filter((o: any) => 
    (o.pickupShgStatus === 'PICKED' || o.mainStatus === 'PARCEL_PICKED' || o.mainStatus === 'PARCEL_AT_SHG')
  );

  console.log(`Found ${allOrders.length} total orders, ${pickedOrders.length} picked by SHG.\n`);

  for (const order of pickedOrders) {
    const displayId = order.orderId || order.id;

    await prisma.order.update({
      where: { id: order.id },
      data: { pickupTransporterStatus: 'PENDING' }
    });

    await prisma.$executeRawUnsafe(`
      UPDATE public."Order"
      SET "pickupTransporterStatus" = 'PENDING', "updatedAt" = NOW()
      WHERE id = $1;
    `, order.id).catch(() => {});

    await triggerTransporterPickupBroadcast(prisma, order.id);

    console.log(`  ✓ Updated Order ${displayId} | pickupShgStatus: PICKED | pickupTransporterStatus: PENDING | Transporter Assignment Broadcasted`);
  }

  console.log('\n🎉 ALL SHG-PICKED ORDERS UPDATED WITH pickupTransporterStatus = PENDING AND ASSIGNED TO TRANSPORTERS!');
  await prisma.$disconnect();
}

fixPickedOrdersTransporter().catch((err) => {
  console.error('Error running fixPickedOrdersTransporter:', err);
  process.exit(1);
});
