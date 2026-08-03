import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../backend/gmu/.env') });

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== PRE-GENERATE AND SAVE PARCEL QR CODES FOR ALL ORDERS ===');
  const allOrders = await prisma.order.findMany();
  console.log(`Total Orders: ${allOrders.length}`);

  for (let i = 0; i < allOrders.length; i++) {
    const o = allOrders[i];
    try {
      const res = await axios.get(`http://localhost:3001/orders/${o.id}`, {
        headers: { 'x-bypass-token': 'GMU_INTERNAL_BYPASS', 'x-user-role': 'ADMIN' }
      });
      console.log(`[${i + 1}/${allOrders.length}] Order ${o.orderId} -> ${res.data.parcels?.length} parcel(s) OK`);
    } catch (e: any) {
      console.error(`[${i + 1}/${allOrders.length}] Order ${o.orderId} failed:`, e.message);
    }
  }

  console.log('=== ALL ORDERS PRE-GENERATED AND STORED ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
