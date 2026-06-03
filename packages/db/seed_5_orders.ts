process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 5 test orders...');

  const seller = await prisma.user.findFirst({ where: { phoneNumber: '8888888888' } });
  const buyer = await prisma.user.findFirst({ where: { phoneNumber: '9999999991' } });
  const shg = await prisma.user.findFirst({ where: { phoneNumber: '7777777777' } });
  const transporter = await prisma.user.findFirst({ where: { phoneNumber: '9999999999' } });
  const products = await prisma.product.findMany({ take: 5 });

  if (!seller || !buyer || !shg || !transporter || products.length === 0) {
    console.error('Missing required users/products in DB!');
    return;
  }

  for (let i = 0; i < 5; i++) {
    const product = products[i % products.length];
    const orderNo = `TEST-ORD-${Date.now().toString().slice(-5)}-${i}`;
    
    // Simulate "From Transporter" for 2 orders by not associating a seller address or something similar,
    // or just let them all be the same structure since the DB schema requires a sellerId.
    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: orderNo,
        buyerId: buyer.id,
        totalAmount: product.price,
        paymentStatus: 'PENDING',
        status: 'CREATED',
        items: {
          create: {
            productId: product.id,
            sellerId: seller.id,
            quantity: 1,
            price: product.price,
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
        deliveryAddress: i % 2 === 0 ? 'Transporter Hub Drop' : 'Buyer Home Address',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
          }
        }
      }
    });

    console.log(`--- TEST ORDER ${i + 1} CREATED ---`);
    console.log(`PickupOrder ID: ${pickupOrder.id}`);
    console.log(`DropOrder ID:   ${dropOrder.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
