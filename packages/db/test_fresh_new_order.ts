import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BRAND NEW ORDER TEST FOR ORD-2026-888 ===');
  const orderId = 'ORD-2026-888';

  // Cleanup old test order 888 if present
  await prisma.$executeRawUnsafe(`DELETE FROM public."OrderAssignment" WHERE "orderId" IN (SELECT id FROM public."Order" WHERE "orderId" = '${orderId}');`);
  await prisma.$executeRawUnsafe(`DELETE FROM public."Order" WHERE "orderId" = '${orderId}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.pickup_order_items WHERE pickup_order_id IN (SELECT id FROM public.pickup_orders WHERE master_order_id IN (SELECT id FROM public.master_orders WHERE order_number = '${orderId}'));`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.pickup_orders WHERE master_order_id IN (SELECT id FROM public.master_orders WHERE order_number = '${orderId}');`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.master_order_items WHERE master_order_id IN (SELECT id FROM public.master_orders WHERE order_number = '${orderId}');`);
  await prisma.$executeRawUnsafe(`DELETE FROM public.master_orders WHERE order_number = '${orderId}';`);

  const seller = await prisma.seller.findFirst({ where: { village: 'Nesari' } }) || await prisma.seller.findFirst();
  const buyer = await prisma.buyer.findFirst({ where: { village: 'Dundage' } }) || await prisma.buyer.findFirst();
  const shg = await prisma.user.findFirst({ where: { role: 'SHG' } });

  console.log(`Using SHG User ID: ${shg?.id}`);

  // 1. Create Master Order & Pickup Order
  const mo = await prisma.masterOrder.create({
    data: {
      orderNumber: orderId,
      buyerId: buyer!.id,
      totalAmount: 350,
      paymentStatus: 'PENDING',
      status: 'PICKUP_SHG_ACCEPTED',
    }
  });

  const po = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderId}`,
      masterOrderId: mo.id,
      sellerId: seller!.id,
      shgId: shg!.id,
      status: 'ACCEPTED',
    }
  });

  // Create Product Item
  const product = await prisma.product.findFirst() || await prisma.product.create({
    data: {
      sellerId: seller!.id,
      name: 'Test Item 888',
      price: 350,
      weight: 0.5,
    }
  });

  await prisma.pickupOrderItem.create({
    data: {
      pickupOrderId: po.id,
      productId: product.id,
      quantity: 1,
      verificationStatus: 'VERIFIED',
    }
  });

  const uuidv4 = '00000000-0000-4000-8000-888888888888';
  await prisma.order.create({
    data: {
      id: uuidv4,
      orderId,
      sellerId: seller!.id,
      buyerId: buyer!.id,
      productCount: 1,
      totalQty: 1,
      totalWeight: 0.5,
      pickupShgId: String(shg!.id),
      mainStatus: 'PICKUP_SHG_ACCEPTED',
      pickupShgStatus: 'ACCEPTED',
      pickupTransporterStatus: 'PENDING',
    }
  });

  await prisma.orderAssignment.create({
    data: {
      orderId: uuidv4,
      assigneeId: String(shg!.id),
      assigneeType: 'SHG',
      role: 'PICKUP',
      status: 'ACCEPTED',
    }
  });

  console.log(`[1] Created New Order ${orderId} (pickupOrderId: ${po.id}).`);
  console.log(`    Initial status: ${po.status}`);

  // 2. Call SHG Backend Pickup Completion Endpoint (http://localhost:3002/api/orders/new/pickup/:id/complete)
  console.log(`[2] Calling POST http://localhost:3002/api/orders/new/pickup/${po.id}/complete...`);
  try {
    const res = await axios.post(`http://localhost:3002/api/orders/new/pickup/${po.id}/complete`, {
      code: '1234'
    }, {
      headers: {
        'x-bypass-token': 'GMU_INTERNAL_BYPASS',
        'x-shg-id': String(shg!.id)
      }
    });
    console.log('    API Response Status:', res.status);
    console.log('    API Response Data:', res.data);
  } catch (err: any) {
    console.error('    API Error:', err.response?.data || err.message);
  }

  // 3. Inspect database status immediately
  const dbPo = await prisma.pickupOrder.findUnique({ where: { id: po.id } });
  const dbGmu = await prisma.order.findFirst({ where: { orderId } });

  console.log('=== FINAL DB RESULT AFTER PICKUP ===');
  console.log(`  - pickup_orders.status: "${dbPo?.status}" (EXPECTED: "PICKED_UP")`);
  console.log(`  - gmu.Order.mainStatus: "${dbGmu?.mainStatus}" (EXPECTED: "PARCEL_AT_SHG")`);
  console.log(`  - gmu.Order.pickupShgStatus: "${dbGmu?.pickupShgStatus}" (EXPECTED: "PICKED")`);

  if (dbPo?.status === 'PICKED_UP' && dbGmu?.mainStatus === 'PARCEL_AT_SHG') {
    console.log('✅ SUCCESS: Fresh new order picked up cleanly and moved to Delivery!');
  } else {
    console.log('❌ FAIL: Order status did not update as expected.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
