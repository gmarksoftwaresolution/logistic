process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient, UserRole, ApplicationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING TRANSPORTER 9876543210 FRESH SEEDING SCRIPT ---');

  // 1. Clean up existing order data for target IDs to avoid duplicate key errors
  const targetMasterOrderIds = [87, 88, 89, 90, 96, 97, 98, 99];
  const targetPickupOrderIds = [46, 47, 48, 49, 55, 56, 57, 58];
  
  console.log('Cleaning up existing target order tracking, items, and orders...');
  
  await prisma.pickupTracking.deleteMany({
    where: { pickupOrderId: { in: targetPickupOrderIds } }
  });
  await prisma.dropTracking.deleteMany({
    where: { dropOrder: { masterOrderId: { in: targetMasterOrderIds } } }
  });
  
  await prisma.pickupOrderItem.deleteMany({
    where: { pickupOrderId: { in: targetPickupOrderIds } }
  });
  await prisma.dropOrderItem.deleteMany({
    where: { dropOrder: { masterOrderId: { in: targetMasterOrderIds } } }
  });
  
  await prisma.pickupOrder.deleteMany({
    where: { id: { in: targetPickupOrderIds } }
  });
  await prisma.dropOrder.deleteMany({
    where: { masterOrderId: { in: targetMasterOrderIds } }
  });
  
  await prisma.masterOrderItem.deleteMany({
    where: { masterOrderId: { in: targetMasterOrderIds } }
  });
  await prisma.masterOrder.deleteMany({
    where: { id: { in: targetMasterOrderIds } }
  });

  console.log('Cleanup completed successfully.');

  // 2. Ensure Users Exist with Correct Data and Roles
  console.log('Ensuring transporter user 9876543210 exists...');
  let transporter = await prisma.user.findUnique({ where: { phoneNumber: '9876543210' } });
  if (!transporter) {
    transporter = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9876543210',
        role: UserRole.TRANSPORTER,
        fullName: 'Test Transporter (9876543210)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
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
  } else {
    transporter = await prisma.user.update({
      where: { id: transporter.id },
      data: {
        role: UserRole.TRANSPORTER,
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED
      }
    });
  }
  console.log(`Transporter user ID: ${transporter.id}`);

  console.log('Ensuring SHG leader user 7777777777 exists...');
  let shgUser = await prisma.user.findUnique({ where: { phoneNumber: '7777777777' } });
  if (!shgUser) {
    shgUser = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '7777777777',
        role: UserRole.SHG,
        fullName: 'Mahadev (SHG Leader)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
        address: {
          create: {
            addressLine1: 'Nesari Gram Panchayat Road',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      }
    });
  } else {
    shgUser = await prisma.user.update({
      where: { id: shgUser.id },
      data: {
        role: UserRole.SHG,
        fullName: 'Mahadev (SHG Leader)'
      }
    });
  }
  
  // Ensure SHG details exist
  let shgDetail = await prisma.shgDetail.findUnique({ where: { userId: shgUser.id } });
  if (!shgDetail) {
    await prisma.shgDetail.create({
      data: {
        userId: shgUser.id,
        shgName: 'Nesari Bachat Gat',
        shgLeaderName: 'Mahadev',
        shgLeaderContact: '7777777777',
        groupSize: 12
      }
    });
  }
  console.log(`SHG user ID: ${shgUser.id}`);

  console.log('Ensuring Sakhi Seller user 8888888888 exists...');
  let sellerUser = await prisma.user.findUnique({ where: { phoneNumber: '8888888888' } });
  if (!sellerUser) {
    sellerUser = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '8888888888',
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
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
      }
    });
  } else {
    sellerUser = await prisma.user.update({
      where: { id: sellerUser.id },
      data: {
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller)'
      }
    });
  }
  console.log(`Seller user ID: ${sellerUser.id}`);

  console.log('Ensuring GMU Hub user 8888888889 exists...');
  let gmuUser = await prisma.user.findUnique({ where: { phoneNumber: '8888888889' } });
  if (!gmuUser) {
    gmuUser = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '8888888889',
        role: UserRole.SELLER,
        fullName: 'GMU Hub',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
        address: {
          create: {
            addressLine1: 'Main GMU Central Hub, MIDC Area',
            village: 'Gadhinglaj',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416502',
          }
        }
      }
    });
  } else {
    gmuUser = await prisma.user.update({
      where: { id: gmuUser.id },
      data: {
        role: UserRole.SELLER,
        fullName: 'GMU Hub'
      }
    });
  }
  console.log(`GMU user ID: ${gmuUser.id}`);

  console.log('Ensuring Buyer user 9999999991 exists...');
  let buyerUser = await prisma.user.findUnique({ where: { phoneNumber: '9999999991' } });
  if (!buyerUser) {
    buyerUser = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999991',
        role: UserRole.BUYER,
        fullName: 'Raju Patil (Buyer)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
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
      }
    });
  }
  console.log(`Buyer user ID: ${buyerUser.id}`);

  // 3. Ensure Products Exist with correct details
  console.log('Ensuring products exist with correct details...');
  
  let papad = await prisma.product.findFirst({ where: { name: 'Tasty Homemade Papad' } });
  if (!papad) {
    papad = await prisma.product.create({
      data: {
        sellerId: sellerUser.id,
        name: 'Tasty Homemade Papad',
        category: 'FOOD',
        price: 120.0,
        stock: 500,
        weight: 1.5,
      }
    });
  }

  let chilli = await prisma.product.findFirst({ where: { name: 'Spicy Chilli Powder' } });
  if (!chilli) {
    chilli = await prisma.product.create({
      data: {
        sellerId: sellerUser.id,
        name: 'Spicy Chilli Powder',
        category: 'FOOD',
        price: 80.0,
        stock: 500,
        weight: 0.5,
      }
    });
  }

  let pickle = await prisma.product.findFirst({ where: { name: 'Organic Mango Pickle' } });
  if (!pickle) {
    pickle = await prisma.product.create({
      data: {
        sellerId: sellerUser.id,
        name: 'Organic Mango Pickle',
        category: 'FOOD',
        price: 150.0,
        stock: 500,
        weight: 1.0,
      }
    });
  }

  let bread = await prisma.product.findFirst({ where: { name: 'bread' } });
  if (!bread) {
    bread = await prisma.product.create({
      data: {
        sellerId: gmuUser.id,
        name: 'bread',
        category: 'FOOD',
        price: 40.0,
        stock: 500,
        weight: 0.5,
      }
    });
  }

  console.log('Products configured.');

  // Helper function to seed master order, pickup order, and drop order with specific IDs
  async function seedOrderGroup(params: {
    masterOrderId: number;
    pickupOrderId: number;
    orderNumber: string;
    pickupStatus: string;
    dropStatus: string;
    pickupTime?: Date | string | null;
    handoverCode?: string | null;
    sellerId: number;
    buyerId: number;
    product: any;
    quantity: number;
    deliveryAddress: string;
  }) {
    console.log(`Seeding Order Group: ${params.orderNumber} (Master ID: ${params.masterOrderId}, Pickup ID: ${params.pickupOrderId})...`);
    
    // Create Master Order
    await prisma.masterOrder.create({
      data: {
        id: params.masterOrderId,
        orderNumber: params.orderNumber,
        buyerId: params.buyerId,
        totalAmount: params.product.price * params.quantity,
        paymentStatus: 'PENDING',
        paymentMethod: 'COD',
        status: 'PROCESSING',
        items: {
          create: {
            productId: params.product.id,
            sellerId: params.sellerId,
            quantity: params.quantity,
            price: params.product.price,
          }
        }
      }
    });

    // Create Pickup Order
    await prisma.pickupOrder.create({
      data: {
        id: params.pickupOrderId,
        pickupOrderNumber: `PKP-${params.orderNumber}`,
        masterOrderId: params.masterOrderId,
        sellerId: params.sellerId,
        shgId: shgUser!.id,
        transporterId: transporter!.id,
        status: params.pickupStatus as any,
        pickupTime: params.pickupTime ? new Date(params.pickupTime) : null,
        handoverCode: params.handoverCode,
        items: {
          create: {
            productId: params.product.id,
            quantity: params.quantity,
          }
        }
      }
    });

    // Create Drop Order
    await prisma.dropOrder.create({
      data: {
        masterOrderId: params.masterOrderId,
        buyerId: params.buyerId,
        shgId: shgUser!.id,
        transporterId: transporter!.id,
        dropOrderNumber: `DRP-${params.orderNumber}`,
        status: params.dropStatus as any,
        deliveryAddress: params.deliveryAddress,
        items: {
          create: {
            productId: params.product.id,
            quantity: params.quantity,
          }
        }
      }
    });

    // Seeding Tracking Entries
    await prisma.pickupTracking.create({
      data: {
        pickupOrderId: params.pickupOrderId,
        status: params.pickupStatus as any,
        remarks: `Pickup Order seeded as ${params.pickupStatus}.`
      }
    });
  }

  // ====================================================================
  // 1. Order ID 58: PKP-SHG-GMU-B-16492 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 99,
    pickupOrderId: 58,
    orderNumber: 'SHG-GMU-B-16492',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser.id,
    buyerId: buyerUser.id,
    product: pickle,
    quantity: 1,
    deliveryAddress: 'Nesari Central GMU Hub'
  });

  // ====================================================================
  // 2. Order ID 57: PKP-SHG-GMU-A-16492 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 98,
    pickupOrderId: 57,
    orderNumber: 'SHG-GMU-A-16492',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser.id,
    buyerId: buyerUser.id,
    product: chilli,
    quantity: 5,
    deliveryAddress: 'Nesari Central GMU Hub'
  });

  // ====================================================================
  // 3. Order ID 56: PKP-GMU-SHG-B-16492 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 97,
    pickupOrderId: 56,
    orderNumber: 'GMU-SHG-B-16492',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser.id,
    buyerId: buyerUser.id,
    product: papad,
    quantity: 3,
    deliveryAddress: 'Nesari Secondary School'
  });

  // ====================================================================
  // 4. Order ID 55: PKP-GMU-SHG-A-16492 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 96,
    pickupOrderId: 55,
    orderNumber: 'GMU-SHG-A-16492',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: gmuUser.id,
    buyerId: shgUser.id,
    product: bread,
    quantity: 2,
    deliveryAddress: 'Nesari Bachat Gat Center'
  });

  // ====================================================================
  // 5. Order ID 49: PKP-ORD-NEW-4-36148 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 90,
    pickupOrderId: 49,
    orderNumber: 'ORD-NEW-4-36148',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser.id,
    buyerId: buyerUser.id,
    product: pickle,
    quantity: 1,
    deliveryAddress: 'Plot No 24, Nesari Stand Area'
  });

  // ====================================================================
  // 6. Order ID 48: PKP-ORD-NEW-3-36148 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 89,
    pickupOrderId: 48,
    orderNumber: 'ORD-NEW-3-36148',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser.id,
    buyerId: buyerUser.id,
    product: chilli,
    quantity: 5,
    deliveryAddress: 'Plot No 24, Nesari Stand Area'
  });

  // ====================================================================
  // 7. Order ID 47: PKP-ORD-NEW-2-36148 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 88,
    pickupOrderId: 47,
    orderNumber: 'ORD-NEW-2-36148',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser.id,
    buyerId: buyerUser.id,
    product: papad,
    quantity: 3,
    deliveryAddress: 'Plot No 24, Nesari Stand Area'
  });

  // ====================================================================
  // 8. Order ID 46: PKP-ORD-NEW-1-36148 (Status: PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 87,
    pickupOrderId: 46,
    orderNumber: 'ORD-NEW-1-36148',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser.id,
    buyerId: buyerUser.id,
    product: bread,
    quantity: 2,
    deliveryAddress: 'Plot No 24, Nesari Stand Area'
  });

  // Reset auto-increment sequences so future DB operations do not fail
  console.log('Resetting auto-increment sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('pickup_orders', 'id'), coalesce(max(id), 1)) FROM pickup_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('drop_orders', 'id'), coalesce(max(id), 1)) FROM drop_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('master_orders', 'id'), coalesce(max(id), 1)) FROM master_orders;`);

  console.log('--- ALL TARGET FRESH ORDERS SEEDED ---');
  console.log('Transporter: 9876543210 (ID: ' + transporter.id + ')');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
