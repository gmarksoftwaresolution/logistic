import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getVillageLocation(prisma: any, villageName: string) {
  const cleanName = villageName.replace('anang', 'ang'); // maps Batkanangale to Batkangale just in case
  const namesToTry = [villageName, cleanName];

  for (const name of namesToTry) {
    // 1. Check Address table in public schema
    const addr = await prisma.address.findFirst({
      where: { village: { equals: name, mode: 'insensitive' } },
      select: { village: true, pincode: true, taluka: true, district: true, state: true }
    });
    if (addr) return addr;

    // 2. Check CommunityMember table in gmu schema
    const cm = await prisma.communityMember.findFirst({
      where: { village: { equals: name, mode: 'insensitive' } },
      select: { village: true, pincode: true, taluka: true, district: true, state: true }
    });
    if (cm) return cm;

    // 3. Check PincodeDirectory table in public schema
    const pd = await prisma.pincodeDirectory.findFirst({
      where: { village: { equals: name, mode: 'insensitive' } }
    });
    if (pd) {
      return {
        village: pd.village,
        pincode: pd.pincode,
        taluka: pd.taluka,
        district: pd.district,
        state: pd.state
      };
    }
  }
  throw new Error(`Location details not found in database for village: ${villageName}`);
}

async function ensurePublicTablesExist(prisma: any) {
  console.log('Ensuring public.sellers and public.buyers tables exist in Supabase...');
  
  // 1. Create public.sellers
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.sellers (
      id SERIAL PRIMARY KEY,
      seller_code VARCHAR(255) UNIQUE NOT NULL,
      seller_name VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      village VARCHAR(255) NOT NULL,
      taluka VARCHAR(255) NOT NULL,
      district VARCHAR(255) NOT NULL,
      state VARCHAR(255) NOT NULL,
      pincode VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  // 2. Create public.buyers
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.buyers (
      id SERIAL PRIMARY KEY,
      buyer_code VARCHAR(255) UNIQUE NOT NULL,
      buyer_name VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      village VARCHAR(255) NOT NULL,
      taluka VARCHAR(255) NOT NULL,
      district VARCHAR(255) NOT NULL,
      state VARCHAR(255) NOT NULL,
      pincode VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  // 3. Ensure master_orders references buyers
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.master_orders
      ADD CONSTRAINT fk_master_orders_buyer
      FOREIGN KEY (buyer_id) REFERENCES public.buyers(id)
      ON DELETE CASCADE;
    `);
  } catch (e) {
    // Constraint might already exist
  }

  // 4. Ensure master_order_items references sellers
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.master_order_items
      ADD CONSTRAINT fk_master_order_items_seller
      FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
      ON DELETE CASCADE;
    `);
  } catch (e) {
    // Constraint might already exist
  }

  // 5. Ensure pickup_orders references sellers
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.pickup_orders
      ADD CONSTRAINT fk_pickup_orders_seller
      FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
      ON DELETE CASCADE;
    `);
  } catch (e) {
    // Constraint might already exist
  }

  // 6. Ensure drop_orders references buyers
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.drop_orders
      ADD CONSTRAINT fk_drop_orders_buyer
      FOREIGN KEY (buyer_id) REFERENCES public.buyers(id)
      ON DELETE CASCADE;
    `);
  } catch (e) {
    // Constraint might already exist
  }
}

async function main() {
  // Ensure public schema tables exist first
  await ensurePublicTablesExist(prisma);

  console.log('Resolving dynamic locations for allowed villages...');
  const allowedVillagesList = ['Gadhinglaj', 'Nesari', 'Dundage', 'Mahagaon', 'Batkanangale', 'Inchnal'];
  const resolvedLocationsMap: Record<string, any> = {};
  for (const village of allowedVillagesList) {
    try {
      const loc = await getVillageLocation(prisma, village);
      resolvedLocationsMap[village.toLowerCase()] = loc;
    } catch (e: any) {
      console.log(`Warning: Location details not found in database for village ${village}: ${e.message}. Falling back to defaults.`);
      resolvedLocationsMap[village.toLowerCase()] = {
        village,
        pincode: village === 'Nesari' ? '416504' : village === 'Dundage' ? '416501' : village === 'Mahagaon' ? '416503' : '416502',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra'
      };
    }
  }

  const locations = allowedVillagesList.map(v => resolvedLocationsMap[v.toLowerCase()]);

  // Seeding Admin User
  const adminCount = await prisma.adminUser.count();
  if (adminCount === 0) {
    console.log('Seeding Admin User...');
    const admin = await prisma.adminUser.create({
      data: {
        mobileNumber: '1111111111',
        name: 'Admin User',
        role: 'Warehouse Head',
      },
    });
    console.log('Seeded Admin:', admin.name);
  } else {
    console.log('Admin User already exists, skipping...');
  }

  // Generate mock data helper functions
  const randomMobile = () => '9' + Math.floor(100000000 + Math.random() * 900000000).toString();

  // Female Sellers (15 names)
  const shgNames = [
    'Savita Patil', 'Lata Gaikwad', 'Anita Chavan', 'Kavita Kadam', 'Shalini Patil',
    'Deepa Kulkarni', 'Nisha Joshi', 'Jyoti More', 'Sangita Shinde', 'Vaishnavi Patil',
    'Pooja Jadhav', 'Snehal Patil', 'Aarti Desai', 'Prajakta More', 'Ashwini Patil'
  ];

  // Male Sellers (15 names)
  const individualNames = [
    'Rahul Lohar', 'Nikhil Patil', 'Parth Shinde', 'Aditya Patil', 'Rohit Chavan',
    'Akash Jadhav', 'Mahesh Patil', 'Sagar Kadam', 'Vishal More', 'Ganesh Patil',
    'Amit Jadhav', 'Kiran Patil', 'Rohan Chavan', 'Pratik Shinde', 'Santosh Patil'
  ];

  // Female Buyers (10 names)
  const femaleBuyers = [
    'Priya Deshmukh', 'Gauri Patil', 'Shweta More', 'Neha Chavan', 'Pooja Jadhav',
    'Sonali Patil', 'Shraddha Kadam', 'Monika Patil', 'Komal More', 'Rutuja Shinde'
  ];

  // Male Buyers (10 names)
  const maleBuyers = [
    'Parth Shinde', 'Aditya Patil', 'Omkar Kadam', 'Abhishek Jadhav', 'Nilesh Patil',
    'Saurabh More', 'Tejas Chavan', 'Kunal Patil', 'Sameer Jadhav', 'Pranav Kadam'
  ];

  const buyerNames = [...femaleBuyers, ...maleBuyers];

  const getLocation = (index: number) => {
    return locations[index % locations.length];
  };

  // Realistic occupations list
  const occupations = [
    'Tailoring & Embroidery', 'Organic Farming', 'Spices & Masala Making',
    'Dairy Farming', 'Handicrafts', 'Poultry Farming', 'Food Catering',
    'Goat Rearing', 'Vegetable Vending', 'Apiculture (Honey)'
  ];

  // Seeding Community Members if empty
  const cmCount = await prisma.communityMember.count();
  if (cmCount === 0) {
    console.log('Seeding Community Members...');
    
    // Seed SHG Leaders/Members (Female)
    for (let i = 0; i < 15; i++) {
      const loc = getLocation(i);
      await prisma.communityMember.create({
        data: {
          fullName: shgNames[i],
          mobileNumber: randomMobile(),
          type: 'SHG',
          status: 'APPROVED',
          village: loc.village,
          taluka: loc.taluka,
          district: loc.district,
          state: loc.state,
          pincode: loc.pincode,
          memberCode: `CM-SHG-${1000 + i}`,
          shgName: `${shgNames[i].split(' ')[0]} Mahila Bachat Gat`,
          groupSize: 10 + (i % 6),
          leaderName: shgNames[i],
          occupation: occupations[i % occupations.length],
        },
      });
    }

    // Seed Individual Members (Male)
    for (let i = 0; i < 15; i++) {
      const loc = getLocation(i + 5);
      await prisma.communityMember.create({
        data: {
          fullName: individualNames[i],
          mobileNumber: randomMobile(),
          type: 'INDIVIDUAL',
          status: 'APPROVED',
          village: loc.village,
          taluka: loc.taluka,
          district: loc.district,
          state: loc.state,
          pincode: loc.pincode,
          memberCode: `CM-IND-${1000 + i}`,
          occupation: occupations[(i + 3) % occupations.length],
        },
      });
    }

    // Ensure a specific SHG exists for testing login/assignments (phone: 7777777777)
    const testLoc = locations[0];
    await prisma.communityMember.create({
      data: {
        fullName: 'Tara Bai Shinde',
        mobileNumber: '7777777777',
        type: 'SHG',
        status: 'APPROVED',
        village: testLoc.village,
        taluka: testLoc.taluka,
        district: testLoc.district,
        state: testLoc.state,
        pincode: testLoc.pincode,
        memberCode: 'CM-SHG-TEST',
        shgName: 'Tara Mahila Bachat Gat',
        groupSize: 12,
        leaderName: 'Tara Bai Shinde',
        occupation: 'Spices & Masala Making',
      },
    });

    console.log('Seeded 31 Community Members successfully.');
  } else {
    console.log('Community Members already exist, skipping...');
  }

  // Seeding Transporters if empty
  const tmCount = await prisma.transporterMember.count();
  if (tmCount === 0) {
    console.log('Seeding Transporters...');
    const vehicleTypes = ['Mini Truck (Tata Ace)', 'Pickup Van (Bolero)', 'Auto Rickshaw Cargo', 'Two Wheeler'];
    
    // Seed Route Partners
    const routePartnerNames = [
      'Ramesh Jadhav', 'Suresh Kadam', 'Vijay Patil', 'Anil Chavan', 'Dilip Shinde',
      'Sunil Lohar', 'Prakash Desai', 'Sanjay More', 'Vikas Patil', 'Rajendra Jadhav'
    ];
    for (let i = 0; i < 10; i++) {
      const loc = getLocation(i + 2);
      await prisma.transporterMember.create({
        data: {
          firstName: routePartnerNames[i].split(' ')[0],
          lastName: routePartnerNames[i].split(' ')[1],
          mobileNumber: randomMobile(),
          type: 'ROUTE_PARTNER',
          status: 'APPROVED',
          residentialAddress: `Near Main Road, ${loc.village}`,
          village: loc.village,
          taluka: loc.taluka,
          district: loc.district,
          state: loc.state,
          pincode: loc.pincode,
          transporterCode: `TM-RP-${1000 + i}`,
          vehicleType: vehicleTypes[i % 3], // Mini Truck, Bolero, Auto Rickshaw
          licenseNumber: `MH-09-L-${1000 + i}`,
        },
      });
    }

    // Seed Personal Transporters
    const personalNames = [
      'Sachin Sawant', 'Rahul Kulkarni', 'Sandip Patil', 'Amol Joshi', 'Prasad Desai'
    ];
    for (let i = 0; i < 5; i++) {
      const loc = getLocation(i + 4);
      await prisma.transporterMember.create({
        data: {
          firstName: personalNames[i].split(' ')[0],
          lastName: personalNames[i].split(' ')[1],
          mobileNumber: randomMobile(),
          type: 'PERSONAL',
          status: 'APPROVED',
          residentialAddress: `Galli No. ${i + 1}, ${loc.village}`,
          village: loc.village,
          taluka: loc.taluka,
          district: loc.district,
          state: loc.state,
          pincode: loc.pincode,
          transporterCode: `TM-PR-${1000 + i}`,
          vehicleType: 'Two Wheeler',
          licenseNumber: `MH-09-L-${2000 + i}`,
        },
      });
    }

    // Ensure a specific Transporter exists for testing login/assignments (phone: 9999999999)
    const testLoc = locations[1];
    await prisma.transporterMember.create({
      data: {
        firstName: 'Balasaheb',
        lastName: 'Patil',
        mobileNumber: '9999999999',
        type: 'ROUTE_PARTNER',
        status: 'APPROVED',
        residentialAddress: `Opposite Bus Stand, ${testLoc.village}`,
        village: testLoc.village,
        taluka: testLoc.taluka,
        district: testLoc.district,
        state: testLoc.state,
        pincode: testLoc.pincode,
        transporterCode: 'TM-RP-TEST',
        vehicleType: 'Pickup Van (Bolero)',
        licenseNumber: 'MH-09-L-TEST',
      },
    });

    console.log('Seeded 16 Transporters successfully.');
  } else {
    console.log('Transporters already exist, skipping...');
  }

  // Clear orders and reseed them
  console.log('Seeding Orders...');
  await prisma.orderAssignment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.seller.deleteMany({});
  await prisma.buyer.deleteMany({});

  console.log('Clearing public schema order and inventory tables...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.drop_tracking RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.pickup_tracking RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.drop_order_items RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.pickup_order_items RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.drop_orders RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.pickup_orders RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.master_order_items RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.master_orders RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.warehouse_inventory RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.sellers RESTART IDENTITY CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.buyers RESTART IDENTITY CASCADE;`);

  const sellersData = [
    {
      id: 1,
      sellerCode: 'SEL001',
      sellerName: 'Savitri Bai Patil',
      mobileNumber: '9876500001',
      email: 'savitri.patil@example.com',
      addressLine1: 'Sakhi Center, Near Primary School',
      ...resolvedLocationsMap['gadhinglaj']
    },
    {
      id: 2,
      sellerCode: 'SEL002',
      sellerName: 'Lata Mangeshk Gaikwad',
      mobileNumber: '9876500002',
      email: 'lata.gaikwad@example.com',
      addressLine1: 'Main Galli, Ward 2',
      ...resolvedLocationsMap['nesari']
    },
    {
      id: 3,
      sellerCode: 'SEL003',
      sellerName: 'Anita Rameshw Chavan',
      mobileNumber: '9876500003',
      email: 'anita.chavan@example.com',
      addressLine1: 'Temple Road',
      ...resolvedLocationsMap['dundage']
    },
    {
      id: 4,
      sellerCode: 'SEL004',
      sellerName: 'Kavita Suresha Kadam',
      mobileNumber: '9876500004',
      email: 'kavita.kadam@example.com',
      addressLine1: 'Near Milk Dairy',
      ...resolvedLocationsMap['mahagaon']
    },
    {
      id: 5,
      sellerCode: 'SEL005',
      sellerName: 'Shalini Kishor Patil',
      mobileNumber: '9876500005',
      email: 'shalini.patil@example.com',
      addressLine1: 'Grampanchayat Lane',
      ...resolvedLocationsMap['inchnal']
    },
    {
      id: 6,
      sellerCode: 'SEL006',
      sellerName: 'Deepa Gajanan Kulkarni',
      mobileNumber: '9876500006',
      email: 'deepa.kulkarni@example.com',
      addressLine1: 'Station Road',
      ...resolvedLocationsMap['batkanangale']
    }
  ];

  const buyersData = [
    {
      id: 1,
      buyerCode: 'BUY001',
      buyerName: 'Priya Ramesh Deshmukh',
      mobileNumber: '9988700001',
      email: 'priya.deshmukh@example.com',
      addressLine1: 'Pragati Colony',
      ...resolvedLocationsMap['gadhinglaj']
    },
    {
      id: 2,
      buyerCode: 'BUY002',
      buyerName: 'Gauri Shankar Patil',
      mobileNumber: '9988700002',
      email: 'gauri.patil@example.com',
      addressLine1: 'Stand area, Main Road',
      ...resolvedLocationsMap['nesari']
    },
    {
      id: 3,
      buyerCode: 'BUY003',
      buyerName: 'Shweta Vinay More',
      mobileNumber: '9988700003',
      email: 'shweta.more@example.com',
      addressLine1: 'Near Ganpati Temple',
      ...resolvedLocationsMap['dundage']
    },
    {
      id: 4,
      buyerCode: 'BUY004',
      buyerName: 'Neha Vikas Chavan',
      mobileNumber: '9988700004',
      email: 'neha.chavan@example.com',
      addressLine1: 'Bazar Peth',
      ...resolvedLocationsMap['mahagaon']
    },
    {
      id: 5,
      buyerCode: 'BUY005',
      buyerName: 'Pooja Aditya Jadhav',
      mobileNumber: '9988700005',
      email: 'pooja.jadhav@example.com',
      addressLine1: 'Near School No 1',
      ...resolvedLocationsMap['inchnal']
    },
    {
      id: 6,
      buyerCode: 'BUY006',
      buyerName: 'Sonali Nitin Patil',
      mobileNumber: '9988700006',
      email: 'sonali.patil@example.com',
      addressLine1: 'Naka Chowk',
      ...resolvedLocationsMap['batkanangale']
    }
  ];

  console.log('Inserting Sellers...');
  for (const seller of sellersData) {
    await prisma.seller.create({
      data: {
        id: seller.id,
        sellerCode: seller.sellerCode,
        sellerName: seller.sellerName,
        mobileNumber: seller.mobileNumber,
        email: seller.email,
        addressLine1: seller.addressLine1,
        village: seller.village,
        taluka: seller.taluka,
        district: seller.district,
        state: seller.state,
        pincode: seller.pincode
      }
    });

    await prisma.$executeRaw`
      INSERT INTO public.sellers (id, seller_code, seller_name, mobile_number, email, address_line1, village, taluka, district, state, pincode, created_at, updated_at)
      VALUES (${seller.id}, ${seller.sellerCode}, ${seller.sellerName}, ${seller.mobileNumber}, ${seller.email}, ${seller.addressLine1}, ${seller.village}, ${seller.taluka}, ${seller.district}, ${seller.state}, ${seller.pincode}, NOW(), NOW());
    `;
  }

  console.log('Inserting Buyers...');
  for (const buyer of buyersData) {
    await prisma.buyer.create({
      data: {
        id: buyer.id,
        buyerCode: buyer.buyerCode,
        buyerName: buyer.buyerName,
        mobileNumber: buyer.mobileNumber,
        email: buyer.email,
        addressLine1: buyer.addressLine1,
        village: buyer.village,
        taluka: buyer.taluka,
        district: buyer.district,
        state: buyer.state,
        pincode: buyer.pincode
      }
    });

    await prisma.$executeRaw`
      INSERT INTO public.buyers (id, buyer_code, buyer_name, mobile_number, email, address_line1, village, taluka, district, state, pincode, created_at, updated_at)
      VALUES (${buyer.id}, ${buyer.buyerCode}, ${buyer.buyerName}, ${buyer.mobileNumber}, ${buyer.email}, ${buyer.addressLine1}, ${buyer.village}, ${buyer.taluka}, ${buyer.district}, ${buyer.state}, ${buyer.pincode}, NOW(), NOW());
    `;
  }

  // Reset auto-increment sequences for sellers and buyers
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('gmu.sellers', 'id'), COALESCE(MAX(id), 1)) FROM gmu.sellers;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.sellers', 'id'), COALESCE(MAX(id), 1)) FROM public.sellers;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('gmu.buyers', 'id'), COALESCE(MAX(id), 1)) FROM gmu.buyers;`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.buyers', 'id'), COALESCE(MAX(id), 1)) FROM public.buyers;`);

  // Ensure matching User IDs 1 to 6 exist in the public."User" table to satisfy the products foreign key mapping
  console.log('Ensuring user accounts for logistics sellers exist in `"User"` table...');
  const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();

  for (let i = 1; i <= 6; i++) {
    const seller = sellersData[i - 1];
    const existingUser = await prisma.$queryRawUnsafe(`
      SELECT id FROM public."User" WHERE id = $1 LIMIT 1;
    `, i) as any[];

    if (existingUser.length === 0) {
      const phoneUser = await prisma.$queryRawUnsafe(`
        SELECT id FROM public."User" WHERE "phoneNumber" = $1 LIMIT 1;
      `, seller.mobileNumber) as any[];

      if (phoneUser.length === 0) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO public."User" (id, "authId", role, "phoneNumber", email, "fullName", "isVerified", "currentStep", "profileCompletion", "applicationStatus", created_at, updated_at)
          VALUES ($1, $2::uuid, 'SELLER', $3, $4, $5, true, 4, 100, 'APPROVED', NOW(), NOW());
        `, i, uuidv4(), seller.mobileNumber, seller.email, seller.sellerName);
      }
    }
  }

  const newProductsList = [
    { name: 'Organic Honey', category: 'FOOD', price: 450.0, weight: 0.5, unit: 'Bottle', description: 'Pure Organic Honey' },
    { name: 'Pickle', category: 'FOOD', price: 130.0, weight: 1.0, unit: 'Jar', description: 'Spicy Mango Pickle' },
    { name: 'Papad', category: 'FOOD', price: 100.0, weight: 0.5, unit: 'Packet', description: 'Crunchy Urad Papad' },
    { name: 'Turmeric Powder', category: 'FOOD', price: 120.0, weight: 0.25, unit: 'Packet', description: 'Pure Turmeric Powder' },
    { name: 'Red Chilli Powder', category: 'FOOD', price: 150.0, weight: 0.25, unit: 'Packet', description: 'Spicy Red Chilli Powder' },
    { name: 'Coriander Powder', category: 'FOOD', price: 100.0, weight: 0.25, unit: 'Packet', description: 'Aromatic Coriander Powder' },
    { name: 'Cumin Powder', category: 'FOOD', price: 180.0, weight: 0.25, unit: 'Packet', description: 'Roasted Cumin Powder' },
    { name: 'Rice', category: 'FOOD', price: 65.0, weight: 5.0, unit: 'Bag', description: 'Premium Basmati Rice' },
    { name: 'Wheat Flour', category: 'FOOD', price: 45.0, weight: 5.0, unit: 'Bag', description: 'Whole Wheat Atta' },
    { name: 'Jaggery', category: 'FOOD', price: 80.0, weight: 1.0, unit: 'Block', description: 'Organic Sugarcane Jaggery' },
    { name: 'Groundnut Oil', category: 'FOOD', price: 210.0, weight: 1.0, unit: 'Litre', description: 'Cold Pressed Groundnut Oil' },
    { name: 'Sunflower Oil', category: 'FOOD', price: 180.0, weight: 1.0, unit: 'Litre', description: 'Refined Sunflower Oil' },
    { name: 'Besan', category: 'FOOD', price: 90.0, weight: 1.0, unit: 'Packet', description: 'Pure Gram Flour' },
    { name: 'Ragi Flour', category: 'FOOD', price: 55.0, weight: 1.0, unit: 'Packet', description: 'Healthy Finger Millet Flour' },
    { name: 'Poha', category: 'FOOD', price: 60.0, weight: 1.0, unit: 'Packet', description: 'Flattened Rice' },
    { name: 'Chana Dal', category: 'FOOD', price: 110.0, weight: 1.0, unit: 'Packet', description: 'Split Bengal Gram' },
    { name: 'Toor Dal', category: 'FOOD', price: 150.0, weight: 1.0, unit: 'Packet', description: 'Split Pigeon Peas' },
    { name: 'Moong Dal', category: 'FOOD', price: 140.0, weight: 1.0, unit: 'Packet', description: 'Split Green Gram' },
    { name: 'Dry Coconut', category: 'FOOD', price: 200.0, weight: 1.0, unit: 'Packet', description: 'Dried Coconut Copra' },
    { name: 'Tamarind', category: 'FOOD', price: 160.0, weight: 0.5, unit: 'Packet', description: 'Sour Tamarind Block' }
  ];

  console.log('Ensuring 20 new realistic test products exist in public.products and are correctly owned by sellers 1 to 6...');
  const testProducts: any[] = [];
  for (let i = 0; i < newProductsList.length; i++) {
    const pInfo = newProductsList[i];
    // Distribute products uniformly among sellers 1 to 6
    const sellerId = (i % 6) + 1;

    const existing = await prisma.$queryRawUnsafe(`
      SELECT id, price, category, name, weight FROM public.products WHERE name = $1 AND seller_id = $2 LIMIT 1;
    `, pInfo.name, sellerId) as any[];

    if (existing && existing.length > 0) {
      testProducts.push(existing[0]);
    } else {
      const inserted: any[] = await prisma.$queryRawUnsafe(`
        INSERT INTO public.products (name, category, price, stock, weight, "Unit", seller_id, created_at)
        VALUES ($1, $2, $3, 500, $4, $5, $6, NOW())
        RETURNING id, price, category, name, weight;
      `, pInfo.name, pInfo.category, pInfo.price, pInfo.weight, pInfo.unit, sellerId);
      testProducts.push(inserted[0]);
    }
  }

  // Seed 20 Pickup Orders
  console.log('Seeding 20 pickup orders in ORDER_PLACED status using the new logistics-catalog products...');
  for (let i = 1; i <= 20; i++) {
    const sellerIndex = (i - 1) % sellersData.length;
    const shift = 1 + Math.floor((i - 1) / sellersData.length);
    const buyerIndex = (sellerIndex + shift) % buyersData.length;

    const seller = sellersData[sellerIndex];
    const buyer = buyersData[buyerIndex];
    
    // Choose products: filter testProducts to only select those belonging to this order's seller
    const sellerProducts = testProducts.filter((p: any) => (testProducts.indexOf(p) % 6) + 1 === seller.id);
    
    let orderItems = [];
    if (sellerProducts.length >= 2 && i % 2 === 0) {
      const p1 = sellerProducts[0];
      const p2 = sellerProducts[1];
      const q1 = 2 + (i % 4);
      const q2 = 1 + (i % 3);
      orderItems.push({ product: p1, qty: q1 });
      orderItems.push({ product: p2, qty: q2 });
    } else {
      const p = sellerProducts[i % sellerProducts.length];
      const q = 2 + (i % 5);
      orderItems.push({ product: p, qty: q });
    }

    const productCount = orderItems.length;
    const totalQty = orderItems.reduce((sum, item) => sum + item.qty, 0);
    const totalAmount = orderItems.reduce((sum, item) => sum + item.qty * Number(item.product.price || 100.0), 0);
    const totalWeight = parseFloat(orderItems.reduce((sum, item) => sum + item.qty * Number(item.product.weight || 0.5), 0).toFixed(2));
    const orderNo = `ORD-PICK-${1000 + i}`;

    // 1. Create in gmu schema Order table
    const createdGmuOrder = await prisma.order.create({
      data: {
        orderId: orderNo,
        barcode: null,
        sellerId: seller.id,
        buyerId: buyer.id,
        productCount: productCount,
        totalQty: totalQty,
        totalWeight: totalWeight,
        pickupShgId: null,
        pickupTransporterId: null,
        mainStatus: 'ORDER_PLACED',
        pickupShgStatus: null,
        pickupTransporterStatus: null,
      }
    });

    // Auto-broadcast logic in seed.ts for SHGs:
    const approvedShgs = await prisma.$queryRawUnsafe(`
      SELECT cm.id, cm.pincode, cm.village
      FROM gmu."CommunityMember" cm
      JOIN public."User" u ON cm."mobileNumber" = u."phoneNumber"
      WHERE cm.type = 'SHG' AND cm.status = 'APPROVED' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
    `) as any[];

    // Match BOTH Pincode AND Village (exact, trimmed, case-insensitive)
    const matchingShgs = approvedShgs.filter(shg => 
      shg.pincode && seller.pincode && 
      shg.pincode.trim().toLowerCase() === seller.pincode.trim().toLowerCase() &&
      shg.village && seller.village && 
      shg.village.trim().toLowerCase() === seller.village.trim().toLowerCase()
    );

    if (matchingShgs.length > 0) {
      // Create PENDING assignments
      const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();
      for (const shg of matchingShgs) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO gmu."OrderAssignment" (id, "orderId", "assigneeId", "assigneeType", role, status, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, 'SHG', 'PICKUP', 'PENDING', NOW(), NOW());
        `, uuidv4(), createdGmuOrder.id, shg.id);
      }

      // Update Order Status to PICKUP_ASSIGNED in gmu schema Order table
      await prisma.order.update({
        where: { id: createdGmuOrder.id },
        data: {
          mainStatus: 'PICKUP_ASSIGNED',
          pickupShgStatus: 'PENDING',
        }
      });
    }

    // 2. Create in public schema master_orders
    const insertMo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.master_orders (order_number, buyer_id, total_amount, payment_status, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'PENDING', 'CREATED', NOW(), NOW())
      RETURNING id;
    `, orderNo, buyer.id, totalAmount);
    const masterOrderId = insertMo[0].id;

    // 3. Create in public schema master_order_items
    for (const item of orderItems) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.master_order_items (master_order_id, product_id, seller_id, quantity, price)
        VALUES ($1, $2, $3, $4, $5);
      `, masterOrderId, item.product.id, seller.id, item.qty, Number(item.product.price || 100.0));
    }

    // 4. Create in public schema pickup_orders
    const insertPo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.pickup_orders (pickup_order_number, master_order_id, seller_id, status, created_at)
      VALUES ($1, $2, $3, 'PENDING', NOW())
      RETURNING id;
    `, `PKP-${orderNo}`, masterOrderId, seller.id);
    const pickupOrderId = insertPo[0].id;

    // 5. Create in public schema pickup_order_items
    for (const item of orderItems) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.pickup_order_items (pickup_order_id, product_id, quantity)
        VALUES ($1, $2, $3);
      `, pickupOrderId, item.product.id, item.qty);
    }

    // 6. Create in public schema pickup_tracking (with "Order Created" remarks and ORDER_PLACED status)
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.pickup_tracking (pickup_order_id, status, remarks, updated_at)
      VALUES ($1, 'ORDER_PLACED', 'Order Created', NOW());
    `, pickupOrderId);
  }

  // Seed additional SHG registrations
  await seedAdditionalSHGs(prisma);

  // Seed Transporter route details and user accounts
  await seedTransporterRouteDetails(prisma);

  console.log('Database Seeding Completed Successfully!');
}

async function seedAdditionalSHGs(prisma: any) {
  console.log('Seeding additional SHG registrations...');
  const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();

  const additionalShgs = [
    // Batkanangale
    {
      village: 'Batkanangale',
      shgName: 'Ekta Mahila Bachat Gat',
      contactPerson: 'Shalini Patil',
      mobileNumber: '9090900001',
      email: 'shalini.ekta@test.com',
      houseNo: 'Plot No. 12',
      landmark: 'Near Gram Panchayat',
      bankAccount: '33333333331',
      aadhaar: '111122223331',
      pan: 'ABCDE1111A'
    },
    {
      village: 'Batkanangale',
      shgName: 'Pragati Mahila Bachat Gat',
      contactPerson: 'Mangal Desai',
      mobileNumber: '9090900002',
      email: 'mangal.pragati@test.com',
      houseNo: 'Flat 101, Shivneri Appt',
      landmark: 'Opposite ZP School',
      bankAccount: '33333333332',
      aadhaar: '111122223332',
      pan: 'ABCDE2222B'
    },
    // Inchnal
    {
      village: 'Inchnal',
      shgName: 'Vikas Mahila Bachat Gat',
      contactPerson: 'Surekha Kamble',
      mobileNumber: '9090900003',
      email: 'surekha.vikas@test.com',
      houseNo: 'Gat No. 45',
      landmark: 'Near Water Tank',
      bankAccount: '33333333333',
      aadhaar: '111122223333',
      pan: 'ABCDE3333C'
    },
    {
      village: 'Inchnal',
      shgName: 'Savtribai Mahila Bachat Gat',
      contactPerson: 'Laxmi Shinde',
      mobileNumber: '9090900004',
      email: 'laxmi.savtri@test.com',
      houseNo: 'Ward No. 3',
      landmark: 'Near Hanuman Temple',
      bankAccount: '33333333334',
      aadhaar: '111122223334',
      pan: 'ABCDE4444D'
    },
    // Dundage
    {
      village: 'Dundage',
      shgName: 'Kiran Mahila Bachat Gat',
      contactPerson: 'Sunita Lohar',
      mobileNumber: '9090900005',
      email: 'sunita.kiran@test.com',
      houseNo: 'House No. 89',
      landmark: 'Near Milk Dairy',
      bankAccount: '33333333335',
      aadhaar: '111122223335',
      pan: 'ABCDE5555E'
    },
    {
      village: 'Dundage',
      shgName: 'Tejaswini Mahila Bachat Gat',
      contactPerson: 'Rupali Powar',
      mobileNumber: '9090900006',
      email: 'rupali.tejaswini@test.com',
      houseNo: 'Galli No. 2',
      landmark: 'Near Library',
      bankAccount: '33333333336',
      aadhaar: '111122223336',
      pan: 'ABCDE6666F'
    }
  ];

  for (const shg of additionalShgs) {
    // Clean up existing records for the mobile number to ensure fresh seed
    const existing = await prisma.$queryRawUnsafe(`
      SELECT id FROM public."User" WHERE "phoneNumber" = $1 LIMIT 1;
    `, shg.mobileNumber) as any[];

    if (existing.length > 0) {
      const uId = existing[0].id;
      console.log(`SHG with mobile number ${shg.mobileNumber} already exists. Cleaning up for a fresh seed...`);
      await prisma.$executeRawUnsafe(`DELETE FROM public."ShgDetail" WHERE "userId" = $1;`, uId);
      await prisma.$executeRawUnsafe(`DELETE FROM public."Address" WHERE "userId" = $1;`, uId);
      await prisma.$executeRawUnsafe(`DELETE FROM public."Document" WHERE "userId" = $1;`, uId);
      await prisma.$executeRawUnsafe(`DELETE FROM public."BankDetail" WHERE "userId" = $1;`, uId);
      await prisma.$executeRawUnsafe(`DELETE FROM public."OtherDetails" WHERE "userId" = $1;`, uId);
      await prisma.$executeRawUnsafe(`DELETE FROM public."StepTracking" WHERE "userId" = $1;`, uId);
      await prisma.$executeRawUnsafe(`DELETE FROM public."Application" WHERE "userId" = $1;`, uId);
      await prisma.$executeRawUnsafe(`DELETE FROM public."User" WHERE id = $1;`, uId);
    }

    // Clean up community member in GMU schema
    await prisma.$executeRawUnsafe(`
      DELETE FROM gmu."CommunityMember" WHERE "mobileNumber" = $1;
    `, shg.mobileNumber);

    // Get dynamic location matching correct pincode from pincode directory
    let loc;
    try {
      loc = await getVillageLocation(prisma, shg.village);
    } catch (e: any) {
      console.log(`Location lookup warning for ${shg.village}: ${e.message}. Using default values.`);
      loc = {
        village: shg.village,
        pincode: shg.village === 'Nesari' ? '416504' : shg.village === 'Dundage' ? '416501' : shg.village === 'Mahagaon' ? '416503' : '416502',
        taluka: 'Gadhinglaj',
        district: 'Kolhapur',
        state: 'Maharashtra'
      };
    }

    // 1. Create User
    const tempUuid = uuidv4();
    const insertUser = await prisma.$queryRawUnsafe(`
      INSERT INTO public."User" ("authId", role, "phoneNumber", email, "fullName", "isVerified", "currentStep", "profileCompletion", "applicationStatus", "createdAt", "updatedAt")
      VALUES ($1::uuid, 'SHG', $2, $3, $4, true, 7, 100, 'APPROVED', NOW(), NOW())
      RETURNING id;
    `, tempUuid, shg.mobileNumber, shg.email, shg.contactPerson) as any[];
    const userId = insertUser[0].id;

    // Update with Unique Code
    const uniqueCode = `LOG-SHG-${1000 + userId}`;
    await prisma.$executeRawUnsafe(`
      UPDATE public."User" SET "uniqueCode" = $1 WHERE id = $2;
    `, uniqueCode, userId);

    // 2. Create ShgDetail
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."ShgDetail" (
        "userId", "shgName", "shgLeaderName", "shgLeaderContact", "shgRole", "groupSize", "fullName", "age", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, 'LEADER'::public."ShgRole", $5, $6, $7, NOW(), NOW());
    `, userId, shg.shgName, shg.contactPerson, shg.mobileNumber, 10, shg.contactPerson, 35);

    // 3. Create Address
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."Address" ("userId", "houseNo", landmark, village, taluka, district, state, pincode, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW());
    `, userId, shg.houseNo, shg.landmark, loc.village, loc.taluka, loc.district, loc.state, loc.pincode);

    // 4. Create Document
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."Document" ("userId", "aadhaarNumber", "panNumber", "aadhaarFrontUrl", "aadhaarBackUrl", "panCardUrl", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
    `, userId, shg.aadhaar, shg.pan, 'http://dummy.url/aadhaar_front.jpg', 'http://dummy.url/aadhaar_back.jpg', 'http://dummy.url/pan.jpg');

    // 5. Create BankDetail
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."BankDetail" ("userId", "accountHolderName", "bankName", "accountNumber", "ifscCode", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW());
    `, userId, shg.contactPerson, 'State Bank of India', shg.bankAccount, 'SBIN0001234');

    // 6. Create OtherDetails
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."OtherDetails" ("userId", "vehicleType", "heihgt", width, "storageSpace", "createdAt", "updatedAt")
      VALUES ($1, 'OTHER'::public."VehicleType", null, null, '500 sqft', NOW(), NOW());
    `, userId);

    // 7. Create StepTracking (1 to 7)
    const steps = [
      { step: 1, data: { age: 35, fullName: shg.contactPerson, userType: 'SHG' } },
      { step: 2, data: { shgName: shg.shgName, shgRole: 'LEADER', shgGroupSize: 10, shgLeaderName: shg.contactPerson, shgLeaderContact: shg.mobileNumber } },
      { step: 3, data: { products: [], producesProduct: false } },
      { step: 4, data: { state: loc.state, taluka: loc.taluka, houseNo: shg.houseNo, pincode: loc.pincode, village: loc.village, district: loc.district, landmark: shg.landmark } },
      { step: 5, data: { panNumber: shg.pan, panCardUrl: 'http://dummy.url/pan.jpg', aadhaarNumber: shg.aadhaar, aadhaarBackUrl: 'http://dummy.url/aadhaar_back.jpg', aadhaarFrontUrl: 'http://dummy.url/aadhaar_front.jpg' } },
      { step: 6, data: { bankName: 'State Bank of India', ifscCode: 'SBIN0001234', accountNumber: shg.bankAccount, accountHolderName: shg.contactPerson } },
      { step: 7, data: { hasVehicle: false, storageSpace: '500 sqft', storageWidth: 22, storageLength: 23 } }
    ];

    for (const stepObj of steps) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public."StepTracking" ("userId", step, status, data, "createdAt", "updatedAt")
        VALUES ($1, $2, 'COMPLETED'::public."StepStatus", $3::jsonb, NOW(), NOW());
      `, userId, stepObj.step, JSON.stringify(stepObj.data));
    }

    // 8. Create Application
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."Application" ("userId", status, "approvedAt", "createdAt", "updatedAt")
      VALUES ($1, 'APPROVED'::public."ApplicationStatus", NOW(), NOW(), NOW());
    `, userId);

    // 9. Create CommunityMember in gmu schema
    const shgUuid = '00000000-0000-0000-0000-' + String(userId).padStart(12, '0');
    await prisma.communityMember.create({
      data: {
        id: shgUuid,
        fullName: shg.contactPerson,
        mobileNumber: shg.mobileNumber,
        type: 'SHG',
        status: 'APPROVED',
        village: loc.village,
        taluka: loc.taluka,
        district: loc.district,
        state: loc.state,
        pincode: loc.pincode,
        memberCode: `CM-SHG-${userId}`,
        shgName: shg.shgName,
        groupSize: 10,
        leaderName: shg.contactPerson,
        occupation: 'Dairy Farming',
      }
    });

    console.log(`Successfully seeded SHG: ${shg.shgName} in ${loc.village} (${loc.pincode})`);
  }
}

async function seedTransporterRouteDetails(prisma: any) {
  console.log('Seeding Route Details and User accounts for all approved transporters...');
  const transporters = await prisma.transporterMember.findMany({
    where: { status: 'APPROVED' }
  });

  const villageToPincode = (villageName: string) => {
    const v = villageName.trim().toLowerCase();
    if (v === 'nesari') return '416504';
    if (v === 'dundage') return '416501';
    if (v === 'mahagaon' || v === 'mahagaon (kolhapur)') return '416503';
    if (v === 'inchnal' || v === 'gadhinglaj' || v === 'batkanangale' || v === 'batkangale' || v === 'bhadgaon' || v === 'hitni' || v === 'atyal') return '416502';
    return '416502';
  };

  const uuidv4 = () => '00000000-0000-4000-8000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString();

  for (const tr of transporters) {
    // 1. Ensure public.User account exists
    let existingUser = await prisma.$queryRawUnsafe(`
      SELECT id FROM public."User" WHERE "phoneNumber" = $1 LIMIT 1;
    `, tr.mobileNumber) as any[];

    let userId;
    if (existingUser.length === 0) {
      const insertUser = await prisma.$queryRawUnsafe(`
        INSERT INTO public."User" ("authId", role, "phoneNumber", email, "fullName", "isVerified", "currentStep", "profileCompletion", "applicationStatus", "createdAt", "updatedAt")
        VALUES ($1::uuid, 'TRANSPORTER', $2, $3, $4, true, 7, 100, 'APPROVED', NOW(), NOW())
        RETURNING id;
      `, uuidv4(), tr.mobileNumber, `${tr.firstName.toLowerCase()}@test.com`, `${tr.firstName} ${tr.lastName}`) as any[];
      userId = insertUser[0].id;
    } else {
      userId = existingUser[0].id;
      // Make sure role is TRANSPORTER and status is APPROVED
      await prisma.$executeRawUnsafe(`
        UPDATE public."User"
        SET role = 'TRANSPORTER', "applicationStatus" = 'APPROVED', "deletedAt" = NULL
        WHERE id = $1;
      `, userId);
    }

    // 2. Parse villages from transporter home village and any other source
    const villages = [tr.village];
    // If they have operatingArea or assignedVillages, add them
    const areas = tr.village ? [tr.village] : [];
    if (tr.village === 'Nesari') {
      areas.push('Gadhinglaj', 'Batkangale', 'Nesari');
    } else if (tr.village === 'Dundage') {
      areas.push('Dundage', 'Gadhinglaj', 'Batkangale', 'Nesari');
    } else {
      areas.push('Gadhinglaj', 'Inchnal', 'Atyal');
    }

    const uniqueVillages = Array.from(new Set(areas.map(v => v.trim())));
    const pincodes = Array.from(new Set(uniqueVillages.map(v => villageToPincode(v))));

    // 3. Update TransporterMember assignedVillages and assignedPincodes columns
    await prisma.transporterMember.update({
      where: { id: tr.id },
      data: {
        assignedVillages: JSON.stringify(uniqueVillages),
        assignedPincodes: JSON.stringify(pincodes),
      }
    });

    // 4. Ensure public.RouteDetail exists
    const existingRoute = await prisma.$queryRawUnsafe(`
      SELECT id FROM public."RouteDetail" WHERE "userId" = $1 LIMIT 1;
    `, userId) as any[];

    if (existingRoute.length === 0) {
      await prisma.$queryRawUnsafe(`
        INSERT INTO public."RouteDetail" ("userId", "operatingArea", "pickupLocations", "dropLocations", "workingDays", "workingSchedule", "createdAt", "updatedAt")
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, NOW(), NOW());
      `, 
        userId, 
        uniqueVillages.join(', '), 
        JSON.stringify(pincodes), 
        JSON.stringify(pincodes),
        JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
        JSON.stringify([])
      );
    } else {
      await prisma.$queryRawUnsafe(`
        UPDATE public."RouteDetail"
        SET "operatingArea" = $1, "pickupLocations" = $2::jsonb, "dropLocations" = $3::jsonb, "updatedAt" = NOW()
        WHERE "userId" = $4;
      `, 
        uniqueVillages.join(', '), 
        JSON.stringify(pincodes), 
        JSON.stringify(pincodes),
        userId
      );
    }
  }
  console.log('Seeded transporter route details and users successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
