import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST QR SCANNER API ENDPOINT (POST /api/qr/pickup/scan) ===');
  const orderId = 'ORD-2026-126';

  const gmuOrder = await prisma.order.findFirst({ where: { orderId } });
  const po = await prisma.pickupOrder.findFirst({ where: { masterOrder: { orderNumber: orderId } } });
  const parcels = await prisma.parcel.findMany({ where: { orderId } });

  const assignedShgId = po?.shgId || (gmuOrder?.pickupShgId ? parseInt(gmuOrder.pickupShgId, 10) : 91);

  console.log(`Order ID: ${orderId}, Master Order Pickup ID: ${po?.id}`);
  console.log(`Assigned SHG ID: ${assignedShgId}`);
  console.log(`Parcels found: ${parcels.length}`);

  if (parcels.length === 0) {
    console.log('No parcels found for ORD-2026-126 in DB.');
    return;
  }

  const testParcel = parcels[0];
  console.log(`Testing QR Scan for Parcel ID: ${testParcel.parcelId}, status: ${testParcel.parcelStatus}`);

  // 1. Start QR pickup session
  const startRes = await axios.post(`http://localhost:3002/api/qr/pickup/session/start`, {
    orderIds: [orderId]
  }, {
    headers: {
      'x-bypass-token': 'GMU_INTERNAL_BYPASS',
      'x-shg-id': String(assignedShgId)
    }
  });

  const sessionId = startRes.data.sessionId;
  console.log(`Started Scan Session ID: ${sessionId}`);

  // 2. Scan the parcel QR code
  const qrData = JSON.stringify({
    parcelId: testParcel.parcelId,
    verificationToken: testParcel.verificationToken,
    version: 1
  });

  console.log(`Calling POST /api/qr/pickup/scan with parcelId ${testParcel.parcelId}...`);
  try {
    const scanRes = await axios.post(`http://localhost:3002/api/qr/pickup/scan`, {
      sessionId,
      qrData
    }, {
      headers: {
        'x-bypass-token': 'GMU_INTERNAL_BYPASS',
        'x-shg-id': String(assignedShgId)
      }
    });

    console.log('✅ SCAN SUCCESSFUL! Response status:', scanRes.status);
    console.log('   Scanned parcel count:', scanRes.data?.scanned?.length);
    console.log('   Message:', scanRes.data?.scanned?.[0]?.productName || 'Success');
  } catch (err: any) {
    console.error('❌ SCAN ERROR:', err.response?.data || err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
