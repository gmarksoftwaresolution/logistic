process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing order data...');
  await prisma.pickupTracking.deleteMany();
  await prisma.dropTracking.deleteMany();
  await prisma.pickupOrderItem.deleteMany();
  await prisma.pickupOrder.deleteMany();
  await prisma.dropOrderItem.deleteMany();
  await prisma.dropOrder.deleteMany();
  await prisma.masterOrderItem.deleteMany();
  await prisma.masterOrder.deleteMany();
  console.log('Order tables cleared.');

  console.log('Seeding 2 test orders...');

  const seller = await prisma.user.findFirst({ where: { phoneNumber: '8888888888' } });
  const buyer = await prisma.user.findFirst({ where: { phoneNumber: '9999999991' } });
  const shg = await prisma.user.findFirst({ where: { phoneNumber: '7777777777' } });
  const transporter = await prisma.user.findFirst({ where: { phoneNumber: '9999999999' } });
  const product = await prisma.product.findFirst();

  if (!seller || !buyer || !shg || !transporter || !product) {
    console.error('Missing required users/products in DB!', {
      seller: !!seller,
      buyer: !!buyer,
      shg: !!shg,
      transporter: !!transporter,
      product: !!product
    });
    return;
  }

  for (let i = 1; i <= 2; i++) {
    const orderNo = `TEST-ORD-NEW-${Date.now().toString().slice(-4)}-${i}`;
    
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
        shgId: null, // Initially unassigned so it goes to Delivery tab on pickup completion
        transporterId: transporter.id,
        status: 'PENDING',
        deliveryAddress: i === 1 ? 'Transporter Hub Drop' : 'Buyer Home Address',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
          }
        }
      }
    });

    console.log(`--- TEST ORDER ${i} CREATED ---`);
    console.log(`MasterOrder Number: ${orderNo}`);
    console.log(`PickupOrder ID:     ${pickupOrder.id} (shgId: ${shg.id})`);
    console.log(`DropOrder ID:       ${dropOrder.id} (shgId: null)`);
  }

  // Reset auto-increment sequences
  console.log('Resetting auto-increment sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('pickup_orders', 'id'), coalesce(max(id), 1)) FROM pickup_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('drop_orders', 'id'), coalesce(max(id), 1)) FROM drop_orders;`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
