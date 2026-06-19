process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding one test order...');

  const seller = await prisma.user.findFirst({ where: { phoneNumber: '8888888888' } });
  const buyer = await prisma.user.findFirst({ where: { phoneNumber: '9999999991' } });
  const shg = await prisma.user.findFirst({ where: { phoneNumber: '7777777777' } });
  const transporter = await prisma.user.findFirst({ where: { phoneNumber: '9999999999' } });

  if (!seller) {
    console.error('Missing seller in DB!');
    return;
  }

  const product = await prisma.product.findFirst({
    where: { name: 'chai' }
  }) || await prisma.product.create({
    data: {
      name: 'chai',
      sellerId: seller.id,
      price: 20.0,
      stock: 100,
      weight: 1.0,
      category: 'OTHER',
    }
  });

  if (!buyer || !shg || !transporter || !product) {
    console.error('Missing required users/products in DB!', { seller: !!seller, buyer: !!buyer, shg: !!shg, transporter: !!transporter, product: !!product });
    return;
  }

  const orderNo = `TEST-ORD-${Date.now().toString().slice(-5)}`;
  
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
      status: 'COMPLETED',
      pickupTime: new Date(),
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      },
      tracking: {
        createMany: {
          data: [
            { status: 'ACCEPTED', remarks: 'Pickup leg accepted by transporter.' },
            { status: 'COMPLETED', remarks: 'Pickup leg completed successfully by transporter.' }
          ]
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
      deliveryAddress: 'Test Drop Address',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  console.log('--- TEST ORDER CREATED ---');
  console.log(`MasterOrder ID: ${masterOrder.id}`);
  console.log(`PickupOrder ID: ${pickupOrder.id} (Status: ${pickupOrder.status})`);
  console.log(`DropOrder ID:   ${dropOrder.id} (Status: ${dropOrder.status})`);
  console.log('--------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
