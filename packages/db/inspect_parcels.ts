process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=public";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orderId = 'ORD-PICK-1020';
  console.log(`=== INSPECTING ORDER: ${orderId} ===`);

  const gmuOrder = await prisma.order.findFirst({
    where: { orderId }
  });
  console.log('GMU Order Status & Info:', gmuOrder);

  const masterOrder = await prisma.masterOrder.findFirst({
    where: { orderNumber: orderId }
  });
  console.log('Master Order:', masterOrder);

  if (masterOrder) {
    const pickupOrder = await prisma.pickupOrder.findFirst({
      where: { masterOrderId: masterOrder.id },
      include: {
        items: true
      }
    });
    console.log('Pickup Order:', pickupOrder);
  }

  const parcels = await prisma.parcel.findMany({
    where: { orderId }
  });
  console.log('Parcels:', parcels);
}

main().catch(console.error).finally(() => prisma.$disconnect());
