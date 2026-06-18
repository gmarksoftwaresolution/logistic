process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding custom order with ID ORD-1769749895005-1...');

  const seller = await prisma.user.findFirst({ where: { phoneNumber: '8888888888' } });
  const buyer = await prisma.user.findFirst({ where: { phoneNumber: '9999999991' } });
  const shg = await prisma.user.findFirst({ where: { phoneNumber: '7777777777' } });
  const transporter = await prisma.user.findFirst({ where: { phoneNumber: '9999999999' } });
  const product = await prisma.product.findFirst();

  if (!seller || !buyer || !shg || !transporter || !product) {
    console.error('Missing required users/products in DB!');
    return;
  }

  const orderNo = "ORD-1769749895005-1";
  
  const masterOrder = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo,
      buyerId: buyer.id,
      totalAmount: 150.0,
      paymentStatus: 'PENDING',
      status: 'CREATED',
      items: {
        create: {
          productId: product.id,
          sellerId: seller.id,
          quantity: 1,
          price: 150.0,
        }
      }
    }
  });

  const pickupOrder = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo}`,
      masterOrderId: masterOrder.id,
      sellerId: seller.id,
      shgId: shg.id,
      transporterId: transporter.id,
      status: 'PENDING',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  const dropOrder = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo}`,
      masterOrderId: masterOrder.id,
      buyerId: buyer.id,
      shgId: shg.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'HDFC Bank, nesari',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  console.log('--- CUSTOM TEST ORDER CREATED ---');
  console.log(`MasterOrder ID: ${masterOrder.id} (${masterOrder.orderNumber})`);
  console.log(`PickupOrder ID: ${pickupOrder.id} (Status: ${pickupOrder.status})`);
  console.log(`DropOrder ID:   ${dropOrder.id} (Status: ${dropOrder.status})`);
  console.log('--------------------------');
}

main()
  .catch((e) => {
    console.error('Failed to create order (maybe it already exists?)', e.message);
  })
  .finally(() => prisma.$disconnect());
