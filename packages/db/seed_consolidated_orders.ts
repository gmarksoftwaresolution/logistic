process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient, UserRole, ApplicationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING CONSOLIDATED ORDERS SEEDING SCRIPT ---');

  // 1. Clean up all order data
  console.log('Cleaning up existing order data...');
  await prisma.pickupTracking.deleteMany();
  await prisma.dropTracking.deleteMany();
  await prisma.pickupOrderItem.deleteMany();
  await prisma.pickupOrder.deleteMany();
  await prisma.dropOrderItem.deleteMany();
  await prisma.dropOrder.deleteMany();
  await prisma.masterOrderItem.deleteMany();
  await prisma.masterOrder.deleteMany();
  console.log('Database wiped successfully.');

  // 2. Ensure Users Exist
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

  // Ensure SHG 1 & Seller 1 Exist (Nesari Bachat Gat)
  console.log('Ensuring SHG 1 leader user 7777777777 exists...');
  let shgUser1 = await prisma.user.findUnique({ where: { phoneNumber: '7777777777' } });
  if (!shgUser1) {
    shgUser1 = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '7777777777',
        role: UserRole.SHG,
        fullName: 'Mahadev (SHG Leader 1)',
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
  }

  let shgDetail1 = await prisma.shgDetail.findUnique({ where: { userId: shgUser1.id } });
  if (!shgDetail1) {
    await prisma.shgDetail.create({
      data: {
        userId: shgUser1.id,
        shgName: 'Nesari Bachat Gat',
        shgLeaderName: 'Mahadev',
        shgLeaderContact: '7777777777',
        groupSize: 12
      }
    });
  }

  let sellerUser1 = await prisma.user.findUnique({ where: { phoneNumber: '8888888888' } });
  if (!sellerUser1) {
    sellerUser1 = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '8888888888',
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller 1)',
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
  }

  // Ensure SHG 2 & Seller 2 Exist (Savani Bachat Gat)
  console.log('Ensuring SHG 2 leader user 7777777776 exists...');
  let shgUser2 = await prisma.user.findUnique({ where: { phoneNumber: '7777777776' } });
  if (!shgUser2) {
    shgUser2 = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '7777777776',
        role: UserRole.SHG,
        fullName: 'Savita (SHG Leader 2)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
        address: {
          create: {
            addressLine1: 'Savani Panchayat Ground',
            village: 'Wagharale',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      }
    });
  }

  let shgDetail2 = await prisma.shgDetail.findUnique({ where: { userId: shgUser2.id } });
  if (!shgDetail2) {
    await prisma.shgDetail.create({
      data: {
        userId: shgUser2.id,
        shgName: 'Savani Bachat Gat',
        shgLeaderName: 'Savita',
        shgLeaderContact: '7777777776',
        groupSize: 10
      }
    });
  }

  let sellerUser2 = await prisma.user.findUnique({ where: { phoneNumber: '8888888886' } });
  if (!sellerUser2) {
    sellerUser2 = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '8888888886',
        role: UserRole.SELLER,
        fullName: 'Mahila Bachat Gat (Sakhi Seller 2)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
        address: {
          create: {
            addressLine1: 'Savani Sakhi Center',
            village: 'Wagharale',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        }
      }
    });
  }

  // Ensure Buyers Exist
  console.log('Ensuring buyer user 9999999991 exists...');
  let buyerUser1 = await prisma.user.findUnique({ where: { phoneNumber: '9999999991' } });
  if (!buyerUser1) {
    buyerUser1 = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999991',
        role: UserRole.BUYER,
        fullName: 'Raju Patil (Buyer 1)',
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

  console.log('Ensuring buyer user 9999999993 exists...');
  let buyerUser2 = await prisma.user.findUnique({ where: { phoneNumber: '9999999993' } });
  if (!buyerUser2) {
    buyerUser2 = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999993',
        role: UserRole.BUYER,
        fullName: 'Amit Patil (Buyer 2)',
        isVerified: true,
        applicationStatus: ApplicationStatus.APPROVED,
        address: {
          create: {
            addressLine1: 'Block C, Ganesh Chowk',
            village: 'Mahagaon',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416502',
          }
        }
      }
    });
  }

  // 3. Ensure Products Exist
  console.log('Ensuring products exist...');
  let papad = await prisma.product.findFirst({ where: { name: 'Tasty Homemade Papad' } });
  if (!papad) {
    papad = await prisma.product.create({
      data: {
        sellerId: sellerUser1.id,
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
        sellerId: sellerUser1.id,
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
        sellerId: sellerUser1.id,
        name: 'Organic Mango Pickle',
        category: 'FOOD',
        price: 150.0,
        stock: 500,
        weight: 1.0,
      }
    });
  }

  const baseNo = `ORD-${Date.now()}`;

  // ==========================================
  // SEEDING PICKUPS (SHG TO HUB) - PENDING (Appears in New Orders)
  // ==========================================

  // --- SHG 1: Nesari Bachat Gat ---
  // Order 1: Many items pickup
  const mo1 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-PK1`,
      buyerId: buyerUser1.id,
      totalAmount: 830.0,
      status: 'PROCESSING',
      items: {
        create: [
          { productId: papad.id, sellerId: sellerUser1.id, quantity: 2, price: 120.0 },
          { productId: chilli.id, sellerId: sellerUser1.id, quantity: 4, price: 80.0 },
          { productId: pickle.id, sellerId: sellerUser1.id, quantity: 1, price: 150.0 }
        ]
      }
    }
  });
  await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${baseNo}-PK1`,
      masterOrderId: mo1.id,
      sellerId: sellerUser1.id,
      shgId: shgUser1.id,
      transporterId: transporter.id,
      status: 'PENDING',
      handoverCode: '1234',
      items: {
        create: [
          { productId: papad.id, quantity: 2 },
          { productId: chilli.id, quantity: 4 },
          { productId: pickle.id, quantity: 1 }
        ]
      }
    }
  });

  // Order 2: Single item pickup (Papad)
  const mo2 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-PK2`,
      buyerId: buyerUser1.id,
      totalAmount: 240.0,
      status: 'PROCESSING',
      items: {
        create: [{ productId: papad.id, sellerId: sellerUser1.id, quantity: 2, price: 120.0 }]
      }
    }
  });
  await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${baseNo}-PK2`,
      masterOrderId: mo2.id,
      sellerId: sellerUser1.id,
      shgId: shgUser1.id,
      transporterId: transporter.id,
      status: 'PENDING',
      handoverCode: '1234',
      items: {
        create: [{ productId: papad.id, quantity: 2 }]
      }
    }
  });

  // Order 3: Single item pickup (Chilli)
  const mo3 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-PK3`,
      buyerId: buyerUser1.id,
      totalAmount: 160.0,
      status: 'PROCESSING',
      items: {
        create: [{ productId: chilli.id, sellerId: sellerUser1.id, quantity: 2, price: 80.0 }]
      }
    }
  });
  await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${baseNo}-PK3`,
      masterOrderId: mo3.id,
      sellerId: sellerUser1.id,
      shgId: shgUser1.id,
      transporterId: transporter.id,
      status: 'PENDING',
      handoverCode: '1234',
      items: {
        create: [{ productId: chilli.id, quantity: 2 }]
      }
    }
  });

  // --- SHG 2: Savani Bachat Gat ---
  // Order 4: Many items pickup
  const mo4 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-PK4`,
      buyerId: buyerUser2.id,
      totalAmount: 390.0,
      status: 'PROCESSING',
      items: {
        create: [
          { productId: chilli.id, sellerId: sellerUser2.id, quantity: 3, price: 80.0 },
          { productId: pickle.id, sellerId: sellerUser2.id, quantity: 1, price: 150.0 }
        ]
      }
    }
  });
  await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${baseNo}-PK4`,
      masterOrderId: mo4.id,
      sellerId: sellerUser2.id,
      shgId: shgUser2.id,
      transporterId: transporter.id,
      status: 'PENDING',
      handoverCode: '1234',
      items: {
        create: [
          { productId: chilli.id, quantity: 3 },
          { productId: pickle.id, quantity: 1 }
        ]
      }
    }
  });

  // Order 5: Single item pickup (Pickle)
  const mo5 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-PK5`,
      buyerId: buyerUser2.id,
      totalAmount: 150.0,
      status: 'PROCESSING',
      items: {
        create: [{ productId: pickle.id, sellerId: sellerUser2.id, quantity: 1, price: 150.0 }]
      }
    }
  });
  await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${baseNo}-PK5`,
      masterOrderId: mo5.id,
      sellerId: sellerUser2.id,
      shgId: shgUser2.id,
      transporterId: transporter.id,
      status: 'PENDING',
      handoverCode: '1234',
      items: {
        create: [{ productId: pickle.id, quantity: 1 }]
      }
    }
  });


  // ==========================================
  // SEEDING DROPS (HUB TO BUYER) - PENDING (Appears in New Orders)
  // ==========================================

  // --- Hub 1: Gadhinglaj Hub ---
  // Order 6: Many items drop
  const mo6 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-DR6`,
      buyerId: buyerUser1.id,
      totalAmount: 670.0,
      status: 'PROCESSING',
      items: {
        create: [
          { productId: papad.id, sellerId: sellerUser1.id, quantity: 2, price: 120.0 },
          { productId: chilli.id, sellerId: sellerUser1.id, quantity: 2, price: 80.0 },
          { productId: pickle.id, sellerId: sellerUser1.id, quantity: 1, price: 150.0 }
        ]
      }
    }
  });
  await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${baseNo}-DR6`,
      masterOrderId: mo6.id,
      buyerId: buyerUser1.id,
      shgId: shgUser1.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'Plot No 24, Nesari Stand Area',
      handoverCode: '1234',
      items: {
        create: [
          { productId: papad.id, quantity: 2 },
          { productId: chilli.id, quantity: 2 },
          { productId: pickle.id, quantity: 1 }
        ]
      }
    }
  });

  // Order 7: Single item drop (Papad)
  const mo7 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-DR7`,
      buyerId: buyerUser1.id,
      totalAmount: 120.0,
      status: 'PROCESSING',
      items: {
        create: [{ productId: papad.id, sellerId: sellerUser1.id, quantity: 1, price: 120.0 }]
      }
    }
  });
  await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${baseNo}-DR7`,
      masterOrderId: mo7.id,
      buyerId: buyerUser1.id,
      shgId: shgUser1.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'Plot No 24, Nesari Stand Area',
      handoverCode: '1234',
      items: {
        create: [{ productId: papad.id, quantity: 1 }]
      }
    }
  });

  // Order 8: Single item drop (Chilli)
  const mo8 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-DR8`,
      buyerId: buyerUser1.id,
      totalAmount: 80.0,
      status: 'PROCESSING',
      items: {
        create: [{ productId: chilli.id, sellerId: sellerUser1.id, quantity: 1, price: 80.0 }]
      }
    }
  });
  await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${baseNo}-DR8`,
      masterOrderId: mo8.id,
      buyerId: buyerUser1.id,
      shgId: shgUser1.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'Plot No 24, Nesari Stand Area',
      handoverCode: '1234',
      items: {
        create: [{ productId: chilli.id, quantity: 1 }]
      }
    }
  });

  // --- Hub 2: Central Hub GMU ---
  // Order 9: Many items drop
  const mo9 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-DR9`,
      buyerId: buyerUser2.id,
      totalAmount: 510.0,
      status: 'PROCESSING',
      items: {
        create: [
          { productId: papad.id, sellerId: sellerUser2.id, quantity: 3, price: 120.0 },
          { productId: pickle.id, sellerId: sellerUser2.id, quantity: 1, price: 150.0 }
        ]
      }
    }
  });
  await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${baseNo}-DR9`,
      masterOrderId: mo9.id,
      buyerId: buyerUser2.id,
      shgId: shgUser2.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'Central Hub GMU, Midc Area',
      handoverCode: '1234',
      items: {
        create: [
          { productId: papad.id, quantity: 3 },
          { productId: pickle.id, quantity: 1 }
        ]
      }
    }
  });

  // Order 10: Single item drop (Pickle)
  const mo10 = await prisma.masterOrder.create({
    data: {
      orderNumber: `${baseNo}-DR10`,
      buyerId: buyerUser2.id,
      totalAmount: 300.0,
      status: 'PROCESSING',
      items: {
        create: [{ productId: pickle.id, sellerId: sellerUser2.id, quantity: 2, price: 150.0 }]
      }
    }
  });
  await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${baseNo}-DR10`,
      masterOrderId: mo10.id,
      buyerId: buyerUser2.id,
      shgId: shgUser2.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'Central Hub GMU, Midc Area',
      handoverCode: '1234',
      items: {
        create: [{ productId: pickle.id, quantity: 2 }]
      }
    }
  });

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  console.log('Seeded 10 active PENDING orders.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
