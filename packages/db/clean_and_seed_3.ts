process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING CLEAN AND SEED 3 ORDERS SCRIPT ---');

  // 1. Clean up existing order tables
  console.log('Cleaning up existing order data...');
  await prisma.pickupTracking.deleteMany();
  await prisma.dropTracking.deleteMany();
  await prisma.pickupOrderItem.deleteMany();
  await prisma.pickupOrder.deleteMany();
  await prisma.dropOrderItem.deleteMany();
  await prisma.dropOrder.deleteMany();
  await prisma.masterOrderItem.deleteMany();
  await prisma.masterOrder.deleteMany();
  console.log('Existing orders deleted successfully.');

  // 2. Ensure Seller User exists
  console.log('Ensuring Seller User exists (phone: 8888888888)...');
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

  // 3. Ensure Buyer User exists
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
    console.log('Created new Buyer User:', buyer.fullName);
  } else {
    console.log('Buyer User already exists:', buyer.fullName);
  }

  // 4. Ensure Product exists
  console.log('Ensuring product exists...');
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

  // 5. Ensure SHG User exists
  console.log('Ensuring SHG User exists (phone: 7777777777)...');
  let targetShg = await prisma.user.findFirst({
    where: { phoneNumber: '7777777777', role: UserRole.SHG }
  });
  if (!targetShg) {
    targetShg = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '7777777777',
        role: UserRole.SHG,
        fullName: 'Shanti Mahila SHG',
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
    console.log('Created new SHG User:', targetShg.fullName);
  } else {
    console.log('Found SHG User:', targetShg.fullName);
  }

  // 6. Ensure Transporter User exists
  console.log('Ensuring Transporter User exists (phone: 9999999999)...');
  let targetTransporter = await prisma.user.findFirst({
    where: { phoneNumber: '9999999999', role: UserRole.TRANSPORTER }
  });
  if (!targetTransporter) {
    targetTransporter = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999999',
        role: UserRole.TRANSPORTER,
        fullName: 'Mahendra Powar (Transporter)',
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
    console.log('Created new Transporter User:', targetTransporter.fullName);
  } else {
    console.log('Found Transporter User:', targetTransporter.fullName);
  }

  // Helper for unique order number base
  const baseNo = `ORD-${Date.now()}`;

  // ==========================================
  // ORDER 1: Delivery Tab (Completed Pickup, Accepted Drop)
  // ==========================================
  const orderNo1 = `${baseNo}-1`;
  console.log(`Seeding Order 1 (${orderNo1})...`);

  const masterOrder1 = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo1,
      buyerId: buyer.id,
      totalAmount: 360.0,
      paymentStatus: 'PENDING',
      paymentMethod: 'Online',
      status: 'PROCESSING',
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

  const pickupOrder1 = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo1}`,
      masterOrderId: masterOrder1.id,
      sellerId: seller.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'COMPLETED',
      pickupTime: new Date(),
      items: {
        create: {
          productId: product.id,
          quantity: 3,
        }
      }
    }
  });

  const dropOrder1 = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo1}`,
      masterOrderId: masterOrder1.id,
      buyerId: buyer.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'ACCEPTED',
      deliveryAddress: 'HDFC Bank, Nesari',
      items: {
        create: {
          productId: product.id,
          quantity: 3,
        }
      }
    }
  });

  // Tracking for Order 1
  await prisma.pickupTracking.create({
    data: {
      pickupOrderId: pickupOrder1.id,
      status: 'ACCEPTED',
      remarks: 'Pickup leg accepted by SHG.'
    }
  });
  await prisma.pickupTracking.create({
    data: {
      pickupOrderId: pickupOrder1.id,
      status: 'COMPLETED',
      remarks: 'Pickup completed.'
    }
  });
  await prisma.dropTracking.create({
    data: {
      dropOrderId: dropOrder1.id,
      status: 'ACCEPTED',
      remarks: 'Delivery leg auto-accepted upon pickup completion.'
    }
  });

  // ==========================================
  // ORDER 2: Delivery Tab (Completed Pickup, Accepted Drop)
  // ==========================================
  const orderNo2 = `${baseNo}-2`;
  console.log(`Seeding Order 2 (${orderNo2})...`);

  const masterOrder2 = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo2,
      buyerId: buyer.id,
      totalAmount: 240.0,
      paymentStatus: 'PENDING',
      paymentMethod: 'COD',
      status: 'PROCESSING',
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

  const pickupOrder2 = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo2}`,
      masterOrderId: masterOrder2.id,
      sellerId: seller.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'COMPLETED',
      pickupTime: new Date(),
      items: {
        create: {
          productId: product.id,
          quantity: 2,
        }
      }
    }
  });

  const dropOrder2 = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo2}`,
      masterOrderId: masterOrder2.id,
      buyerId: buyer.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'ACCEPTED',
      deliveryAddress: 'Gram Panchayat Road, Halkarni',
      items: {
        create: {
          productId: product.id,
          quantity: 2,
        }
      }
    }
  });

  // Tracking for Order 2
  await prisma.pickupTracking.create({
    data: {
      pickupOrderId: pickupOrder2.id,
      status: 'ACCEPTED',
      remarks: 'Pickup leg accepted by SHG.'
    }
  });
  await prisma.pickupTracking.create({
    data: {
      pickupOrderId: pickupOrder2.id,
      status: 'COMPLETED',
      remarks: 'Pickup completed.'
    }
  });
  await prisma.dropTracking.create({
    data: {
      dropOrderId: dropOrder2.id,
      status: 'ACCEPTED',
      remarks: 'Delivery leg auto-accepted upon pickup completion.'
    }
  });

  // ==========================================
  // ORDER 3: Pickup Tab (Pending Pickup, Pending Drop)
  // ==========================================
  const orderNo3 = `${baseNo}-3`;
  console.log(`Seeding Order 3 (${orderNo3})...`);

  const masterOrder3 = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo3,
      buyerId: buyer.id,
      totalAmount: 120.0,
      paymentStatus: 'PENDING',
      paymentMethod: 'Online',
      status: 'CREATED',
      items: {
        create: {
          productId: product.id,
          sellerId: seller.id,
          quantity: 1,
          price: 120.0,
        }
      }
    }
  });

  const pickupOrder3 = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo3}`,
      masterOrderId: masterOrder3.id,
      sellerId: seller.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'PENDING',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
        }
      }
    }
  });

  const dropOrder3 = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo3}`,
      masterOrderId: masterOrder3.id,
      buyerId: buyer.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
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

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  console.log(`Order 1 (Delivery Tab):   ${orderNo1}`);
  console.log(`Order 2 (Delivery Tab):   ${orderNo2}`);
  console.log(`Order 3 (Pickup Tab):     ${orderNo3}`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
