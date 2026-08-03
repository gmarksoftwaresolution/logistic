import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST TRANSPORTER BACKEND APIS ===');

  const transporter = await prisma.user.findFirst({
    where: { role: 'TRANSPORTER', applicationStatus: 'APPROVED' }
  });

  if (!transporter) {
    console.log('No approved transporter found');
    return;
  }

  console.log(`Testing Transporter ID: ${transporter.id}, Phone: ${transporter.phoneNumber}`);

  // 1. Test GET /api/registration/me (which previously threw 500 error due to missing drivingLicenseNo column)
  try {
    const regRes = await axios.get(`http://localhost:3003/api/registration/me`, {
      headers: {
        'x-bypass-token': 'GMU_INTERNAL_BYPASS',
        'x-user-id': String(transporter.id),
        'x-user-role': 'TRANSPORTER',
        'x-phone-number': transporter.phoneNumber
      }
    });
    console.log('✅ GET /api/registration/me SUCCESS! Status:', regRes.status);
  } catch (err: any) {
    console.error('❌ GET /api/registration/me FAILED:', err.response?.data || err.message);
  }

  // 2. Test GET /api/orders/pickup/assigned
  try {
    const ordersRes = await axios.get(`http://localhost:3003/api/orders/pickup/assigned`, {
      headers: {
        'x-bypass-token': 'GMU_INTERNAL_BYPASS',
        'x-user-id': String(transporter.id),
        'x-user-role': 'TRANSPORTER',
        'x-phone-number': transporter.phoneNumber
      }
    });
    console.log('✅ GET /api/orders/pickup/assigned SUCCESS! Status:', ordersRes.status);
    console.log('   Assigned orders count:', ordersRes.data?.length);
  } catch (err: any) {
    console.error('❌ GET /api/orders/pickup/assigned FAILED:', err.response?.data || err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
