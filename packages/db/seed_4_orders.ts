process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

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

  console.log('Cleaning up old test seller users...');
  const testSellers = await prisma.user.findMany({
    where: {
      phoneNumber: {
        startsWith: '88888880',
      },
    },
    select: { id: true },
  });
  const testSellerIds = testSellers.map((s) => s.id);
  if (testSellerIds.length > 0) {
    await prisma.product.deleteMany({
      where: {
        sellerId: { in: testSellerIds },
      },
    });
    await prisma.address.deleteMany({
      where: {
        userId: { in: testSellerIds },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: testSellerIds },
      },
    });
  }
  console.log('Seller clean up complete.');

  console.log('Ensuring core users exist...');
  let buyer = await prisma.user.findUnique({ where: { phoneNumber: '9999999991' } });
  let shg = await prisma.user.findFirst({ where: { phoneNumber: '7777777777', role: UserRole.SHG } });
  let transporter = await prisma.user.findFirst({ where: { phoneNumber: '9999999999', role: UserRole.TRANSPORTER } });

  if (!buyer || !shg || !transporter) {
    console.error('Core users missing in DB!');
    return;
  }

  // --- SEED 2 SELLER ORDERS (Pickup leg assigned to SHG, Drop leg unassigned) ---
  const sellerOrdersData = [
    { orderId: 'ORD-1769749895005-3', address: 'Home No. 23, Chandgad' },
    { orderId: 'ORD-1769749895005-4', address: 'Market Road, Gadhinglaj' },
  ];

  for (let i = 0; i < sellerOrdersData.length; i++) {
    const item = sellerOrdersData[i];
    const sellerPhone = `888888808${i}`;
    
    const seller = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: sellerPhone,
        role: UserRole.SELLER,
        fullName: `Seller for ${item.orderId}`,
        isVerified: true,
        address: {
          create: {
            addressLine1: item.address,
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      }
    });

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: 'Organic Turmeric Packs',
        category: 'FOOD',
        price: 150.0,
        stock: 500,
        weight: 10.0,
      }
    });

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: item.orderId,
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
        pickupOrderNumber: `PKP-${item.orderId}`,
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
        dropOrderNumber: `DRP-${item.orderId}`,
        masterOrderId: masterOrder.id,
        buyerId: buyer.id,
        shgId: null, // Unassigned drop leg
        transporterId: transporter.id,
        status: 'PENDING',
        deliveryAddress: 'Transporter Hub Drop',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
          }
        }
      }
    });

    console.log(`Seeded Seller Order: ${item.orderId} (Pickup assigned, Drop unassigned)`);
  }

  // --- SEED 2 TRANSPORTER ORDERS (Pickup leg completed, Drop leg assigned to SHG) ---
  const transporterOrdersData = [
    { orderId: 'ORD-1769749895005-5', address: 'Surya Bakery, Nesari' },
    { orderId: 'ORD-1769749895005-6', address: 'Sai Medical, Gadhinglaj' },
  ];

  for (let i = 0; i < transporterOrdersData.length; i++) {
    const item = transporterOrdersData[i];
    const sellerPhone = `888888809${i}`;
    
    const seller = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: sellerPhone,
        role: UserRole.SELLER,
        fullName: `Warehouse for ${item.orderId}`,
        isVerified: true,
        address: {
          create: {
            addressLine1: 'Transporter Hub Drop',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      }
    });

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: 'Organic Groundnut Oil',
        category: 'FOOD',
        price: 200.0,
        stock: 500,
        weight: 5.0,
      }
    });

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: item.orderId,
        buyerId: buyer.id,
        totalAmount: 200.0,
        paymentStatus: 'PENDING',
        status: 'CREATED',
        items: {
          create: {
            productId: product.id,
            sellerId: seller.id,
            quantity: 1,
            price: 200.0,
          }
        }
      }
    });

    const pickupOrder = await prisma.pickupOrder.create({
      data: {
        pickupOrderNumber: `PKP-${item.orderId}`,
        masterOrderId: masterOrder.id,
        sellerId: seller.id,
        shgId: null,
        transporterId: transporter.id,
        status: 'COMPLETED', // Already picked up
        pickupTime: new Date(),
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
        dropOrderNumber: `DRP-${item.orderId}`,
        masterOrderId: masterOrder.id,
        buyerId: buyer.id,
        shgId: shg.id, // Assigned to SHG
        transporterId: transporter.id,
        status: 'PENDING',
        deliveryAddress: item.address,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
          }
        }
      }
    });

    console.log(`Seeded Transporter Order: ${item.orderId} (Pickup completed, Drop assigned)`);
  }

  // Reset auto-increment sequences
  console.log('Resetting auto-increment sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('pickup_orders', 'id'), coalesce(max(id), 1)) FROM pickup_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('drop_orders', 'id'), coalesce(max(id), 1)) FROM drop_orders;`);
  
  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
