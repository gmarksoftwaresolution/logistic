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
            aadhaarFrontUrl: 'https://placehold.co/600x400/png?text=Aadhaar+Front',
            aadhaarBackUrl: 'https://placehold.co/600x400/png?text=Aadhaar+Back',
            panCardUrl: 'https://placehold.co/600x400/png?text=PAN+Card',
            drivingLicenseUrl: 'https://placehold.co/600x400/png?text=Driving+License',
          }
        },
        
        vehicles: {
          create: {
            vehicleType: 'FOUR_WHEELER',
            vehicleName: 'Mahindra Bolero Pickup',
            registrationNumber: 'MH-09-EQ-4321',
            licenseNumber: 'MH-09-2023-1234567',
            rcUrl: 'https://placehold.co/600x400/png?text=RC+Book',
            insuranceUrl: 'https://placehold.co/600x400/png?text=Insurance',
            vehicleImageUrl: 'https://placehold.co/600x400/png?text=Vehicle+Image',
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
            aadhaarFrontUrl: 'https://placehold.co/600x400/png?text=Aadhaar+Front',
            aadhaarBackUrl: 'https://placehold.co/600x400/png?text=Aadhaar+Back',
            panCardUrl: 'https://placehold.co/600x400/png?text=PAN+Card',
            drivingLicenseUrl: 'https://placehold.co/600x400/png?text=Driving+License',
          }
        },
        
        vehicles: {
          create: {
            vehicleType: 'FOUR_WHEELER',
            vehicleName: 'Mahindra Bolero Pickup',
            registrationNumber: 'MH-09-EQ-4321',
            licenseNumber: 'MH-09-2023-1234567',
            rcUrl: 'https://placehold.co/600x400/png?text=RC+Book',
            insuranceUrl: 'https://placehold.co/600x400/png?text=Insurance',
            vehicleImageUrl: 'https://placehold.co/600x400/png?text=Vehicle+Image',
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

  // Generate 5 Pickup Orders
  for (let i = 1; i <= 5; i++) {
    const orderNo = `ORD-${Date.now().toString().slice(-6)}-P${i}-${Math.floor(Math.random() * 100)}`;
    const quantity = i + 1;
    const price = 120.0;
    const totalAmount = quantity * price;

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: orderNo,
        buyerId: buyer.id,
        totalAmount,
        paymentStatus: 'PENDING',
        status: 'CREATED',
        items: {
          create: {
            productId: product.id,
            sellerId: seller.id,
            quantity,
            price,
          }
        }
      }
    });

    const pickupOrder = await prisma.pickupOrder.create({
      data: {
        pickupOrderNumber: `PKP-${orderNo}`,
        masterOrderId: masterOrder.id,
        sellerId: seller.id,
        shgId: targetShg.id,
        transporterId: targetTransporter.id,
        status: 'PENDING',
        items: {
          create: {
            productId: product.id,
            quantity,
          }
        }
      }
    });

    console.log(`  -> Created assigned Pickup Order ${i}: ${pickupOrder.pickupOrderNumber} (ID: ${pickupOrder.id})`);

    const dropPointNamesForPickup = [
      'Nesari Stand, Gadhinglaj',
      'Koulage Crossing, Gadhinglaj',
      'Hingalaj Road Primary School',
      'Wagharale Naka Market',
      'Mahagaon Gram Panchayat'
    ];
    const deliveryAddressForPickup = dropPointNamesForPickup[i - 1] || 'Nesari Stand, Gadhinglaj';

    const correlatedDropOrder = await prisma.dropOrder.create({
      data: {
        dropOrderNumber: `DRP-${orderNo}`,
        masterOrderId: masterOrder.id,
        buyerId: buyer.id,
        shgId: targetShg.id,
        transporterId: targetTransporter.id,
        status: 'PENDING',
        deliveryAddress: deliveryAddressForPickup,
        items: {
          create: {
            productId: product.id,
            quantity,
          }
        }
      }
    });
    console.log(`  -> Created correlated Drop Order for Pickup ${i}: ${correlatedDropOrder.dropOrderNumber} (ID: ${correlatedDropOrder.id})`);
  }

  // Generate 5 Drop Orders
  for (let i = 1; i <= 5; i++) {
    const orderNo = `ORD-${Date.now().toString().slice(-6)}-D${i}-${Math.floor(Math.random() * 100)}`;
    const quantity = i + 2;
    const price = 120.0;
    const totalAmount = quantity * price;

    const masterOrder = await prisma.masterOrder.create({
      data: {
        orderNumber: orderNo,
        buyerId: buyer.id,
        totalAmount,
        paymentStatus: 'PENDING',
        status: 'CREATED',
        items: {
          create: {
            productId: product.id,
            sellerId: seller.id,
            quantity,
            price,
          }
        }
      }
    });

    const dropPointNames = [
      'Nesari Stand, Gadhinglaj',
      'Koulage Crossing, Gadhinglaj',
      'Hingalaj Road Primary School',
      'Wagharale Naka Market',
      'Mahagaon Gram Panchayat'
    ];
    const deliveryAddress = dropPointNames[i - 1] || 'Nesari Stand, Gadhinglaj';

    const dropOrder = await prisma.dropOrder.create({
      data: {
        dropOrderNumber: `DRP-${orderNo}`,
        masterOrderId: masterOrder.id,
        buyerId: buyer.id,
        shgId: targetShg.id,
        transporterId: targetTransporter.id,
        status: 'PENDING',
        deliveryAddress,
        items: {
          create: {
            productId: product.id,
            quantity,
          }
        }
      }
    });

    console.log(`  -> Created assigned Drop Order ${i}: ${dropOrder.dropOrderNumber} (ID: ${dropOrder.id})`);
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
