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

  // --- ORDER 1: Pickup from GMU Hub (represented by a DropOrder) ---
  const orderNo1 = `GMU-DROP-${Date.now().toString().slice(-4)}`;
  const masterOrder1 = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo1,
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

  // Since it was already picked up from the seller by the SHG, 
  // we create a COMPLETED pickup order so it's not active for our transporter.
  await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo1}`,
      masterOrderId: masterOrder1.id,
      sellerId: seller.id,
      shgId: shg.id,
      transporterId: null,
      status: 'COMPLETED',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  // The DropOrder is PENDING and assigned to the transporter, starting at the GMU Hub
  const dropOrder1 = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo1}`,
      masterOrderId: masterOrder1.id,
      buyerId: buyer.id,
      shgId: shg.id, // Assigned to SHG (the buyer's SHG)
      transporterId: transporter.id, // Assigned to our transporter
      status: 'PENDING',
      deliveryAddress: 'Nesari Chowk (SHG Delivery Point)',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  // --- ORDER 2: Pickup from SHG (represented by a PickupOrder) ---
  const orderNo2 = `SHG-PKP-${Date.now().toString().slice(-4)}`;
  const masterOrder2 = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo2,
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

  // Active PickupOrder assigned to our transporter to collect from the SHG/Seller
  const pickupOrder2 = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo2}`,
      masterOrderId: masterOrder2.id,
      sellerId: seller.id,
      shgId: shg.id,
      transporterId: transporter.id, // Assigned to our transporter
      status: 'PENDING',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  // DropOrder for Order 2 is pending but not assigned to transporter yet
  await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo2}`,
      masterOrderId: masterOrder2.id,
      buyerId: buyer.id,
      shgId: null,
      transporterId: null,
      status: 'PENDING',
      deliveryAddress: 'Buyer Home Address',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  console.log('--- SEEDING COMPLETED ---');
  console.log(`Order 1 (Pickup from GMU Hub) -> DropOrder ID: ${dropOrder1.id}`);
  console.log(`Order 2 (Pickup from SHG) -> PickupOrder ID: ${pickupOrder2.id}`);

  // Reset auto-increment sequences
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('pickup_orders', 'id'), coalesce(max(id), 1)) FROM pickup_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('drop_orders', 'id'), coalesce(max(id), 1)) FROM drop_orders;`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
