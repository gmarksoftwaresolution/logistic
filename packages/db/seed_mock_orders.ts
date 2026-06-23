process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";

import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING CLEAN MOCK ORDERS SEED SCRIPT ---');

  // 1. Clean up existing mock/test orders to start fresh
  console.log('Wiping old orders to start with a clean state...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE pickup_tracking, drop_tracking, pickup_order_items, pickup_orders, drop_order_items, drop_orders, master_order_items, master_orders CASCADE;`);
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
  console.log('Ensuring Products exist...');
  const productNames = [
    'Tasty Homemade Papad',
    'Spicy Chilli Powder',
    'Organic Mango Pickle',
    'Premium Wheat Flour',
    'Pure Cow Ghee'
  ];
  const productWeights = [1.5, 0.5, 1.0, 5.0, 1.0];
  const productPrices = [120.0, 80.0, 150.0, 250.0, 600.0];
  const products: any[] = [];

  for (let idx = 0; idx < productNames.length; idx++) {
    let prod = await prisma.product.findFirst({
      where: { name: productNames[idx] }
    });
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          sellerId: seller.id,
          name: productNames[idx],
          category: 'FOOD',
          price: productPrices[idx],
          stock: 500,
          weight: productWeights[idx],
        }
      });
      console.log('Created new Product:', prod.name);
    } else {
      console.log('Product already exists:', prod.name);
    }
    products.push(prod);
  }

  // 5. Ensure target SHG (7777777777) exists
  console.log('Ensuring target SHG (7777777777) exists...');
  let targetShg = await prisma.user.findFirst({
    where: { phoneNumber: '7777777777', role: UserRole.SHG }
  });

  if (!targetShg) {
    targetShg = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '7777777777',
        role: UserRole.SHG,
        fullName: 'Mahadev (SHG Leader)',
        isVerified: true,
        address: {
          create: {
            addressLine1: 'Gram Panchayat Marg',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
          }
        },
        shgDetail: {
          create: {
            shgName: 'Nesari Bachat Gat',
            shgLeaderName: 'Mahadev',
            shgLeaderContact: '7777777777',
            groupSize: 12,
          }
        }
      }
    });
    console.log('Created new target SHG user:', targetShg.fullName);
  } else {
    console.log('Found existing target SHG User:', targetShg.fullName);
  }

  // 6. Ensure Transporter User 9999999999 is fully seeded with all fields
  console.log('Ensuring Transporter User 9999999999 is fully seeded with all fields...');
  
  const existingTransporter = await prisma.user.findUnique({
    where: { phoneNumber: '9999999999' }
  });

  let targetTransporter;

  if (existingTransporter) {
    console.log('Resetting relations for existing Transporter User to perform clean seed...');
    await prisma.address.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.bankDetail.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.document.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.vehicle.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.transporterDetail.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.drivingDetail.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.routeDetail.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.milkVanDetail.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.application.deleteMany({ where: { userId: existingTransporter.id } });
    await prisma.stepTracking.deleteMany({ where: { userId: existingTransporter.id } });

    targetTransporter = await prisma.user.update({
      where: { id: existingTransporter.id },
      data: {
        role: UserRole.TRANSPORTER,
        fullName: 'Mahendra Powar',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        language: 'English',
        isVerified: true,
        currentStep: 6,
        profileCompletion: 100,
        applicationStatus: 'APPROVED',
        ...(!existingTransporter.uniqueCode ? { uniqueCode: 'TRP-' + Math.floor(100000 + Math.random() * 900000) } : {}),
        approvedAt: new Date(),
        
        address: {
          create: {
            addressLine1: 'Shivaji Chowk, Main Road',
            addressLine2: 'Near Gram Panchayat',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
            landmark: 'Water Tank',
            latitude: 16.0333,
            longitude: 74.3333,
          }
        },
        
        bankDetails: {
          create: {
            accountHolderName: 'Mahendra Powar',
            bankName: 'State Bank of India',
            accountNumber: '32109876543',
            ifscCode: 'SBIN0001234',
            branchName: 'Nesari Branch',
            upiId: 'mahendra@sbi',
            isVerified: true,
          }
        },
        
        documents: {
          create: {
            aadhaarNumber: '123456789012',
            panNumber: 'ABCDE1234F',
            drivingLicenseNo: 'MH-09-2023-1234567',
            aadhaarFrontUrl: '/uploads/license_placeholder.png',
            aadhaarBackUrl: '/uploads/license_placeholder.png',
            panCardUrl: '/uploads/license_placeholder.png',
            drivingLicenseUrl: '/uploads/license_placeholder.png',
          }
        },
        
        vehicles: {
          create: {
            vehicleType: 'FOUR_WHEELER',
            vehicleName: 'Mahindra Bolero Pickup',
            registrationNumber: 'MH-09-EQ-4321',
            licenseNumber: 'MH-09-2023-1234567',
            rcUrl: '/uploads/rc_book_placeholder.png',
            insuranceUrl: '/uploads/insurance_placeholder.png',
            vehicleImageUrl: '/uploads/rc_book_placeholder.png',
          }
        },
        
        transporterDetail: {
          create: {
            transporterCode: 'TRP-M-50',
            vehicleCategory: 'FOUR_WHEELER',
            experienceYears: 5,
            availableFullTime: true,
          }
        },
        
        drivingDetail: {
          create: {
            licenseNumber: 'MH-09-2023-1234567',
            expiryDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
            drivingExperience: 5,
          }
        },
        
        routeDetail: {
          create: {
            operatingArea: 'Gadhinglaj and surrounding talukas',
            pickupLocations: JSON.stringify(['Nesari', 'Koulage', 'Hingalaj']),
            dropLocations: JSON.stringify(['Gadhinglaj Hub', 'Kolhapur City']),
            workingDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
            workingSchedule: JSON.stringify({ shift: 'Morning', hours: '08:00 - 18:00' }),
          }
        },
        
        milkVanDetail: {
          create: {
            sangathanName: 'Warna Dairy Sangathan',
            centerName: 'Nesari Center',
            assignedVillages: JSON.stringify(['Nesari', 'Koulage']),
            morningShiftTime: '06:00 - 09:00',
            eveningShiftTime: '17:00 - 20:00',
          }
        },
        
        applications: {
          create: {
            status: 'APPROVED',
            reviewedBy: 'Admin',
            approvedAt: new Date(),
          }
        },
        
        stepTracking: {
          createMany: {
            data: [
              { step: 1, status: 'COMPLETED', data: JSON.stringify({ role: 'TRANSPORTER' }) },
              { step: 2, status: 'COMPLETED', data: JSON.stringify({ personalInfo: 'done' }) },
              { step: 3, status: 'COMPLETED', data: JSON.stringify({ address: 'done' }) },
              { step: 4, status: 'COMPLETED', data: JSON.stringify({ vehicle: 'done' }) },
              { step: 5, status: 'COMPLETED', data: JSON.stringify({ route: 'done' }) },
              { step: 6, status: 'COMPLETED', data: JSON.stringify({ bankAndDocs: 'done' }) },
            ]
          }
        }
      }
    });
  } else {
    targetTransporter = await prisma.user.create({
      data: {
        authId: randomUUID(),
        phoneNumber: '9999999999',
        role: UserRole.TRANSPORTER,
        fullName: 'Mahendra Powar',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        language: 'English',
        isVerified: true,
        currentStep: 6,
        profileCompletion: 100,
        applicationStatus: 'APPROVED',
        uniqueCode: 'TRP-' + Math.floor(100000 + Math.random() * 900000),
        approvedAt: new Date(),
        
        address: {
          create: {
            addressLine1: 'Shivaji Chowk, Main Road',
            addressLine2: 'Near Gram Panchayat',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
            landmark: 'Water Tank',
            latitude: 16.0333,
            longitude: 74.3333,
          }
        },
        
        bankDetails: {
          create: {
            accountHolderName: 'Mahendra Powar',
            bankName: 'State Bank of India',
            accountNumber: '32109876543',
            ifscCode: 'SBIN0001234',
            branchName: 'Nesari Branch',
            upiId: 'mahendra@sbi',
            isVerified: true,
          }
        },
        
        documents: {
          create: {
            aadhaarNumber: '123456789012',
            panNumber: 'ABCDE1234F',
            drivingLicenseNo: 'MH-09-2023-1234567',
            aadhaarFrontUrl: '/uploads/license_placeholder.png',
            aadhaarBackUrl: '/uploads/license_placeholder.png',
            panCardUrl: '/uploads/license_placeholder.png',
            drivingLicenseUrl: '/uploads/license_placeholder.png',
          }
        },
        
        vehicles: {
          create: {
            vehicleType: 'FOUR_WHEELER',
            vehicleName: 'Mahindra Bolero Pickup',
            registrationNumber: 'MH-09-EQ-4321',
            licenseNumber: 'MH-09-2023-1234567',
            rcUrl: '/uploads/rc_book_placeholder.png',
            insuranceUrl: '/uploads/insurance_placeholder.png',
            vehicleImageUrl: '/uploads/rc_book_placeholder.png',
          }
        },
        
        transporterDetail: {
          create: {
            transporterCode: 'TRP-M-50',
            vehicleCategory: 'FOUR_WHEELER',
            experienceYears: 5,
            availableFullTime: true,
          }
        },
        
        drivingDetail: {
          create: {
            licenseNumber: 'MH-09-2023-1234567',
            expiryDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
            drivingExperience: 5,
          }
        },
        
        routeDetail: {
          create: {
            operatingArea: 'Gadhinglaj and surrounding talukas',
            pickupLocations: JSON.stringify(['Nesari', 'Koulage', 'Hingalaj']),
            dropLocations: JSON.stringify(['Gadhinglaj Hub', 'Kolhapur City']),
            workingDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
            workingSchedule: JSON.stringify({ shift: 'Morning', hours: '08:00 - 18:00' }),
          }
        },
        
        milkVanDetail: {
          create: {
            sangathanName: 'Warna Dairy Sangathan',
            centerName: 'Nesari Center',
            assignedVillages: JSON.stringify(['Nesari', 'Koulage']),
            morningShiftTime: '06:00 - 09:00',
            eveningShiftTime: '17:00 - 20:00',
          }
        },
        
        applications: {
          create: {
            status: 'APPROVED',
            reviewedBy: 'Admin',
            approvedAt: new Date(),
          }
        },
        
        stepTracking: {
          createMany: {
            data: [
              { step: 1, status: 'COMPLETED', data: JSON.stringify({ role: 'TRANSPORTER' }) },
              { step: 2, status: 'COMPLETED', data: JSON.stringify({ personalInfo: 'done' }) },
              { step: 3, status: 'COMPLETED', data: JSON.stringify({ address: 'done' }) },
              { step: 4, status: 'COMPLETED', data: JSON.stringify({ vehicle: 'done' }) },
              { step: 5, status: 'COMPLETED', data: JSON.stringify({ route: 'done' }) },
              { step: 6, status: 'COMPLETED', data: JSON.stringify({ bankAndDocs: 'done' }) },
            ]
          }
        }
      }
    });
  }

  console.log(`Found SHG User: ${targetShg.fullName} (ID: ${targetShg.id})`);
  console.log(`Found Transporter User: ${targetTransporter.fullName} (ID: ${targetTransporter.id})`);

  // 6. Generate test orders for this specific pair
  console.log('Generating customized mock orders...');

  // 6.1 Create/Ensure additional Sellers
  const sellersData = [
    { phoneNumber: '8888888881', fullName: 'Kamal Bai (SHG Lead)', village: 'Nesari', addressLine1: 'Near Maruti Mandir, Nesari' },
    { phoneNumber: '8888888882', fullName: 'Aruna Patil (SHG Member)', village: 'Koulage', addressLine1: 'Shivaji Chowk, Koulage' },
    { phoneNumber: '8888888883', fullName: 'Sunita Deshmukh (SHG Lead)', village: 'Nesari', addressLine1: 'Gram Panchayat Road, Nesari' },
    { phoneNumber: '8888888884', fullName: 'Sujata Sawant (SHG Member)', village: 'Hingalaj', addressLine1: 'Bazar Peth, Hingalaj' },
    { phoneNumber: '8888888885', fullName: 'Vandana Jadhav (SHG Lead)', village: 'Nesari', addressLine1: 'Station Road, Nesari' }
  ];
  const seededSellers: any[] = [];
  for (const sData of sellersData) {
    let s = await prisma.user.findUnique({ where: { phoneNumber: sData.phoneNumber }, include: { address: true } });
    if (!s) {
      s = await prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: sData.phoneNumber,
          role: UserRole.SELLER,
          fullName: sData.fullName,
          isVerified: true,
          address: {
            create: {
              addressLine1: sData.addressLine1,
              village: sData.village,
              taluka: 'Gadhinglaj',
              district: 'Kolhapur',
              state: 'Maharashtra',
              pincode: '416504'
            }
          }
        },
        include: { address: true }
      });
    }
    seededSellers.push(s);
  }

  // 6.2 Create/Ensure additional Buyers
  const buyersData = [
    { phoneNumber: '9999999991', fullName: 'Raju Patil (Buyer)', village: 'Nesari', addressLine1: 'Plot No 24, Nesari Stand Area' },
    { phoneNumber: '9999999992', fullName: 'Aniket Powar (Buyer)', village: 'Gadhinglaj', addressLine1: 'Ganesh Nagar, Gadhinglaj' },
    { phoneNumber: '9999999993', fullName: 'Dipak Mane (Buyer)', village: 'Gadhinglaj', addressLine1: 'Pragati Colony, Gadhinglaj' },
    { phoneNumber: '9999999994', fullName: 'Sanjay Shinde (Buyer)', village: 'Nesari', addressLine1: 'Naka Chowk, Nesari' },
    { phoneNumber: '9999999995', fullName: 'Rahul Koli (Buyer)', village: 'Gadhinglaj', addressLine1: 'Market Yard, Gadhinglaj' }
  ];
  const seededBuyers: any[] = [];
  for (const bData of buyersData) {
    let b = await prisma.user.findUnique({ where: { phoneNumber: bData.phoneNumber }, include: { address: true } });
    if (!b) {
      b = await prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: bData.phoneNumber,
          role: UserRole.BUYER,
          fullName: bData.fullName,
          isVerified: true,
          address: {
            create: {
              addressLine1: bData.addressLine1,
              village: bData.village,
              taluka: 'Gadhinglaj',
              district: 'Kolhapur',
              state: 'Maharashtra',
              pincode: '416504'
            }
          }
        },
        include: { address: true }
      });
    }
    seededBuyers.push(b);
  }

  // Create 5 separate consolidated Pickup Orders
  console.log('Generating 5 consolidated Pickup MasterOrders and correlated DropOrders...');
  for (let i = 0; i < 5; i++) {
    const sel = seededSellers[i];
    const buy = seededBuyers[i];
    const orderNo = `ORD-${Date.now().toString().slice(-6)}-P-${i + 1}`;
    
    // Pick 2-3 products
    const itemCount = 2 + (i % 2); // 2 or 3
    const orderProds = products.slice(0, itemCount);
    
    const itemsData = orderProds.map((prod, idx) => ({
      productId: prod.id,
      sellerId: sel.id,
      quantity: idx + 2,
      price: prod.price,
    }));
    const totalAmount = itemsData.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: orderNo,
        buyerId: buy.id,
        totalAmount,
        paymentStatus: 'PENDING',
        status: 'CREATED',
        items: {
          create: itemsData.map(item => ({
            productId: item.productId,
            sellerId: item.sellerId,
            quantity: item.quantity,
            price: item.price,
          }))
        }
      }
    });

    const pickupOrder = await prisma.pickupOrder.create({
      data: {
        pickupOrderNumber: `PKP-${orderNo}`,
        masterOrderId: masterOrder.id,
        sellerId: sel.id,
        shgId: targetShg.id,
        transporterId: targetTransporter.id,
        status: 'PENDING',
        items: {
          create: itemsData.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        }
      }
    });
    console.log(`  -> Created Pickup Order #${i + 1}: ${pickupOrder.pickupOrderNumber}`);

    const correlatedDropOrder = await prisma.dropOrder.create({
      data: {
        dropOrderNumber: `DRP-${orderNo}`,
        masterOrderId: masterOrder.id,
        buyerId: buy.id,
        shgId: targetShg.id,
        transporterId: targetTransporter.id,
        status: 'PENDING',
        deliveryAddress: buy.address?.addressLine1 || 'Nesari Stand, Gadhinglaj',
        items: {
          create: itemsData.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        }
      }
    });
    console.log(`     Correlated Drop Order: ${correlatedDropOrder.dropOrderNumber}`);
  }

  // Create 5 separate consolidated standalone Drop Orders
  console.log('Generating 5 consolidated standalone Drop MasterOrders...');
  for (let i = 0; i < 5; i++) {
    const sel = seededSellers[(i + 1) % 5];
    const buy = seededBuyers[(i + 2) % 5];
    const orderNo = `ORD-${Date.now().toString().slice(-6)}-D-${i + 1}`;
    
    // Pick 2-3 products
    const itemCount = 2 + ((i + 1) % 2); // 2 or 3
    const orderProds = products.slice(2, 2 + itemCount);
    
    const itemsData = orderProds.map((prod, idx) => ({
      productId: prod.id,
      sellerId: sel.id,
      quantity: idx + 3,
      price: prod.price,
    }));
    const totalAmount = itemsData.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: orderNo,
        buyerId: buy.id,
        totalAmount,
        paymentStatus: 'PENDING',
        status: 'CREATED',
        items: {
          create: itemsData.map(item => ({
            productId: item.productId,
            sellerId: item.sellerId,
            quantity: item.quantity,
            price: item.price,
          }))
        }
      }
    });

    const dropOrder = await prisma.dropOrder.create({
      data: {
        dropOrderNumber: `DRP-${orderNo}`,
        masterOrderId: masterOrder.id,
        buyerId: buy.id,
        shgId: targetShg.id,
        transporterId: targetTransporter.id,
        status: 'PENDING',
        deliveryAddress: buy.address?.addressLine1 || 'Gadhinglaj Hub Market',
        items: {
          create: itemsData.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        }
      }
    });
    console.log(`  -> Created standalone Drop Order #${i + 1}: ${dropOrder.dropOrderNumber}`);
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
