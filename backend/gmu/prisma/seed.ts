import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.adminUser.deleteMany({});
  await prisma.communityMember.deleteMany({});
  await prisma.transporterMember.deleteMany({});

  console.log('Seeding Admin User...');
  const admin = await prisma.adminUser.create({
    data: {
      mobileNumber: '1111111111',
      name: 'Admin User',
      role: 'Warehouse Head',
    },
  });
  console.log('Seeded Admin:', admin.name);

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

  // Location details with strict pincode mapping and district/state
  const locations = [
    { village: 'Gadhinglaj', pincode: '416502', taluka: 'Gadhinglaj', district: 'Kolhapur', state: 'Maharashtra' },
    { village: 'Nesari', pincode: '416504', taluka: 'Gadhinglaj', district: 'Kolhapur', state: 'Maharashtra' },
    { village: 'Dundage', pincode: '416501', taluka: 'Gadhinglaj', district: 'Kolhapur', state: 'Maharashtra' },
    { village: 'Indapur', pincode: '413106', taluka: 'Indapur', district: 'Kolhapur', state: 'Maharashtra' }
  ];

  const getLocation = (index: number) => {
    return locations[index % locations.length];
  };

  // Realistic occupations list
  const occupations = [
    'Farmer', 'Student', 'Tailor', 'Shop Owner', 'Teacher',
    'Housewife', 'Milk Producer', 'Handicraft Worker', 'Business Owner', 'Labour Worker'
  ];

  // SHG Role list
  const shgRoles = ['CRP', 'Leader', 'Member'];

  console.log('Seeding Community Members...');
  
  // SHG Mock Data (10 Pending, 10 Approved, 5 Rejected)
  const shgStatuses = [
    ...Array(10).fill('PENDING'),
    ...Array(10).fill('APPROVED'),
    ...Array(5).fill('REJECTED'),
  ];

  for (let i = 0; i < shgStatuses.length; i++) {
    const status = shgStatuses[i];
    const num = i + 1;
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const name = shgNames[i % shgNames.length];
    const role = shgRoles[i % shgRoles.length];
    const occupation = occupations[i % occupations.length];
    const loc = getLocation(i);

    await prisma.communityMember.create({
      data: {
        memberCode: `SHG-MC-${100 + num}`,
        type: 'SHG',
        status: status,
        approvedAt: isApproved ? new Date() : null,
        rejectedAt: isRejected ? new Date() : null,
        
        profilePhoto: `https://images.unsplash.com/photo-${1500000000000 + num * 1000}?auto=format&fit=crop&w=150&h=150`,
        fullName: name,
        mobileNumber: randomMobile(),
        age: 25 + (num % 30),
        occupation: occupation,

        roleInShg: role,
        shgName: `Savitribai Phule Mahila SHG ${Math.ceil(num / 3)}`,
        crpName: `Rekha Bhosale`,
        crpMobile: randomMobile(),
        crpEmail: `crp.rekha${num}@example.com`,
        leaderName: `Sunita Patil`,
        leaderMobile: randomMobile(),
        groupSize: 10 + (num % 5),
        activeSince: '2022',

        producesProducts: true,
        businessTeamSize: 3 + (num % 4),
        productName: num % 2 === 0 ? 'Handmade Soap' : 'Organic Honey',
        productCategory: 'HANDMADE',
        dailyProduction: 50.0 + num * 2,
        weeklyProduction: 300.0 + num * 12,
        productionUnit: 'Kg',
        pricePerUnit: 120.0 + num,

        houseNo: `House No. ${45 + num}`,
        deliveryAddress: `Galli No. ${num % 3 + 1}, Ward ${num}`,
        village: loc.village,
        taluka: loc.taluka,
        district: loc.district,
        state: loc.state,
        pincode: loc.pincode,

        aadhaarNumber: `54321234000${num}`,
        panNumber: `ABCDE123${num}Z`,
        aadhaarFrontPhoto: 'https://placehold.co/600x400?text=Aadhaar+Front',
        aadhaarBackPhoto: 'https://placehold.co/600x400?text=Aadhaar+Back',
        panCardPhoto: 'https://placehold.co/600x400?text=PAN+Card',

        accountHolderName: name,
        accountNumber: `30987654321${num}`,
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        branchName: 'Gadhinglaj Branch',
        upiId: `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`,

        storageSpace: 'Room',
        storageWidth: 10.0,
        storageHeight: 12.0,
        storageDescription: 'Clean dry ventilated room',

        vehicleAvailable: num % 3 === 0,
        vehicleType: num % 3 === 0 ? 'Three Wheeler' : null,
        vehicleRegistrationNumber: num % 3 === 0 ? `MH-09-XX-123${num}` : null,
        drivingLicenseNumber: num % 3 === 0 ? `DL-091234567${num}` : null,
        drivingLicensePhoto: num % 3 === 0 ? 'https://placehold.co/600x400?text=Driving+License' : null,
        vehiclePhoto: num % 3 === 0 ? 'https://placehold.co/600x400?text=Vehicle+Photo' : null,
      },
    });
  }

  // Individual Mock Data (10 Pending, 10 Approved, 5 Rejected)
  const indStatuses = [
    ...Array(10).fill('PENDING'),
    ...Array(10).fill('APPROVED'),
    ...Array(5).fill('REJECTED'),
  ];

  for (let i = 0; i < indStatuses.length; i++) {
    const status = indStatuses[i];
    const num = i + 1;
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const name = individualNames[i % individualNames.length];
    const occupation = occupations[(i + 3) % occupations.length];
    const loc = getLocation(i + 1); // offset to distribute locations differently

    await prisma.communityMember.create({
      data: {
        memberCode: `IND-MC-${100 + num}`,
        type: 'INDIVIDUAL',
        status: status,
        approvedAt: isApproved ? new Date() : null,
        rejectedAt: isRejected ? new Date() : null,
        
        profilePhoto: `https://images.unsplash.com/photo-${1500000000000 + num * 2000}?auto=format&fit=crop&w=150&h=150`,
        fullName: name,
        mobileNumber: randomMobile(),
        age: 20 + (num % 25),
        occupation: occupation,

        producesProducts: true,
        businessTeamSize: 1,
        productName: num % 2 === 0 ? 'Cow Milk' : 'Ghee',
        productCategory: 'DAIRY',
        dailyProduction: 20.0 + num,
        weeklyProduction: 140.0 + num * 7,
        productionUnit: 'Liters',
        pricePerUnit: 60.0 + num,

        houseNo: `Plot No. ${12 + num}`,
        deliveryAddress: `Main Road, Near Temple, Ward ${num}`,
        village: loc.village,
        taluka: loc.taluka,
        district: loc.district,
        state: loc.state,
        pincode: loc.pincode,

        aadhaarNumber: `12345678901${num}`,
        panNumber: `XYZAB987${num}Y`,
        aadhaarFrontPhoto: 'https://placehold.co/600x400?text=Aadhaar+Front',
        aadhaarBackPhoto: 'https://placehold.co/600x400?text=Aadhaar+Back',
        panCardPhoto: 'https://placehold.co/600x400?text=PAN+Card',

        accountHolderName: name,
        accountNumber: `40987654321${num}`,
        ifscCode: 'ICIC0005678',
        bankName: 'ICICI Bank',
        branchName: 'Nesari Branch',
        upiId: `${name.toLowerCase().replace(/\s+/g, '')}@okicici`,

        storageSpace: 'Shelf',
        storageWidth: 4.0,
        storageHeight: 6.0,
        storageDescription: 'Cold storage refrigerator shelf',

        vehicleAvailable: num % 2 === 0,
        vehicleType: num % 2 === 0 ? 'Two Wheeler' : null,
        vehicleRegistrationNumber: num % 2 === 0 ? `MH-09-YY-987${num}` : null,
        drivingLicenseNumber: num % 2 === 0 ? `DL-099876543${num}` : null,
        drivingLicensePhoto: num % 2 === 0 ? 'https://placehold.co/600x400?text=Driving+License' : null,
        vehiclePhoto: num % 2 === 0 ? 'https://placehold.co/600x400?text=Vehicle+Photo' : null,
      },
    });
  }

  console.log('Seeded Community Members.');

  console.log('Seeding Transporters...');
  
  // Real Route Partner names (25 names)
  const routePartnerNames = [
    { firstName: 'Mahesh', lastName: 'Arjun Kadam' },
    { firstName: 'Prakash', lastName: 'Patil' },
    { firstName: 'Sanjay', lastName: 'Powar' },
    { firstName: 'Rohit', lastName: 'Chavan' },
    { firstName: 'Ajit', lastName: 'Jadhav' },
    { firstName: 'Nilesh', lastName: 'Patil' },
    { firstName: 'Suresh', lastName: 'Bhosale' },
    { firstName: 'Vinayak', lastName: 'Kamble' },
    { firstName: 'Aniket', lastName: 'More' },
    { firstName: 'Dinesh', lastName: 'Gaikwad' },
    { firstName: 'Santosh', lastName: 'Patil' },
    { firstName: 'Balaji', lastName: 'Shinde' },
    { firstName: 'Rajesh', lastName: 'Chavan' },
    { firstName: 'Sachin', lastName: 'Jadhav' },
    { firstName: 'Amol', lastName: 'Kadam' },
    { firstName: 'Sunil', lastName: 'Powar' },
    { firstName: 'Vikram', lastName: 'Patil' },
    { firstName: 'Harish', lastName: 'Bhosale' },
    { firstName: 'Pradeep', lastName: 'Gaikwad' },
    { firstName: 'Sandip', lastName: 'More' },
    { firstName: 'Milind', lastName: 'Deshmukh' },
    { firstName: 'Prashant', lastName: 'Joshi' },
    { firstName: 'Satish', lastName: 'Chavan' },
    { firstName: 'Kiran', lastName: 'Kamble' },
    { firstName: 'Nikhil', lastName: 'Patil' }
  ];

  // Real Personal Transporter names (25 names)
  const personalTransporterNames = [
    { firstName: 'Vikas', lastName: 'Shinde' },
    { firstName: 'Suresh', lastName: 'Patil' },
    { firstName: 'Amol', lastName: 'Kadam' },
    { firstName: 'Sunil', lastName: 'Jadhav' },
    { firstName: 'Ramesh', lastName: 'Chavan' },
    { firstName: 'Jayesh', lastName: 'Bhosale' },
    { firstName: 'Dattatray', lastName: 'More' },
    { firstName: 'Ashish', lastName: 'Powar' },
    { firstName: 'Shubham', lastName: 'Kamble' },
    { firstName: 'Mayur', lastName: 'Patil' },
    { firstName: 'Akshay', lastName: 'Gaikwad' },
    { firstName: 'Tushar', lastName: 'More' },
    { firstName: 'Pramod', lastName: 'Jadhav' },
    { firstName: 'Gopal', lastName: 'Chavan' },
    { firstName: 'Karan', lastName: 'Shinde' },
    { firstName: 'Chetan', lastName: 'Kadam' },
    { firstName: 'Pranay', lastName: 'Patil' },
    { firstName: 'Sameer', lastName: 'Bhosale' },
    { firstName: 'Sudhir', lastName: 'Kamble' },
    { firstName: 'Swapnil', lastName: 'Deshmukh' },
    { firstName: 'Vivek', lastName: 'Joshi' },
    { firstName: 'Kundan', lastName: 'More' },
    { firstName: 'Manoj', lastName: 'Gaikwad' },
    { firstName: 'Dipak', lastName: 'Patil' },
    { firstName: 'Omkar', lastName: 'Powar' }
  ];

  // Route Partners (10 Pending, 10 Approved, 5 Rejected)
  const rpStatuses = [
    ...Array(10).fill('PENDING'),
    ...Array(10).fill('APPROVED'),
    ...Array(5).fill('REJECTED'),
  ];

  for (let i = 0; i < rpStatuses.length; i++) {
    const status = rpStatuses[i];
    const num = i + 1;
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const nameObj = routePartnerNames[i % routePartnerNames.length];
    const loc = getLocation(i);

    await prisma.transporterMember.create({
      data: {
        transporterCode: `RP-TR-${100 + num}`,
        type: 'ROUTE_PARTNER',
        status: status,
        approvedAt: isApproved ? new Date() : null,
        rejectedAt: isRejected ? new Date() : null,

        profilePhoto: `https://images.unsplash.com/photo-${1500000000000 + num * 3000}?auto=format&fit=crop&w=150&h=150`,
        firstName: nameObj.firstName,
        lastName: nameObj.lastName,
        mobileNumber: randomMobile(),
        email: `${nameObj.firstName.toLowerCase()}.${nameObj.lastName.toLowerCase().replace(/\s+/g, '')}@example.com`,

        residentialAddress: `Flat ${300 + num}, B Wing, Residency Apartment`,
        village: loc.village,
        taluka: loc.taluka,
        district: loc.district,
        state: loc.state,
        pincode: loc.pincode,

        licenseNumber: `DL-MH09-2023-${10000 + num}`,
        licensePhoto: 'https://placehold.co/600x400?text=Drivers+License',
        licenseExpiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
        experienceYears: 3 + (num % 10),

        accountHolderName: `${nameObj.firstName} ${nameObj.lastName}`,
        accountNumber: `50987654321${num}`,
        ifscCode: 'HDFC0000123',
        bankName: 'HDFC Bank',
        branchName: 'Kolhapur Branch',
        upiId: `${nameObj.firstName.toLowerCase()}${num}@okhdfc`,

        vehicleCategory: 'Four Wheeler',
        vehicleType: 'Pickup Truck',
        vehicleMake: 'Tata Motors',
        vehicleNumber: `MH-09-RP-432${num}`,
        vehicleRcPhoto: 'https://placehold.co/600x400?text=Vehicle+RC',
        vehicleInsurancePhoto: 'https://placehold.co/600x400?text=Vehicle+Insurance',

        // Only allowed villages and pincodes in JSON lists
        assignedPincodes: ['416502', '416504', '416501', '413106'],
        assignedVillages: ['Gadhinglaj', 'Nesari', 'Dundage', 'Indapur'],
        morningShift: '06:00 AM - 11:00 AM',
        eveningShift: '04:00 PM - 09:00 PM',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
    });
  }

  // Personal Transporters (10 Pending, 10 Approved, 5 Rejected)
  const ptStatuses = [
    ...Array(10).fill('PENDING'),
    ...Array(10).fill('APPROVED'),
    ...Array(5).fill('REJECTED'),
  ];

  for (let i = 0; i < ptStatuses.length; i++) {
    const status = ptStatuses[i];
    const num = i + 1;
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';
    const nameObj = personalTransporterNames[i % personalTransporterNames.length];
    const loc = getLocation(i + 2); // offset location

    await prisma.transporterMember.create({
      data: {
        transporterCode: `PT-TR-${100 + num}`,
        type: 'PERSONAL',
        status: status,
        approvedAt: isApproved ? new Date() : null,
        rejectedAt: isRejected ? new Date() : null,

        profilePhoto: `https://images.unsplash.com/photo-${1500000000000 + num * 4000}?auto=format&fit=crop&w=150&h=150`,
        firstName: nameObj.firstName,
        lastName: nameObj.lastName,
        mobileNumber: randomMobile(),
        email: `${nameObj.firstName.toLowerCase()}.${nameObj.lastName.toLowerCase().replace(/\s+/g, '')}@example.com`,

        residentialAddress: `House No. ${num}, Lane ${num % 2 === 0 ? 'A' : 'B'}, Village ${loc.village}`,
        village: loc.village,
        taluka: loc.taluka,
        district: loc.district,
        state: loc.state,
        pincode: loc.pincode,

        licenseNumber: `DL-MH09-2024-${20000 + num}`,
        licensePhoto: 'https://placehold.co/600x400?text=Drivers+License',
        licenseExpiryDate: new Date(Date.now() + 8 * 365 * 24 * 60 * 60 * 1000),
        experienceYears: 1 + (num % 5),

        accountHolderName: `${nameObj.firstName} ${nameObj.lastName}`,
        accountNumber: `60987654321${num}`,
        ifscCode: 'BARB0GADHI',
        bankName: 'Bank of Baroda',
        branchName: 'Gadhinglaj Branch',
        upiId: `${nameObj.firstName.toLowerCase()}${num}@okbaroda`,

        vehicleCategory: 'Two Wheeler',
        vehicleType: 'Motorcycle',
        vehicleMake: 'Hero MotoCorp',
        vehicleNumber: `MH-09-PT-987${num}`,
        vehicleRcPhoto: 'https://placehold.co/600x400?text=Vehicle+RC',
        vehicleInsurancePhoto: 'https://placehold.co/600x400?text=Vehicle+Insurance',

        assignedPincodes: [loc.pincode],
        assignedVillages: [loc.village],
        morningShift: '07:00 AM - 10:00 AM',
        eveningShift: '05:00 PM - 08:00 PM',
        workingDays: ['Monday', 'Wednesday', 'Friday'],

        milkOrganizationName: 'Gokul Dairy Sangathan',
        milkCenterName: `Center No. ${num * 2}`,
      },
    });
  }
  console.log('Seeded Transporters.');

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
      village: 'Gadhinglaj',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416502'
    },
    {
      id: 2,
      sellerCode: 'SEL002',
      sellerName: 'Lata Mangeshk Gaikwad',
      mobileNumber: '9876500002',
      email: 'lata.gaikwad@example.com',
      addressLine1: 'Main Galli, Ward 2',
      village: 'Nesari',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416504'
    },
    {
      id: 3,
      sellerCode: 'SEL003',
      sellerName: 'Anita Rameshw Chavan',
      mobileNumber: '9876500003',
      email: 'anita.chavan@example.com',
      addressLine1: 'Temple Road',
      village: 'Dundage',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416501'
    },
    {
      id: 4,
      sellerCode: 'SEL004',
      sellerName: 'Kavita Suresha Kadam',
      mobileNumber: '9876500004',
      email: 'kavita.kadam@example.com',
      addressLine1: 'Near Milk Dairy',
      village: 'Mahagaon',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416503'
    },
    {
      id: 5,
      sellerCode: 'SEL005',
      sellerName: 'Shalini Kishor Patil',
      mobileNumber: '9876500005',
      email: 'shalini.patil@example.com',
      addressLine1: 'Grampanchayat Lane',
      village: 'Inchnal',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416502'
    },
    {
      id: 6,
      sellerCode: 'SEL006',
      sellerName: 'Deepa Gajanan Kulkarni',
      mobileNumber: '9876500006',
      email: 'deepa.kulkarni@example.com',
      addressLine1: 'Station Road',
      village: 'Batkangale',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416502'
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
      village: 'Gadhinglaj',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416502'
    },
    {
      id: 2,
      buyerCode: 'BUY002',
      buyerName: 'Gauri Shankar Patil',
      mobileNumber: '9988700002',
      email: 'gauri.patil@example.com',
      addressLine1: 'Stand area, Main Road',
      village: 'Nesari',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416504'
    },
    {
      id: 3,
      buyerCode: 'BUY003',
      buyerName: 'Shweta Vinay More',
      mobileNumber: '9988700003',
      email: 'shweta.more@example.com',
      addressLine1: 'Near Ganpati Temple',
      village: 'Dundage',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416501'
    },
    {
      id: 4,
      buyerCode: 'BUY004',
      buyerName: 'Neha Vikas Chavan',
      mobileNumber: '9988700004',
      email: 'neha.chavan@example.com',
      addressLine1: 'Bazar Peth',
      village: 'Mahagaon',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416503'
    },
    {
      id: 5,
      buyerCode: 'BUY005',
      buyerName: 'Pooja Aditya Jadhav',
      mobileNumber: '9988700005',
      email: 'pooja.jadhav@example.com',
      addressLine1: 'Near School No 1',
      village: 'Inchnal',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416502'
    },
    {
      id: 6,
      buyerCode: 'BUY006',
      buyerName: 'Sonali Nitin Patil',
      mobileNumber: '9988700006',
      email: 'sonali.patil@example.com',
      addressLine1: 'Naka Chowk',
      village: 'Batkangale',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416502'
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

  // Query existing products for mock order items
  const existingProducts: any[] = await prisma.$queryRawUnsafe(`SELECT id, price FROM public.products;`);
  let products = existingProducts;
  if (products.length === 0) {
    console.log('No products found in public.products, inserting default products for reference...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.products (id, name, category, price, stock, weight, seller_id, created_at)
      VALUES 
        (1, 'Pickle', 'FOOD', 110.0, 500, 1.0, 7, NOW()),
        (3, 'Papad', 'FOOD', 100.0, 500, 0.5, 8, NOW());
    `);
    products = [
      { id: 1, price: 110.0 },
      { id: 3, price: 100.0 }
    ];
  }

  // Seed 20 Pickup Orders
  console.log('Seeding 20 pickup orders in ORDER_PLACED status...');
  for (let i = 1; i <= 20; i++) {
    const seller = sellersData[(i - 1) % sellersData.length];
    const buyer = buyersData[(i - 1) % buyersData.length];
    const product = products[(i - 1) % products.length];
    
    const qty = 2 + (i % 5);
    const itemPrice = Number(product.price || 100.0);
    const totalAmount = qty * itemPrice;
    const totalWeight = parseFloat((qty * 0.5).toFixed(2));
    const orderNo = `ORD-PICK-${1000 + i}`;

    // 1. Create in gmu schema Order table
    await prisma.order.create({
      data: {
        orderId: orderNo,
        barcode: null,
        sellerId: seller.id,
        buyerId: buyer.id,
        productCount: 1,
        totalQty: qty,
        totalWeight: totalWeight,
        pickupShgId: null,
        pickupTransporterId: null,
        mainStatus: 'ORDER_PLACED',
        pickupShgStatus: null,
        pickupTransporterStatus: null,
      }
    });

    // 2. Create in public schema master_orders
    const insertMo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.master_orders (order_number, buyer_id, total_amount, payment_status, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'PENDING', 'CREATED', NOW(), NOW())
      RETURNING id;
    `, orderNo, buyer.id, totalAmount);
    const masterOrderId = insertMo[0].id;

    // 3. Create in public schema master_order_items
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.master_order_items (master_order_id, product_id, seller_id, quantity, price)
      VALUES ($1, $2, $3, $4, $5);
    `, masterOrderId, product.id, seller.id, qty, itemPrice);

    // 4. Create in public schema pickup_orders
    const insertPo: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO public.pickup_orders (pickup_order_number, master_order_id, seller_id, status, created_at)
      VALUES ($1, $2, $3, 'PENDING', NOW())
      RETURNING id;
    `, `PKP-${orderNo}`, masterOrderId, seller.id);
    const pickupOrderId = insertPo[0].id;

    // 5. Create in public schema pickup_order_items
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.pickup_order_items (pickup_order_id, product_id, quantity)
      VALUES ($1, $2, $3);
    `, pickupOrderId, product.id, qty);

    // 6. Create in public schema pickup_tracking
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.pickup_tracking (pickup_order_id, status, remarks, updated_at)
      VALUES ($1, 'PENDING', 'Order created', NOW());
    `, pickupOrderId);
  }

  console.log('Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
