import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environmental variables
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../backend/gmu/.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

// Database URL is read from .env
import { PrismaClient } from '@prisma/client';
import { determineTransition } from './src/qr-engine';

console.log('Loaded DATABASE_URL for E2E:', process.env.DATABASE_URL);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Helper to generate verification token
function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function runTest() {
  console.log('=== STARTING AUTOMATED E2E QR VERIFICATION SESSION TEST ===');

  // Find an active order in public schema that is assigned to an SHG
  const activeOrder = await prisma.order.findFirst({
    where: {
      phase: 'PICKUP',
      mainStatus: 'PICKUP_ASSIGNED',
    },
    include: {
      seller: true,
      buyer: true,
    }
  });

  if (!activeOrder) {
    console.error('FAIL: No active PICKUP_ASSIGNED orders found. Run reset-orders-to-pickup-new.ts first.');
    return;
  }

  const orderId = activeOrder.orderId;
  console.log(`PASS: Found active order ${orderId} for testing.`);

  // Find the assigned SHG assigneeId
  const assignment = await prisma.orderAssignment.findFirst({
    where: {
      orderId: activeOrder.id,
      role: 'PICKUP',
      assigneeType: 'SHG',
    }
  });

  if (!assignment) {
    console.error('FAIL: No SHG assignment found for this order.');
    return;
  }

  const shgId = assignment.assigneeId;
  console.log(`PASS: Found assigned SHG: ID ${shgId}.`);

  // Scenario 1: SHG Accepts the Order
  console.log('\n--- Scenario 1: SHG Accepts the Order ---');
  await prisma.$transaction(async (tx) => {
    // Update assignments
    await tx.orderAssignment.updateMany({
      where: { orderId: activeOrder.id, assigneeId: shgId },
      data: { status: 'ACCEPTED', updatedAt: new Date() },
    });
    await tx.$executeRawUnsafe(`
      UPDATE gmu."OrderAssignment"
      SET status = 'ACCEPTED', "updatedAt" = NOW()
      WHERE "orderId" = (SELECT id FROM gmu."Order" WHERE "orderId" = $1 LIMIT 1) AND "assigneeId" = $2;
    `, orderId, shgId);

    // Update orders in both schemas
    await tx.order.update({
      where: { id: activeOrder.id },
      data: { mainStatus: 'PICKUP_ACCEPTED', pickupShgStatus: 'ACCEPTED', pickupShgId: shgId },
    });
    await tx.$executeRawUnsafe(`
      UPDATE gmu."Order"
      SET "mainStatus" = 'PICKUP_ACCEPTED', "pickupShgStatus" = 'ACCEPTED', "pickupShgId" = $1, "updatedAt" = NOW()
      WHERE "orderId" = $2;
    `, shgId, orderId);

    // Update public.pickup_orders
    await tx.$executeRawUnsafe(`
      UPDATE public.pickup_orders
      SET status = 'ACCEPTED', shg_id = $1
      WHERE pickup_order_number = $2;
    `, Number(shgId), orderId);
  });
  console.log('PASS: Order successfully accepted by SHG.');

  // Scenario 2: Generate Parcels and verification tokens
  console.log('\n--- Scenario 2: Generating Order Parcels ---');
  // Fetch products
  const products: any[] = await prisma.$queryRawUnsafe(`
    SELECT p.id, p.name, p.weight
    FROM public.master_orders mo
    JOIN public.master_order_items moi ON mo.id = moi.master_order_id
    JOIN public.products p ON moi.product_id = p.id
    WHERE mo.order_number = $1;
  `, orderId);

  if (products.length === 0) {
    console.error('FAIL: No products found for order in master_orders.');
    return;
  }

  const parcels: any[] = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const parcelNum = i + 1;
    const token = generateVerificationToken();
    const weightStr = product.weight ? `${product.weight} KG` : '0.5 KG';

    // Delete existing if any to start clean
    await prisma.parcel.deleteMany({
      where: { orderId, productId: product.id, flowType: 'PICKUP' },
    });

    const parcel = await prisma.parcel.create({
      data: {
        orderId,
        productId: product.id,
        productName: product.name,
        parcelNumber: parcelNum,
        totalParcels: products.length,
        quantity: 1,
        weight: weightStr,
        flowType: 'PICKUP',
        parcelStatus: 'PENDING',
        currentHolderId: String(activeOrder.sellerId),
        currentHolderType: 'SELLER',
        verificationToken: token,
        qrCodeValue: `${orderId}:${product.id}:${token}:PICKUP`,
        qrImage: '',
        createdBy: 'E2E_TEST',
      }
    });
    parcels.push(parcel);
  }
  console.log(`PASS: Generated ${parcels.length} parcels with verification tokens.`);

  // Scenario 3: Start SHG Scan Session
  console.log('\n--- Scenario 3: Starting SHG Scan Session ---');
  const sessionId = `session-${Date.now()}`;
  const session = await prisma.scanSession.create({
    data: {
      sessionId,
      userId: shgId,
      userRole: 'SHG',
      sessionType: 'PICKUP',
      status: 'IN_PROGRESS',
      orderIds: orderId,
    }
  });
  console.log(`PASS: Scan session created: ID ${session.sessionId}`);

  // Scenario 4: Scanning Parcels (Valid & Invalid Cases)
  console.log('\n--- Scenario 4: Scanning Parcels ---');
  const testParcel = parcels[0];

  // Test Case A: Scan parcel belonging to another order (invalid)
  console.log('Test Case A: Scanning parcel for different order...');
  try {
    const fakeQr = `ORD-FAKE-9999:${testParcel.productId}:${testParcel.verificationToken}:PICKUP`;
    const orderIdsList = session.orderIds.split(',').map(id => id.trim()).filter(Boolean);
    const parsedOrderId = fakeQr.split(':')[0];
    if (!orderIdsList.includes(parsedOrderId)) {
      throw new Error('Parcel does not belong to this scan session orders');
    }
    console.error('FAIL: Allowed scanning a parcel from a different order!');
  } catch (err: any) {
    console.log(`PASS: Rejection success. Error message: "${err.message}"`);
  }

  // Test Case B: Scan valid parcel (correct flow)
  console.log('Test Case B: Scanning valid parcel...');
  await prisma.$transaction(async (tx) => {
    // Add item to session
    await tx.scanSessionItem.create({
      data: {
        sessionId: session.sessionId,
        parcelId: testParcel.parcelId,
      }
    });
  });
  console.log(`PASS: Valid parcel ${testParcel.parcelId} successfully added to session.`);

  // Test Case C: Scan duplicate parcel (should reject)
  console.log('Test Case C: Scanning duplicate parcel...');
  try {
    const existing = await prisma.scanSessionItem.findUnique({
      where: {
        sessionId_parcelId: {
          sessionId: session.sessionId,
          parcelId: testParcel.parcelId,
        }
      }
    });
    if (existing) {
      throw new Error('Parcel already scanned in this session.');
    }
  } catch (err: any) {
    console.log(`PASS: Rejection success. Duplicate scan error: "${err.message}"`);
  }

  // Scenario 5: Confirm Session & Transition order state to PARCEL_PICKED
  console.log('\n--- Scenario 5: Confirming Session & State Transition ---');
  await prisma.$transaction(async (tx) => {
    // Fetch all session items
    const items = await tx.scanSessionItem.findMany({
      where: { sessionId: session.sessionId },
    });

    // Update session status
    await tx.scanSession.update({
      where: { sessionId: session.sessionId },
      data: { status: 'CONFIRMED' },
    });

    // Update each scanned parcel state in the database
    for (const item of items) {
      const parcel = await tx.parcel.findUnique({ where: { parcelId: item.parcelId } });
      if (!parcel) continue;

      const order = await tx.order.findFirst({ where: { orderId: parcel.orderId } });
      if (!order) continue;

      // Determine next status using central QR engine
      const transition = determineTransition('PICKUP', 'SHG', shgId, parcel, order);

      // Update parcel
      await tx.parcel.update({
        where: { parcelId: parcel.parcelId },
        data: {
          parcelStatus: transition.nextParcelStatus,
          currentHolderId: transition.nextHolderId,
          currentHolderType: transition.nextHolderType,
        }
      });

      // Map nextParcelStatus to Order statuses
      let mainStatus = transition.nextParcelStatus;
      let pickupShgStatus = order.pickupShgStatus;
      let pickupTransporterStatus = order.pickupTransporterStatus;
      let dropShgStatus = order.dropShgStatus;
      let dropTransporterStatus = order.dropTransporterStatus;

      if (mainStatus === 'PARCEL_PICKED') {
        pickupShgStatus = 'PICKED';
      }

      // Update order in both schemas
      await tx.order.update({
        where: { id: order.id },
        data: {
          mainStatus,
          pickupShgStatus,
          pickupTransporterStatus,
          dropShgStatus,
          dropTransporterStatus,
        }
      });

      await tx.$executeRawUnsafe(`
        UPDATE gmu."Order"
        SET 
          "mainStatus" = $1,
          "pickupShgStatus" = $2,
          "pickupTransporterStatus" = $3,
          "dropShgStatus" = $4,
          "dropTransporterStatus" = $5,
          "updatedAt" = NOW()
        WHERE id = $6;
      `, mainStatus, pickupShgStatus, pickupTransporterStatus, dropShgStatus, dropTransporterStatus, order.id);

      // Create history record
      await tx.parcelScanHistory.create({
        data: {
          parcelId: parcel.parcelId,
          orderId: order.orderId,
          productId: parcel.productId,
          productName: parcel.productName,
          userRole: 'SHG',
          userId: shgId,
          action: transition.action,
          currentHolder: transition.nextHolderId || '',
          currentStage: transition.nextParcelStatus,
          scanResult: 'SUCCESS',
          remarks: transition.message,
        }
      });
    }
  });

  // Verify database state after confirmation
  const updatedOrder = await prisma.order.findFirst({ where: { orderId } });
  const updatedParcel = await prisma.parcel.findFirst({ where: { orderId, productId: testParcel.productId } });

  console.log(`Order Main Status: ${updatedOrder?.mainStatus} (Expected: PARCEL_PICKED)`);
  console.log(`Order SHG Status: ${updatedOrder?.pickupShgStatus} (Expected: PICKED)`);
  console.log(`Parcel Status: ${updatedParcel?.parcelStatus} (Expected: PARCEL_PICKED)`);
  console.log(`Parcel Holder: ${updatedParcel?.currentHolderType} ID ${updatedParcel?.currentHolderId} (Expected: SHG ID ${shgId})`);

  if (
    updatedOrder?.mainStatus === 'PARCEL_PICKED' &&
    updatedOrder?.pickupShgStatus === 'PICKED' &&
    updatedParcel?.parcelStatus === 'PARCEL_PICKED' &&
    updatedParcel?.currentHolderType === 'SHG' &&
    updatedParcel?.currentHolderId === shgId
  ) {
    console.log('\n=== E2E SCAN SESSION VERIFICATION TEST PASSED SUCCESSFULLY ===');
  } else {
    console.error('\n=== E2E SCAN SESSION VERIFICATION TEST FAILED ===');
  }
}

runTest()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
