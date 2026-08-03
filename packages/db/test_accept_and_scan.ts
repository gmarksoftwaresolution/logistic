import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST TRANSPORTER ACCEPT & SCAN FOR ORD-2026-121 ===');
  const orderId = 'ORD-2026-121';

  const po = await prisma.pickupOrder.findFirst({ where: { masterOrder: { orderNumber: orderId } } });
  const transporter = await prisma.user.findFirst({ where: { phoneNumber: '9000000002' } });

  console.log(`PickupOrder ID: ${po?.id}, Status: ${po?.status}, Transporter ID: ${transporter?.id}`);

  // 1. Transporter accepts the pickup order
  try {
    const acceptRes = await axios.post(`http://localhost:3003/api/orders/pickup/${po?.id}/accept`, {}, {
      headers: {
        'x-bypass-token': 'GMU_INTERNAL_BYPASS',
        'x-user-id': String(transporter?.id),
        'x-user-role': 'TRANSPORTER',
        'x-phone-number': transporter?.phoneNumber
      }
    });
    console.log('✅ ACCEPT PICKUP SUCCESS! Response status:', acceptRes.status);
  } catch (err: any) {
    console.error('❌ ACCEPT PICKUP FAILED:', err.response?.data || err.message);
    return;
  }

  // 2. Start Transporter Pickup Scan session
  const startRes = await axios.post(`http://localhost:3003/api/qr/pickup/session/start`, {
    orderIds: [orderId]
  }, {
    headers: {
      'x-bypass-token': 'GMU_INTERNAL_BYPASS',
      'x-user-id': String(transporter?.id),
      'x-user-role': 'TRANSPORTER',
      'x-phone-number': transporter?.phoneNumber
    }
  });

  const sessionId = startRes.data.sessionId;
  console.log(`Started Scan Session ID: ${sessionId}`);

  // 3. Scan the parcel QR code
  const parcels = await prisma.parcel.findMany({ where: { orderId } });
  if (parcels.length === 0) return;

  const qrData = JSON.stringify({
    parcelId: parcels[0].parcelId,
    verificationToken: parcels[0].verificationToken,
    version: 1
  });

  try {
    const scanRes = await axios.post(`http://localhost:3003/api/qr/pickup/scan`, {
      sessionId,
      qrData
    }, {
      headers: {
        'x-bypass-token': 'GMU_INTERNAL_BYPASS',
        'x-user-id': String(transporter?.id),
        'x-user-role': 'TRANSPORTER',
        'x-phone-number': transporter?.phoneNumber
      }
    });

    console.log('✅ TRANSPORTER QR SCAN SUCCESS! Status:', scanRes.status);
  } catch (err: any) {
    console.error('❌ TRANSPORTER QR SCAN FAILED:', err.response?.data || err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
