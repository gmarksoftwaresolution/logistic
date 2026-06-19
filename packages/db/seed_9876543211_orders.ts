process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient, UserRole, ApplicationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING TRANSPORTER 9876543211 FRESH PENDING SEEDING SCRIPT ---');

  // 1. Target ID lists for cleanup
  const targetMasterOrderIds = [102, 103, 104, 105, 106, 107, 108, 109, 110, 111];
  const targetPickupOrderIds = [61, 62, 63, 64, 65, 66, 67, 68, 69, 70];

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

  // 2. Ensure Transporter User exists and is APPROVED
  console.log('Ensuring transporter user 9876543211 is APPROVED...');
  let transporter = await prisma.user.findUnique({ where: { phoneNumber: '9876543211' } });
  if (!transporter) {
    transporter = await prisma.user.create({
      data: {
        id: 30,
        authId: randomUUID(),
        phoneNumber: '9876543211',
        role: UserRole.TRANSPORTER,
        fullName: 'Test Transporter (9876543211)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
        uniqueCode: 'TRP-987654',
      }
    });
  } else {
    transporter = await prisma.user.update({
      where: { id: transporter.id },
      data: {
        role: UserRole.TRANSPORTER,
        fullName: 'Test Transporter (9876543211)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
        uniqueCode: 'TRP-987654',
      }
    });
  }

  // Ensure transporter address exists
  let transporterAddress = await prisma.address.findUnique({ where: { userId: transporter.id } });
  if (!transporterAddress) {
    await prisma.address.create({
      data: {
        userId: transporter.id,
        addressLine1: 'Main Road Nesari',
        village: 'Nesari',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416504',
      }
    });
  }

  // Ensure transporter details exist
  let transporterDetail = await prisma.transporterDetail.findUnique({ where: { userId: transporter.id } });
  if (!transporterDetail) {
    await prisma.transporterDetail.create({
      data: {
        userId: transporter.id,
        transporterCode: 'TRP-987654',
        vehicleCategory: 'FOUR_WHEELER',
        experienceYears: 5,
        availableFullTime: true
      }
    });
  }

  // Ensure driving details exist
  let drivingDetail = await prisma.drivingDetail.findUnique({ where: { userId: transporter.id } });
  if (!drivingDetail) {
    await prisma.drivingDetail.create({
      data: {
        userId: transporter.id,
        licenseNumber: 'MH-09-2026-1234567',
        expiryDate: new Date('2036-06-12T10:57:15.971Z'),
        drivingExperience: 5
      }
    });
  }
  console.log(`Transporter user ID: ${transporter.id}`);

  // 3. Ensure SHG leader user 27 (Savani Sakhi Center / Savita) exists
  console.log('Ensuring SHG leader user 7777777776 exists...');
  let shgUser27 = await prisma.user.findUnique({ where: { phoneNumber: '7777777776' } });
  if (!shgUser27) {
    shgUser27 = await prisma.user.create({
      data: {
        id: 27,
        authId: randomUUID(),
        phoneNumber: '7777777776',
        role: UserRole.SHG,
        fullName: 'Savita (SHG Leader 2)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  } else {
    shgUser27 = await prisma.user.update({
      where: { id: shgUser27.id },
      data: {
        role: UserRole.SHG,
        fullName: 'Savita (SHG Leader 2)',
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  }

  // Ensure SHG 27 address exists
  let shgAddress27 = await prisma.address.findUnique({ where: { userId: shgUser27.id } });
  if (!shgAddress27) {
    await prisma.address.create({
      data: {
        userId: shgUser27.id,
        addressLine1: 'Savani Sakhi Center',
        village: 'Wagharale',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416504',
      }
    });
  }

  // Ensure SHG details exist
  let shgDetail27 = await prisma.shgDetail.findUnique({ where: { userId: shgUser27.id } });
  if (!shgDetail27) {
    await prisma.shgDetail.create({
      data: {
        userId: shgUser27.id,
        shgName: 'Savani Bachat Gat',
        shgLeaderName: 'Savita',
        shgLeaderContact: '7777777776',
        groupSize: 10
      }
    });
  }
  console.log(`SHG 27 user ID: ${shgUser27.id}`);

  // 4. Ensure Seller user 28 (Mahila Bachat Gat (Sakhi Seller 2)) exists
  console.log('Ensuring Seller user 8888888886 exists...');
  let sellerUser28 = await prisma.user.findUnique({ where: { phoneNumber: '8888888886' } });
  if (!sellerUser28) {
    sellerUser28 = await prisma.user.create({
      data: {
        id: 28,
        authId: randomUUID(),
        phoneNumber: '8888888886',
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller 2)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  } else {
    sellerUser28 = await prisma.user.update({
      where: { id: sellerUser28.id },
      data: {
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller 2)',
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  }

  // Ensure Seller 28 address exists
  let sellerAddress28 = await prisma.address.findUnique({ where: { userId: sellerUser28.id } });
  if (!sellerAddress28) {
    await prisma.address.create({
      data: {
        userId: sellerUser28.id,
        addressLine1: 'Savani Sakhi Center',
        village: 'Wagharale',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416504',
      }
    });
  }
  console.log(`Seller 28 user ID: ${sellerUser28.id}`);

  // 5. Ensure SHG leader user 3 (Mahadev) exists
  console.log('Ensuring SHG leader user 7777777777 exists...');
  let shgUser3 = await prisma.user.findUnique({ where: { phoneNumber: '7777777777' } });
  if (!shgUser3) {
    shgUser3 = await prisma.user.create({
      data: {
        id: 3,
        authId: randomUUID(),
        phoneNumber: '7777777777',
        role: UserRole.SHG,
        fullName: 'Mahadev (SHG Leader)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  } else {
    shgUser3 = await prisma.user.update({
      where: { id: shgUser3.id },
      data: {
        role: UserRole.SHG,
        fullName: 'Mahadev (SHG Leader)',
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  }

  // Ensure SHG 3 address exists
  let shgAddress3 = await prisma.address.findUnique({ where: { userId: shgUser3.id } });
  if (!shgAddress3) {
    await prisma.address.create({
      data: {
        userId: shgUser3.id,
        addressLine1: 'Nesari Gram Panchayat Road',
        village: 'Nesari',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416504',
      }
    });
  }

  // Ensure SHG details exist
  let shgDetail3 = await prisma.shgDetail.findUnique({ where: { userId: shgUser3.id } });
  if (!shgDetail3) {
    await prisma.shgDetail.create({
      data: {
        userId: shgUser3.id,
        shgName: 'Nesari Bachat Gat',
        shgLeaderName: 'Mahadev',
        shgLeaderContact: '7777777777',
        groupSize: 12
      }
    });
  }
  console.log(`SHG 3 user ID: ${shgUser3.id}`);

  // 6. Ensure Seller user 1 (Mahila Bachat Gat (Sakhi Seller)) exists
  console.log('Ensuring Seller user 8888888888 exists...');
  let sellerUser1 = await prisma.user.findUnique({ where: { phoneNumber: '8888888888' } });
  if (!sellerUser1) {
    sellerUser1 = await prisma.user.create({
      data: {
        id: 1,
        authId: randomUUID(),
        phoneNumber: '8888888888',
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  } else {
    sellerUser1 = await prisma.user.update({
      where: { id: sellerUser1.id },
      data: {
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller)',
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  }

  // Ensure Seller 1 address exists
  let sellerAddress1 = await prisma.address.findUnique({ where: { userId: sellerUser1.id } });
  if (!sellerAddress1) {
    await prisma.address.create({
      data: {
        userId: sellerUser1.id,
        addressLine1: 'Sakhi Center, Near Primary School',
        village: 'Nesari',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416504',
      }
    });
  }
  console.log(`Seller 1 user ID: ${sellerUser1.id}`);

  // 6b. Ensure GMU Hub User exists
  console.log('Ensuring Central GMU Hub exists (phone: 9999999992)...');
  let gmuHub = await prisma.user.findUnique({ where: { phoneNumber: '9999999992' } });
  if (!gmuHub) {
    gmuHub = await prisma.user.create({
      data: {
        id: 11,
        authId: randomUUID(),
        phoneNumber: '9999999992',
        role: UserRole.SELLER,
        fullName: 'Central GMU Hub',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  } else {
    gmuHub = await prisma.user.update({
      where: { id: gmuHub.id },
      data: {
        role: UserRole.SELLER,
        fullName: 'Central GMU Hub',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
      }
    });
  }

  // Ensure GMU address exists
  let gmuAddress = await prisma.address.findUnique({ where: { userId: gmuHub.id } });
  if (!gmuAddress) {
    await prisma.address.create({
      data: {
        userId: gmuHub.id,
        addressLine1: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
        village: 'Gadhinglaj',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra',
        pincode: '416502',
      }
    });
  }
  console.log(`GMU Hub ID: ${gmuHub.id}`);

  // 9. Ensure products exist with correct prices
  console.log('Ensuring products exist with correct prices...');
  let papad = await prisma.product.findUnique({ where: { id: 1 } });
  if (!papad) {
    papad = await prisma.product.create({
      data: {
        id: 1,
        sellerId: sellerUser1.id,
        name: 'Tasty Homemade Papad',
        category: 'FOOD',
        price: 120.0,
        stock: 500,
        weight: 1.5,
      }
    });
  }
  let chilli = await prisma.product.findUnique({ where: { id: 2 } });
  if (!chilli) {
    chilli = await prisma.product.create({
      data: {
        id: 2,
        sellerId: sellerUser1.id,
        name: 'Spicy Chilli Powder',
        category: 'FOOD',
        price: 80.0,
        stock: 500,
        weight: 0.5,
      }
    });
  }
  let pickle = await prisma.product.findUnique({ where: { id: 3 } });
  if (!pickle) {
    pickle = await prisma.product.create({
      data: {
        id: 3,
        sellerId: sellerUser1.id,
        name: 'Organic Mango Pickle',
        category: 'FOOD',
        price: 150.0,
        stock: 500,
        weight: 1.0,
      }
    });
  }
  
  let gmuPapad = await prisma.product.findFirst({ where: { name: 'Tasty Homemade Papad (GMU)' } });
  if (!gmuPapad) {
    gmuPapad = await prisma.product.create({
      data: {
        id: 8,
        sellerId: gmuHub.id,
        name: 'Tasty Homemade Papad (GMU)',
        category: 'FOOD',
        price: 120.0,
        stock: 500,
        weight: 1.5,
      }
    });
  }
  console.log('Products verified.');

  // Helper to seed order group
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
    shgId: number;
    items: { productId: number; quantity: number; price: number }[];
    deliveryAddress: string;
    totalAmount: number;
  }) {
    console.log(`Seeding Order Group: ${params.orderNumber} (Master ID: ${params.masterOrderId}, Pickup ID: ${params.pickupOrderId})...`);
    
    // Create Master Order
    await prisma.masterOrder.create({
      data: {
        id: params.masterOrderId,
        orderNumber: params.orderNumber,
        buyerId: params.buyerId,
        totalAmount: params.totalAmount,
        paymentStatus: 'PENDING',
        paymentMethod: 'COD',
        status: 'PROCESSING',
        items: {
          create: params.items.map(item => ({
            productId: item.productId,
            sellerId: params.sellerId,
            quantity: item.quantity,
            price: item.price,
          }))
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
        shgId: params.shgId,
        transporterId: transporter!.id,
        status: params.pickupStatus as any,
        pickupTime: params.pickupTime ? new Date(params.pickupTime) : null,
        handoverCode: params.handoverCode,
        items: {
          create: params.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        }
      }
    });

    // Create Drop Order
    const dropOrder = await prisma.dropOrder.create({
      data: {
        masterOrderId: params.masterOrderId,
        buyerId: params.buyerId,
        shgId: params.shgId,
        transporterId: transporter!.id,
        dropOrderNumber: `DRP-${params.orderNumber}`,
        status: params.dropStatus as any,
        deliveryAddress: params.deliveryAddress,
        handoverCode: params.handoverCode ? '5678' : null,
        items: {
          create: params.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        }
      }
    });

    // Seed Tracking Entries
    await prisma.pickupTracking.create({
      data: {
        pickupOrderId: params.pickupOrderId,
        status: params.pickupStatus as any,
        remarks: `Pickup Order seeded as ${params.pickupStatus}.`
      }
    });

    await prisma.dropTracking.create({
      data: {
        dropOrderId: dropOrder.id,
        status: params.dropStatus as any,
        remarks: `Drop Order seeded as ${params.dropStatus}.`
      }
    });
  }

  // ====================================================================
  // 1. Order 61: GMU Hub -> SHG 3 (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 102,
    pickupOrderId: 61,
    orderNumber: 'ORD-1781779335324-PK1',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: gmuHub.id,
    buyerId: shgUser3.id,
    shgId: shgUser3.id,
    items: [
      { productId: gmuPapad.id, quantity: 4, price: 120.0 }
    ],
    deliveryAddress: 'Nesari Gram Panchayat Road',
    totalAmount: 480.0
  });

  // ====================================================================
  // 2. Order 62: SHG 3 -> GMU Hub (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 103,
    pickupOrderId: 62,
    orderNumber: 'ORD-1781779335324-PK2',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser1.id,
    buyerId: gmuHub.id,
    shgId: shgUser3.id,
    items: [
      { productId: 1, quantity: 2, price: 120.0 }
    ],
    deliveryAddress: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
    totalAmount: 240.0
  });

  // ====================================================================
  // 3. Order 63: SHG 3 -> GMU Hub (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 104,
    pickupOrderId: 63,
    orderNumber: 'ORD-1781779335324-PK3',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser1.id,
    buyerId: gmuHub.id,
    shgId: shgUser3.id,
    items: [
      { productId: 2, quantity: 2, price: 80.0 }
    ],
    deliveryAddress: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
    totalAmount: 160.0
  });

  // ====================================================================
  // 4. Order 64: GMU Hub -> SHG 27 (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 105,
    pickupOrderId: 64,
    orderNumber: 'ORD-1781779335324-PK4',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: gmuHub.id,
    buyerId: shgUser27.id,
    shgId: shgUser27.id,
    items: [
      { productId: 2, quantity: 3, price: 80.0 },
      { productId: 3, quantity: 1, price: 150.0 }
    ],
    deliveryAddress: 'Savani Sakhi Center, Wagharale',
    totalAmount: 390.0
  });

  // ====================================================================
  // 5. Order 65: SHG 27 -> GMU Hub (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 106,
    pickupOrderId: 65,
    orderNumber: 'ORD-1781779335324-PK5',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser28.id,
    buyerId: gmuHub.id,
    shgId: shgUser27.id,
    items: [
      { productId: 3, quantity: 1, price: 150.0 }
    ],
    deliveryAddress: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
    totalAmount: 150.0
  });

  // ====================================================================
  // 6. Order 66: GMU Hub -> SHG 3 (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 107,
    pickupOrderId: 66,
    orderNumber: 'ORD-1781779335324-PK6',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: gmuHub.id,
    buyerId: shgUser3.id,
    shgId: shgUser3.id,
    items: [
      { productId: chilli.id, quantity: 5, price: 80.0 }
    ],
    deliveryAddress: 'Nesari Gram Panchayat Road',
    totalAmount: 400.0
  });

  // ====================================================================
  // 7. Order 67: SHG 27 -> GMU Hub (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 108,
    pickupOrderId: 67,
    orderNumber: 'ORD-1781779335324-PK7',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser28.id,
    buyerId: gmuHub.id,
    shgId: shgUser27.id,
    items: [
      { productId: papad.id, quantity: 3, price: 120.0 }
    ],
    deliveryAddress: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
    totalAmount: 360.0
  });

  // ====================================================================
  // 8. Order 68: GMU Hub -> SHG 27 (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 109,
    pickupOrderId: 68,
    orderNumber: 'ORD-1781779335324-PK8',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: gmuHub.id,
    buyerId: shgUser27.id,
    shgId: shgUser27.id,
    items: [
      { productId: pickle.id, quantity: 2, price: 150.0 }
    ],
    deliveryAddress: 'Savani Sakhi Center, Wagharale',
    totalAmount: 300.0
  });

  // ====================================================================
  // 9. Order 69: SHG 3 -> GMU Hub (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 110,
    pickupOrderId: 69,
    orderNumber: 'ORD-1781779335324-PK9',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: sellerUser1.id,
    buyerId: gmuHub.id,
    shgId: shgUser3.id,
    items: [
      { productId: chilli.id, quantity: 4, price: 80.0 }
    ],
    deliveryAddress: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
    totalAmount: 320.0
  });

  // ====================================================================
  // 10. Order 70: GMU Hub -> SHG 3 (PENDING)
  // ====================================================================
  await seedOrderGroup({
    masterOrderId: 111,
    pickupOrderId: 70,
    orderNumber: 'ORD-1781779335324-PK10',
    pickupStatus: 'PENDING',
    dropStatus: 'PENDING',
    pickupTime: null,
    handoverCode: null,
    sellerId: gmuHub.id,
    buyerId: shgUser3.id,
    shgId: shgUser3.id,
    items: [
      { productId: pickle.id, quantity: 1, price: 150.0 }
    ],
    deliveryAddress: 'Nesari Gram Panchayat Road',
    totalAmount: 150.0
  });

  // Reset auto-increment sequences so future DB operations do not fail
  console.log('Resetting auto-increment sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('pickup_orders', 'id'), coalesce(max(id), 1)) FROM pickup_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('drop_orders', 'id'), coalesce(max(id), 1)) FROM drop_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('master_orders', 'id'), coalesce(max(id), 1)) FROM master_orders;`);

  console.log('--- ALL TARGET FRESH PENDING ORDERS SEEDED ---');
  console.log('Transporter: 9876543211 (ID: ' + transporter.id + ')');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
