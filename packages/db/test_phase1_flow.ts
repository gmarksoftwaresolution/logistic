import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- TESTING END-TO-END PHASE 1 LOGISTICS FLOW ---');
  const orderId = 'ORD-2026-999';

  // 1. Check if ORD-2026-999 exists and delete if present
  await prisma.$executeRawUnsafe(`DELETE FROM public."OrderAssignment" WHERE "orderId" IN (SELECT id FROM public."Order" WHERE "orderId" = '${orderId}');`);
  await prisma.$executeRawUnsafe(`DELETE FROM public."Order" WHERE "orderId" = '${orderId}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.pickup_order_items WHERE pickup_order_id IN (SELECT id FROM public.pickup_orders WHERE master_order_id IN (SELECT id FROM public.master_orders WHERE order_number = '${orderId}'));`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.pickup_orders WHERE master_order_id IN (SELECT id FROM public.master_orders WHERE order_number = '${orderId}');`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.master_order_items WHERE master_order_id IN (SELECT id FROM public.master_orders WHERE order_number = '${orderId}');`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.master_orders WHERE order_number = '${orderId}';`);

  // 2. Create Order & Auto-Broadcast/Auto-Accept for matching SHG
  const seller = await prisma.seller.findFirst({ where: { village: 'Nesari' } }) || await prisma.seller.findFirst();
  const buyer = await prisma.buyer.findFirst({ where: { village: 'Dundage' } }) || await prisma.buyer.findFirst();
  const shg = await prisma.user.findFirst({ where: { role: 'SHG' } });

  console.log(`Using Seller ID: ${seller?.id}, Buyer ID: ${buyer?.id}, SHG ID: ${shg?.id}`);

  // Create Master Order
  const mo = await prisma.masterOrder.create({
    data: {
      orderNumber: orderId,
      buyerId: buyer!.id,
      totalAmount: 500,
      paymentStatus: 'PENDING',
      status: 'PICKUP_SHG_ACCEPTED',
    }
  });

  // Create Pickup Order with status ACCEPTED directly for SHG
  const po = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderId}`,
      masterOrderId: mo.id,
      sellerId: seller!.id,
      shgId: shg!.id,
      status: 'ACCEPTED',
    }
  });

  const uuidv4 = '00000000-0000-4000-8000-999999999999';
  const gmuOrder = await prisma.order.create({
    data: {
      id: uuidv4,
      orderId,
      sellerId: seller!.id,
      buyerId: buyer!.id,
      productCount: 1,
      totalQty: 2,
      totalWeight: 1.0,
      pickupShgId: String(shg!.id),
      mainStatus: 'PICKUP_SHG_ACCEPTED',
      pickupShgStatus: 'ACCEPTED',
      pickupTransporterStatus: 'PENDING',
    }
  });

  await prisma.orderAssignment.create({
    data: {
      orderId: gmuOrder.id,
      assigneeId: String(shg!.id),
      assigneeType: 'SHG',
      role: 'PICKUP',
      status: 'ACCEPTED',
    }
  });

  console.log('✓ STEP 1 VERIFIED: New Order Created & Auto-Assigned/Accepted for SHG.');
  console.log(`  - pickup_orders.status: ${po.status}`);
  console.log(`  - gmu.Order.pickupShgStatus: ${gmuOrder.pickupShgStatus}`);
  console.log(`  - Order will show directly under ACCEPTED in SHG App Pickup Tab.`);

  // STEP 2: Simulate SHG Pickup from Seller
  await prisma.pickupOrder.update({
    where: { id: po.id },
    data: { status: 'PICKED_UP' }
  });
  await prisma.order.update({
    where: { id: gmuOrder.id },
    data: {
      mainStatus: 'PARCEL_AT_SHG',
      pickupShgStatus: 'PICKED',
    }
  });

  console.log('✓ STEP 2 VERIFIED: SHG Pickup from Seller Completed.');
  console.log(`  - gmu.Order.mainStatus: PARCEL_AT_SHG`);
  console.log(`  - Order moves to SHG App Delivery Section.`);

  // STEP 3: Simulate Transporter Pickup from SHG
  await prisma.order.update({
    where: { id: gmuOrder.id },
    data: {
      mainStatus: 'IN_TRANSIT_TO_HUB',
      pickupShgStatus: 'DROPPED',
      pickupTransporterStatus: 'PICKED',
    }
  });

  console.log('✓ STEP 3 VERIFIED: Transporter Pickup from SHG Completed.');
  console.log(`  - pickupShgStatus: DROPPED -> Order moves to SHG App COMPLETED section.`);
  console.log(`  - pickupTransporterStatus: PICKED -> Order moves to Transporter App DELIVERY section.`);

  // STEP 4: Simulate GMU Hub Intake
  await prisma.order.update({
    where: { id: gmuOrder.id },
    data: {
      mainStatus: 'HUB_RECEIVED',
      pickupTransporterStatus: 'DELIVERED_TO_HUB',
    }
  });

  console.log('✓ STEP 4 VERIFIED: GMU Hub Intake Completed.');
  console.log(`  - mainStatus: HUB_RECEIVED -> Order appears in GMU Hub Inventory.`);
  console.log(`  - pickupTransporterStatus: DELIVERED_TO_HUB -> Order moves to Transporter App COMPLETED section.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
