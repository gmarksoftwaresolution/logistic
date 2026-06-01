process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar%4021@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING CLEAN MOCK ORDERS SEED SCRIPT ---');

  // 1. Clean up existing mock/test orders to start fresh
  console.log('Wiping old orders to start with a clean state...');
  await prisma.pickupTracking.deleteMany();
  await prisma.dropTracking.deleteMany();
  await prisma.pickupOrderItem.deleteMany();
  await prisma.pickupOrder.deleteMany();
  await prisma.dropOrderItem.deleteMany();
  await prisma.dropOrder.deleteMany();
  await prisma.masterOrderItem.deleteMany();
  await prisma.masterOrder.deleteMany();
  console.log('Database order tables cleaned successfully.');

  // 2. Create/Ensure Seller User (Independent/Seller role)
  console.log('Ensuring Seller User exists...');
  let seller = await prisma.user.findUnique({
    where: { phoneNumber: '8888888888' },
    include: { address: true }
  });

  if (!seller) {
    seller = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '8888888888',
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller)',
        isVerified: true,
        address: {
          create: {
            addressLine1: 'Sakhi Center, Near Primary School',
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
    console.log('Created new Seller User:', seller.fullName);
  } else {
    console.log('Seller User already exists:', seller.fullName);
  }

  // 3. Create/Ensure Buyer User (Buyer role)
  console.log('Ensuring Buyer User exists...');
  let buyer = await prisma.user.findUnique({
    where: { phoneNumber: '9999999999' },
    include: { address: true }
  });

  // Check if existing user phone 9999999999 has role TRANSPORTER (Mahendra Powar). 
  // If so, we should use a different phone number for the buyer to prevent role conflict!
  if (buyer && buyer.role === UserRole.TRANSPORTER) {
    console.log(`Note: Phone 9999999999 belongs to Transporter "${buyer.fullName}". Using phone 9999999991 for Buyer Raju instead.`);
    buyer = await prisma.user.findUnique({
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
      console.log('Created new Buyer User:', buyer.fullName);
    }
  } else if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999999',
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
    console.log('Created new Buyer User:', buyer.fullName);
  }

  // 4. Create/Ensure Products
  console.log('Ensuring Product exists...');
  let product = await prisma.product.findFirst({
    where: { name: 'Tasty Homemade Papad' }
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: 'Tasty Homemade Papad',
        category: 'FOOD',
        price: 120.0,
        stock: 500,
        weight: 1.5,
      }
    });
    console.log('Created new Product:', product.name);
  } else {
    console.log('Product already exists:', product.name);
  }

  // 5. Query specific SHG user (7777777777) & specific Transporter user (9999999999)
  console.log('Querying target SHG (7777777777) & Transporter (9999999999)...');
  const targetShg = await prisma.user.findFirst({
    where: { phoneNumber: '7777777777', role: UserRole.SHG }
  });

  const targetTransporter = await prisma.user.findFirst({
    where: { phoneNumber: '9999999999', role: UserRole.TRANSPORTER }
  });

  if (!targetShg) {
    console.error('ERROR: Could not find SHG user with phone "7777777777" in DB.');
    return;
  }
  if (!targetTransporter) {
    console.error('ERROR: Could not find Transporter user with phone "9999999999" in DB.');
    return;
  }

  console.log(`Found SHG User: ${targetShg.fullName} (ID: ${targetShg.id})`);
  console.log(`Found Transporter User: ${targetTransporter.fullName} (ID: ${targetTransporter.id})`);

  // 6. Generate test orders for this specific pair
  console.log('Generating customized mock orders...');

  // --- Order 1: Assigned Pickup ---
  const orderNo1 = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const masterOrder1 = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo1,
      buyerId: buyer.id,
      totalAmount: 240.0,
      paymentStatus: 'PENDING',
      status: 'CREATED',
      items: {
        create: {
          productId: product.id,
          sellerId: seller.id,
          quantity: 2,
          price: 120.0,
        }
      }
    }
  });

  const pickupOrder = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo1}`,
      masterOrderId: masterOrder1.id,
      sellerId: seller.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'PENDING',
      items: {
        create: {
          productId: product.id,
          quantity: 2,
        }
      }
    }
  });

  console.log(`  -> Created assigned Pickup Order: ${pickupOrder.pickupOrderNumber} (ID: ${pickupOrder.id})`);

  // --- Order 2: Assigned Drop ---
  const orderNo2 = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const masterOrder2 = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo2,
      buyerId: buyer.id,
      totalAmount: 360.0,
      paymentStatus: 'PENDING',
      status: 'CREATED',
      items: {
        create: {
          productId: product.id,
          sellerId: seller.id,
          quantity: 3,
          price: 120.0,
        }
      }
    }
  });

  const dropOrder = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo2}`,
      masterOrderId: masterOrder2.id,
      buyerId: buyer.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'PENDING',
      deliveryAddress: buyer.address ? `${buyer.address.addressLine1}, ${buyer.address.village}` : 'Nesari Stand, Gadhinglaj',
      items: {
        create: {
          productId: product.id,
          quantity: 3,
        }
      }
    }
  });

  console.log(`  -> Created assigned Drop Order: ${dropOrder.dropOrderNumber} (ID: ${dropOrder.id})`);

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
