process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const ordersData = [
  {
    index: 1,
    type: 'pickup',
    dbId: 12,
    orderNumber: 'ORD-1769749895005-1',
    address: 'Shop No. 25, Near First Corner, Nesari',
  },
  {
    index: 2,
    type: 'drop',
    dbId: 12,
    orderNumber: 'ORD-1769749895005-2',
    address: 'HDFC Bank, Nesari',
  },
  {
    index: 3,
    type: 'pickup',
    dbId: 11,
    orderNumber: 'ORD-1769749895005-3',
    address: 'Home No. 23, Chandgad',
  },
  {
    index: 4,
    type: 'pickup',
    dbId: 10,
    orderNumber: 'ORD-1769749895005-4',
    address: 'Market Road, Gadhinglaj',
  },
  {
    index: 5,
    type: 'drop',
    dbId: 10,
    orderNumber: 'ORD-1769749895005-5',
    address: 'Surya Bakery, Nesari',
  },
  {
    index: 6,
    type: 'drop',
    dbId: 9,
    orderNumber: 'ORD-1769749895005-6',
    address: 'Sai Medical, Gadhinglaj',
  },
  {
    index: 7,
    type: 'pickup',
    dbId: 8,
    orderNumber: 'ORD-1769749895005-7',
    address: 'Patil Galli, Nesari',
  },
  {
    index: 8,
    type: 'drop',
    dbId: 8,
    orderNumber: 'ORD-1769749895005-8',
    address: 'Mahalakshmi Stores, Halkarni',
  },
  {
    index: 9,
    type: 'pickup',
    dbId: 7,
    orderNumber: 'ORD-1769749895005-9',
    address: 'Shivaji Chowk, Chandgad',
  },
  {
    index: 10,
    type: 'drop',
    dbId: 7,
    orderNumber: 'ORD-1769749895005-10',
    address: 'SBI Bank, Chandgad',
  },
  {
    index: 11,
    type: 'pickup',
    dbId: 6,
    orderNumber: 'ORD-1769749895005-11',
    address: 'Gram Panchayat Road, Halkarni',
  },
  {
    index: 12,
    type: 'drop',
    dbId: 6,
    orderNumber: 'ORD-1769749895005-12',
    address: 'Ganesh Traders, Ajara',
  },
  {
    index: 13,
    type: 'pickup',
    dbId: 5,
    orderNumber: 'ORD-1769749895005-13',
    address: 'Bus Stand Area, Kadgaon',
  },
  {
    index: 14,
    type: 'pickup',
    dbId: 4,
    orderNumber: 'ORD-1769749895005-14',
    address: 'Near Hanuman Temple, Ajara',
  },
  {
    index: 15,
    type: 'drop',
    dbId: 4,
    orderNumber: 'ORD-1769749895005-15',
    address: 'LIC Office Road, Chandgad',
  },
  {
    index: 16,
    type: 'pickup',
    dbId: 3,
    orderNumber: 'ORD-1769749895005-16',
    address: 'Main Road, Mahagaon',
  },
  {
    index: 17,
    type: 'drop',
    dbId: 3,
    orderNumber: 'ORD-1769749895005-17',
    address: 'Patil Agro Center, Nesari',
  },
  {
    index: 18,
    type: 'pickup',
    dbId: 2,
    orderNumber: 'ORD-1769749895005-18',
    address: 'Tilak Chowk, Gadhinglaj',
  },
  {
    index: 19,
    type: 'drop',
    dbId: 2,
    orderNumber: 'ORD-1769749895005-19',
    address: 'Shop No. 14, Market Complex, Kadgaon',
  },
  {
    index: 20,
    type: 'drop',
    dbId: 1,
    orderNumber: 'ORD-1769749895005-20',
    address: 'Near Primary School, Mahagaon',
  }
];

async function main() {
  console.log('--- STARTING SEED 20 MIXED ORDERS SCRIPT ---');

  // 1. Clean up existing order data
  console.log('Cleaning up existing order data...');
  await prisma.pickupTracking.deleteMany();
  await prisma.dropTracking.deleteMany();
  await prisma.pickupOrderItem.deleteMany();
  await prisma.pickupOrder.deleteMany();
  await prisma.dropOrderItem.deleteMany();
  await prisma.dropOrder.deleteMany();
  await prisma.masterOrderItem.deleteMany();
  await prisma.masterOrder.deleteMany();
  
  console.log('Cleaning up old test seller users and addresses...');
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
  console.log('Existing orders and test users deleted.');

  // 2. Ensure SHG User exists (phone: 7575757575)
  console.log('Ensuring SHG User exists (phone: 7575757575)...');
  let shg = await prisma.user.findFirst({
    where: { phoneNumber: '7575757575', role: UserRole.SHG }
  });
  if (!shg) {
    shg = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '7575757575',
        role: UserRole.SHG,
        fullName: 'Mahadev',
        isVerified: true,
        address: {
          create: {
            addressLine1: 'Gram Panchayat Road',
            village: 'Halkarni',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416506',
          }
        }
      }
    });
    console.log('Created SHG User:', shg.fullName);
  } else {
    console.log('Found SHG User:', shg.fullName);
  }

  // 3. Ensure Transporter User exists (phone: 9999999999)
  console.log('Ensuring Transporter User exists (phone: 9999999999)...');
  let transporter = await prisma.user.findFirst({
    where: { phoneNumber: '9999999999', role: UserRole.TRANSPORTER }
  });
  if (!transporter) {
    transporter = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999999',
        role: UserRole.TRANSPORTER,
        fullName: 'Mahendra Powar',
        isVerified: true,
        address: {
          create: {
            addressLine1: 'Main Road Nesari',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      }
    });
    console.log('Created Transporter User:', transporter.fullName);
  } else {
    console.log('Found Transporter User:', transporter.fullName);
  }

  // 4. Ensure Buyer User exists (phone: 9999999991)
  console.log('Ensuring Buyer User exists (phone: 9999999991)...');
  let buyer = await prisma.user.findUnique({
    where: { phoneNumber: '9999999991' },
    include: { address: true }
  });
  if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999991',
        role: UserRole.BUYER,
        fullName: 'Raju Patil (Buyer)',
        isVerified: true,
        address: {
          create: {
            addressLine1: 'Plot No 24, Nesari Stand Area',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      },
      include: { address: true }
    });
    console.log('Created Buyer User:', buyer.fullName);
  } else {
    console.log('Buyer User already exists:', buyer.fullName);
  }

  // 5. Seed the 20 orders
  console.log('Seeding 20 mixed orders...');
  for (const item of ordersData) {
    // Generate a unique seller for each order to hold its specific pickup address
    const sellerPhone = `88888880${item.index.toString().padStart(2, '0')}`;
    
    // Create the Seller user
    const sellerAddressLine = item.type === 'pickup' ? item.address : 'Sakhi Center, Nesari';
    const seller = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: sellerPhone,
        role: UserRole.SELLER,
        fullName: `Seller for ${item.orderNumber}`,
        isVerified: true,
        address: {
          create: {
            addressLine1: sellerAddressLine,
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      }
    });

    // Randomize Quantity (1-10) and Weight (0.5kg-8kg)
    const qty = Math.floor(Math.random() * 10) + 1;
    const weightPerKg = parseFloat((Math.random() * 7.5 + 0.5).toFixed(1));

    // Create a product for this order
    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: 'Tasty Homemade Papad',
        category: 'FOOD',
        price: 120.0,
        stock: 500,
        weight: weightPerKg,
      }
    });

    // Create the MasterOrder with staggered creation times
    const createdAt = new Date(Date.now() - (20 - item.index) * 10 * 60 * 1000); // 10 minutes apart
    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: item.orderNumber,
        buyerId: buyer.id,
        totalAmount: qty * 120.0,
        paymentStatus: 'PENDING',
        paymentMethod: 'Online',
        status: 'CREATED',
        createdAt: createdAt,
        items: {
          create: {
            productId: product.id,
            sellerId: seller.id,
            quantity: qty,
            price: 120.0,
          }
        }
      }
    });

    // Create Pickup and Drop orders
    const isPickupStage = item.type === 'pickup';

    await prisma.pickupOrder.create({
      data: {
        pickupOrderNumber: `PKP-${item.orderNumber}`,
        masterOrderId: masterOrder.id,
        sellerId: seller.id,
        shgId: isPickupStage ? shg.id : null, // only assign to SHG if it's currently a pickup order
        transporterId: transporter.id,
        status: 'PENDING',
        createdAt: createdAt,
        items: {
          create: {
            productId: product.id,
            quantity: qty,
          }
        }
      }
    });

    const dropAddress = isPickupStage ? 'Transporter Hub Drop' : item.address;
    await prisma.dropOrder.create({
      data: {
        dropOrderNumber: `DRP-${item.orderNumber}`,
        masterOrderId: masterOrder.id,
        buyerId: buyer.id,
        shgId: !isPickupStage ? shg.id : null, // only assign to SHG if it's currently a drop order
        transporterId: transporter.id,
        status: 'PENDING',
        deliveryAddress: dropAddress,
        createdAt: createdAt,
        items: {
          create: {
            productId: product.id,
            quantity: qty,
          }
        }
      }
    });

    console.log(`Order seeded: ${item.orderNumber} (${item.type.toUpperCase()}) -> ID: ${item.dbId}`);
  }

  // 6. Reset autoincrement sequences
  console.log('Resetting database auto-increment sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('pickup_orders', 'id'), coalesce(max(id), 1)) FROM pickup_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('drop_orders', 'id'), coalesce(max(id), 1)) FROM drop_orders;`);

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
