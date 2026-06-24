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

  const approvedShgs = await prisma.communityMember.findMany({
    where: { type: 'SHG', status: 'APPROVED' },
  });
  const approvedTransporters = await prisma.transporterMember.findMany({
    where: { status: 'APPROVED' },
  });

  if (approvedShgs.length === 0 || approvedTransporters.length === 0) {
    console.log('WARNING: Seeding orders skipped because no approved SHGs or Transporters exist.');
    return;
  }

  // 1. Seed 20 Pickup Orders
  for (let i = 1; i <= 20; i++) {
    const shg = approvedShgs[(i - 1) % approvedShgs.length];
    const transporter = approvedTransporters[(i - 1) % approvedTransporters.length];
    
    let mainStatus = 'ORDER_PLACED';
    let pickupShgStatus: string | null = null;
    let pickupTransporterStatus: string | null = null;
    let pickupShgId: string | null = null;
    let pickupTransporterId: string | null = null;
    let barcode: string | null = null;

    const sellerLoc = {
      village: shg.village || 'Gadhinglaj',
      pincode: shg.pincode || '416502',
      taluka: shg.taluka || 'Gadhinglaj',
      district: shg.district || 'Kolhapur',
      state: shg.state || 'Maharashtra'
    };

    const buyerLoc = getLocation(i + 3);
    const buyerName = buyerNames[i % buyerNames.length];

    await prisma.order.create({
      data: {
        orderId: `ORD-PICK-${1000 + i}`,
        barcode,
        sellerName: shg.fullName,
        sellerMobile: shg.mobileNumber,
        sellerVillage: sellerLoc.village,
        sellerTaluka: sellerLoc.taluka,
        sellerDistrict: sellerLoc.district,
        sellerState: sellerLoc.state,
        sellerPincode: sellerLoc.pincode,
        
        buyerName,
        buyerMobile: '9988776655',
        buyerVillage: buyerLoc.village,
        buyerTaluka: buyerLoc.taluka,
        buyerDistrict: buyerLoc.district,
        buyerState: buyerLoc.state,
        buyerPincode: buyerLoc.pincode,
        
        productCount: 1,
        totalQty: 2 + (i % 5),
        totalWeight: 3.5 + i,
        
        pickupShgId,
        pickupTransporterId,
        mainStatus,
        pickupShgStatus,
        pickupTransporterStatus,
      },
    });
  }

  // 2. Seed 10 Drop Orders
  for (let i = 1; i <= 10; i++) {
    const shg = approvedShgs[(i - 1) % approvedShgs.length];
    const transporter = approvedTransporters[(i - 1) % approvedTransporters.length];

    let mainStatus = 'DROP_ASSIGNED';
    let dropShgStatus: string | null = null;
    let dropTransporterStatus: string | null = null;
    let dropShgId: string | null = null;
    let dropTransporterId: string | null = null;
    let deliveredAt: Date | null = null;

    // Distribute statuses across stages (0 to 6)
    const stage = i % 7;

    if (stage === 1) {
      mainStatus = 'DROP_TRANSPORTER_ACCEPTED';
      dropTransporterStatus = 'TRANSPORTER_ACCEPTED';
      dropTransporterId = transporter.id;
    } else if (stage === 2) {
      mainStatus = 'IN_TRANSIT_TO_DROP_SHG';
      dropTransporterStatus = 'IN_TRANSIT_TO_DROP_SHG';
      dropTransporterId = transporter.id;
    } else if (stage === 3) {
      mainStatus = 'PARCEL_AT_DROP_SHG';
      dropTransporterStatus = 'DELIVERED';
      dropTransporterId = transporter.id;
    } else if (stage === 4) {
      mainStatus = 'DROP_SHG_ACCEPTED';
      dropShgStatus = 'ACCEPTED';
      dropShgId = shg.id;
      dropTransporterStatus = 'DELIVERED';
      dropTransporterId = transporter.id;
    } else if (stage === 5) {
      mainStatus = 'DELIVERED';
      dropShgStatus = 'DELIVERED';
      dropShgId = shg.id;
      dropTransporterStatus = 'DELIVERED';
      dropTransporterId = transporter.id;
      deliveredAt = new Date();
    } else if (stage === 6) {
      mainStatus = 'COMPLETED';
      dropShgStatus = 'DELIVERED';
      dropShgId = shg.id;
      dropTransporterStatus = 'DELIVERED';
      dropTransporterId = transporter.id;
      deliveredAt = new Date();
    }

    const sellerName = individualNames[i % individualNames.length]; // Realistic seller name from our list
    const sellerLoc = getLocation(i + 2);
    const buyerLoc = {
      village: shg.village || 'Nesari',
      pincode: shg.pincode || '416504',
      taluka: shg.taluka || 'Gadhinglaj',
      district: shg.district || 'Kolhapur',
      state: shg.state || 'Maharashtra'
    };

    const order = await prisma.order.create({
      data: {
        orderId: `ORD-DROP-${1000 + i}`,
        sellerName,
        sellerMobile: '9876543201',
        sellerVillage: sellerLoc.village,
        sellerTaluka: sellerLoc.taluka,
        sellerDistrict: sellerLoc.district,
        sellerState: sellerLoc.state,
        sellerPincode: sellerLoc.pincode,

        buyerName: shg.fullName,
        buyerMobile: shg.mobileNumber,
        buyerVillage: buyerLoc.village,
        buyerTaluka: buyerLoc.taluka,
        buyerDistrict: buyerLoc.district,
        buyerState: buyerLoc.state,
        buyerPincode: buyerLoc.pincode,

        productCount: 1,
        totalQty: 1 + (i % 3),
        totalWeight: 2.0 + i * 0.5,

        dropShgId,
        dropTransporterId,
        mainStatus,
        dropShgStatus,
        dropTransporterStatus,
        deliveredAt,
      },
    });

    // Create assignments to keep relations valid
    if (mainStatus === 'DROP_ASSIGNED') {
      await prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transporter.id,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'PENDING',
        },
      });
    } else if (mainStatus === 'DROP_TRANSPORTER_ACCEPTED' || mainStatus === 'IN_TRANSIT_TO_DROP_SHG' || mainStatus === 'PARCEL_AT_DROP_SHG') {
      await prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transporter.id,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'ACCEPTED',
        },
      });
    } else if (mainStatus === 'DROP_SHG_ACCEPTED' || mainStatus === 'DELIVERED' || mainStatus === 'COMPLETED') {
      await prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: transporter.id,
          assigneeType: 'TRANSPORTER',
          role: 'DROP',
          status: 'ACCEPTED',
        },
      });
      await prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: shg.id,
          assigneeType: 'SHG',
          role: 'DROP',
          status: 'ACCEPTED',
        },
      });
    }
  }

  // 3. Seed 5 Transporter Return Orders
  for (let i = 1; i <= 5; i++) {
    const shg = approvedShgs[(i - 1) % approvedShgs.length];
    const transporter = approvedTransporters[(i - 1) % approvedTransporters.length];

    const mainStatus = i % 2 === 0 ? 'ON_HOLD' : 'TRANSPORTER_RETURN';
    const buyerName = buyerNames[(i + 4) % buyerNames.length]; // Realistic buyer name
    const buyerLoc = getLocation(i + 1);
    const sellerLoc = {
      village: shg.village || 'Gadhinglaj',
      pincode: shg.pincode || '416502',
      taluka: shg.taluka || 'Gadhinglaj',
      district: shg.district || 'Kolhapur',
      state: shg.state || 'Maharashtra'
    };

    await prisma.order.create({
      data: {
        orderId: `ORD-RET-T-${1000 + i}`,
        sellerName: shg.fullName,
        sellerMobile: shg.mobileNumber,
        sellerVillage: sellerLoc.village,
        sellerTaluka: sellerLoc.taluka,
        sellerDistrict: sellerLoc.district,
        sellerState: sellerLoc.state,
        sellerPincode: sellerLoc.pincode,

        buyerName,
        buyerMobile: '9000000000',
        buyerVillage: buyerLoc.village,
        buyerTaluka: buyerLoc.taluka,
        buyerDistrict: buyerLoc.district,
        buyerState: buyerLoc.state,
        buyerPincode: buyerLoc.pincode,

        productCount: 1,
        totalQty: 2,
        totalWeight: 4.0,

        dropTransporterId: transporter.id,
        mainStatus,
        returnType: 'TRANSPORTER_RETURN',
      },
    });
  }

  // 4. Seed 6 Buyer Return Orders
  for (let i = 1; i <= 6; i++) {
    const shg = approvedShgs[(i - 1) % approvedShgs.length];
    const transporter = approvedTransporters[(i - 1) % approvedTransporters.length];

    let mainStatus = 'RETURN_SHG_ASSIGNED';
    let returnTransporterId: string | null = null;

    if (i === 2) {
      mainStatus = 'RETURN_PARCEL_AT_SHG';
    } else if (i === 3) {
      mainStatus = 'RETURN_TRANSPORTER_PENDING';
    } else if (i === 4) {
      mainStatus = 'RETURN_TRANSPORTER_ACCEPTED';
      returnTransporterId = transporter.id;
    } else if (i === 5) {
      mainStatus = 'RETURN_IN_TRANSIT_TO_GMU';
      returnTransporterId = transporter.id;
    } else if (i === 6) {
      mainStatus = 'COMPLETED';
      returnTransporterId = transporter.id;
    }

    const sellerName = individualNames[(i + 4) % individualNames.length]; // Realistic male seller name
    const sellerLoc = getLocation(i + 2);
    const buyerLoc = {
      village: shg.village || 'Nesari',
      pincode: shg.pincode || '416504',
      taluka: shg.taluka || 'Gadhinglaj',
      district: shg.district || 'Kolhapur',
      state: shg.state || 'Maharashtra'
    };

    await prisma.order.create({
      data: {
        orderId: `ORD-RET-B-${1000 + i}`,
        sellerName,
        sellerMobile: '9876543201',
        sellerVillage: sellerLoc.village,
        sellerTaluka: sellerLoc.taluka,
        sellerDistrict: sellerLoc.district,
        sellerState: sellerLoc.state,
        sellerPincode: sellerLoc.pincode,

        buyerName: shg.fullName,
        buyerMobile: shg.mobileNumber,
        buyerVillage: buyerLoc.village,
        buyerTaluka: buyerLoc.taluka,
        buyerDistrict: buyerLoc.district,
        buyerState: buyerLoc.state,
        buyerPincode: buyerLoc.pincode,

        productCount: 1,
        totalQty: 3,
        totalWeight: 5.5,

        dropShgId: shg.id,
        dropTransporterId: transporter.id,
        pickupReturnShgId: shg.id,
        returnTransporterId,

        mainStatus,
        returnType: 'BUYER_RETURN',
      },
    });
  }

  console.log('Seeded Orders.');
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
