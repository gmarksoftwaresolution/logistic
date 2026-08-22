require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  console.log('=== RESETTING ALL 20 ORDERS TO FRESH STARTING STATE ===');

  // 1. Update Order table
  const updatedOrders = await prisma.order.updateMany({
    data: {
      mainStatus: 'PICKUP_ASSIGNED',
      pickupShgStatus: 'ACCEPTED',
      pickupTransporterId: null,
      pickupTransporterStatus: 'PENDING',
      dropTransporterId: null,
      dropTransporterStatus: 'PENDING',
      dropShgStatus: 'PENDING',
      remarks: null,
      rejectReason: null,
    }
  });

  console.log(`✅ Reset ${updatedOrders.count} Order records.`);

  // 2. Reset Parcels to PARCEL_AT_SHG
  const orders = await prisma.order.findMany({ select: { id: true, pickupShgId: true } });
  for (const o of orders) {
    const pickupShgId = o.pickupShgId || '146';
    await prisma.parcel.updateMany({
      where: { orderId: o.id },
      data: {
        parcelStatus: 'PARCEL_AT_SHG',
        currentHolderId: pickupShgId,
        currentHolderType: 'SHG',
      }
    });
  }

  console.log('✅ Reset all Parcel records to PARCEL_AT_SHG.');

  // 3. Reset OrderAssignment records
  // Delete transporter assignments so fresh assignments get created on pickup
  await prisma.orderAssignment.deleteMany({
    where: { assigneeType: 'TRANSPORTER' }
  });

  // Ensure pickup SHG assignment exists for every order
  for (const o of orders) {
    const pickupShgId = o.pickupShgId || '146';
    const existingShgAssign = await prisma.orderAssignment.findFirst({
      where: { orderId: o.id, role: 'PICKUP', assigneeType: 'SHG' }
    });

    if (!existingShgAssign) {
      await prisma.orderAssignment.create({
        data: {
          orderId: o.id,
          assigneeId: pickupShgId,
          assigneeType: 'SHG',
          role: 'PICKUP',
          status: 'ACCEPTED'
        }
      });
    } else {
      await prisma.orderAssignment.update({
        where: { id: existingShgAssign.id },
        data: { status: 'ACCEPTED' }
      });
    }
  }

  console.log('✅ Reset all OrderAssignment records.');

  // 4. Print summary of all 20 orders
  const summary = await prisma.order.findMany({
    select: {
      orderId: true,
      flowType: true,
      mainStatus: true,
      pickupShgStatus: true,
      pickupTransporterStatus: true,
      seller: { select: { village: true } },
      buyer: { select: { village: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n=== CURRENT STATUS OF ALL 20 ORDERS ===');
  summary.forEach((o, index) => {
    console.log(`${index + 1}. OrderID: ${o.orderId} | Flow: ${o.flowType || 'VIA_HUB'} | Status: ${o.mainStatus} | PickupSHG: ${o.pickupShgStatus} | Route: ${o.seller?.village} ➔ ${o.buyer?.village}`);
  });
}

main().finally(async () => { await prisma.$disconnect(); });
