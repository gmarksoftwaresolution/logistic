process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING TRANSPORTER SEEDING SCRIPT ---');

  // 1. Ensure Transporter User exists
  console.log('Ensuring Transporter User exists (phone: 9999999999)...');
  let targetTransporter = await prisma.user.findUnique({
    where: { phoneNumber: '9999999999' }
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
    if (targetTransporter.role !== UserRole.TRANSPORTER) {
      targetTransporter = await prisma.user.update({
        where: { id: targetTransporter.id },
        data: { role: UserRole.TRANSPORTER }
      });
      console.log('Updated existing user role to TRANSPORTER:', targetTransporter.fullName);
    } else {
      console.log('Found Transporter User:', targetTransporter.fullName);
    }
  }

  // 2. Clean up existing order data only for this transporter
  console.log(`Cleaning up existing order data for transporter ID ${targetTransporter.id}...`);
  const transporterPickups = await prisma.pickupOrder.findMany({
    where: { transporterId: targetTransporter.id },
    select: { masterOrderId: true }
  });
  const transporterDrops = await prisma.dropOrder.findMany({
    where: { transporterId: targetTransporter.id },
    select: { masterOrderId: true }
  });

  const masterOrderIds = Array.from(new Set([
    ...transporterPickups.map(p => p.masterOrderId),
    ...transporterDrops.map(d => d.masterOrderId)
  ]));

  if (masterOrderIds.length > 0) {
    const allRelatedPickups = await prisma.pickupOrder.findMany({
      where: { masterOrderId: { in: masterOrderIds } },
      select: { id: true }
    });
    const allRelatedDrops = await prisma.dropOrder.findMany({
      where: { masterOrderId: { in: masterOrderIds } },
      select: { id: true }
    });

    const relatedPickupIds = allRelatedPickups.map(p => p.id);
    const relatedDropIds = allRelatedDrops.map(d => d.id);

    if (relatedPickupIds.length > 0) {
      await prisma.pickupTracking.deleteMany({
        where: { pickupOrderId: { in: relatedPickupIds } }
      });
      await prisma.pickupOrderItem.deleteMany({
        where: { pickupOrderId: { in: relatedPickupIds } }
      });
      await prisma.pickupOrder.deleteMany({
        where: { id: { in: relatedPickupIds } }
      });
    }

    if (relatedDropIds.length > 0) {
      await prisma.dropTracking.deleteMany({
        where: { dropOrderId: { in: relatedDropIds } }
      });
      await prisma.dropOrderItem.deleteMany({
        where: { dropOrderId: { in: relatedDropIds } }
      });
      await prisma.dropOrder.deleteMany({
        where: { id: { in: relatedDropIds } }
      });
    }

    await prisma.masterOrderItem.deleteMany({
      where: { masterOrderId: { in: masterOrderIds } }
    });
    await prisma.masterOrder.deleteMany({
      where: { id: { in: masterOrderIds } }
    });
  }
  console.log('Existing orders for this transporter deleted successfully.');

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
  let targetShg = await prisma.user.findUnique({
    where: { phoneNumber: '7777777777' }
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
    if (targetShg.role !== UserRole.SHG) {
      targetShg = await prisma.user.update({
        where: { id: targetShg.id },
        data: { role: UserRole.SHG }
      });
      console.log('Updated existing user role to SHG:', targetShg.fullName);
    } else {
      console.log('Found SHG User:', targetShg.fullName);
    }
  }

  // Transporter checked at the beginning of the script.

  // 5b. Ensure GMU Hub User exists
  console.log('Ensuring GMU Hub User exists (phone: 9999999992)...');
  let gmuHub = await prisma.user.findUnique({
    where: { phoneNumber: '9999999992' },
    include: { address: true }
  });
  if (!gmuHub) {
    gmuHub = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999992',
        role: UserRole.SELLER,
        fullName: 'Central GMU Hub',
        isVerified: true,
        address: {
          create: {
            addressLine1: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
            village: 'Gadhinglaj',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416502',
          }
        }
      },
      include: { address: true }
    });
    console.log('Created new GMU Hub User:', gmuHub.fullName);
  } else {
    gmuHub = await prisma.user.update({
      where: { id: gmuHub.id },
      data: {
        role: UserRole.SELLER,
        fullName: 'Central GMU Hub',
      },
      include: { address: true }
    });
    console.log('Updated existing GMU Hub User:', gmuHub.fullName);
  }

  // Ensure GMU Product exists
  console.log('Ensuring GMU product exists...');
  let gmuProduct = await prisma.product.findFirst({
    where: { name: 'Tasty Homemade Papad (GMU)' }
  });
  if (!gmuProduct) {
    gmuProduct = await prisma.product.create({
      data: {
        sellerId: gmuHub.id,
        name: 'Tasty Homemade Papad (GMU)',
        category: 'FOOD',
        price: 120.0,
        stock: 500,
        weight: 1.5,
      }
    });
    console.log('Created new GMU Product:', gmuProduct.name);
  } else {
    console.log('GMU Product already exists:', gmuProduct.name);
  }

  const timestamp = Date.now().toString().slice(-4);

  // ====================================================================
  // GMU Hub to SHG Order
  // ====================================================================
  console.log('Seeding GMU Hub to SHG Order...');
  const orderNo = `GMU-SHG-${timestamp}`;
  const masterOrder = await prisma.masterOrder.create({
    data: {
      orderNumber: orderNo,
      buyerId: targetShg.id,
      totalAmount: gmuProduct.price,
      paymentStatus: 'PENDING',
      status: 'CREATED',
      items: {
        create: {
          productId: gmuProduct.id,
          sellerId: gmuHub.id,
          quantity: 1,
          price: gmuProduct.price,
        }
      }
    }
  });

  // Pickup leg: GMU Hub -> SHG
  const pickupOrder = await prisma.pickupOrder.create({
    data: {
      pickupOrderNumber: `PKP-${orderNo}`,
      masterOrderId: masterOrder.id,
      sellerId: gmuHub.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'PENDING',
      items: {
        create: {
          productId: gmuProduct.id,
          quantity: 1,
        }
      }
    }
  });

  // Drop leg: GMU Hub -> SHG
  const dropOrder = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `DRP-${orderNo}`,
      masterOrderId: masterOrder.id,
      buyerId: targetShg.id,
      shgId: targetShg.id,
      transporterId: targetTransporter.id,
      status: 'PENDING',
      deliveryAddress: 'Shanti Mahila SHG Center, Gram Panchayat Road, Halkarni',
      items: {
        create: {
          productId: gmuProduct.id,
          quantity: 1,
        }
      }
    }
  });

  console.log('--- SEEDING COMPLETED ---');
  console.log(`Order (GMU Hub -> SHG) -> PickupOrder ID: ${pickupOrder.id}, DropOrder ID: ${dropOrder.id}`);

  // Reset auto-increment sequences
  console.log('Resetting auto-increment sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('pickup_orders', 'id'), coalesce(max(id), 1)) FROM pickup_orders;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('drop_orders', 'id'), coalesce(max(id), 1)) FROM drop_orders;`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
