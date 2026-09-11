import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedGMUHubs() {
  console.log('Seeding GMU Hubs & Coordinator Logins...');

  const hubsData = [
    {
      hubCode: 'HUB-NESARI',
      name: 'Nesari GMU Hub',
      addressLine1: 'Main Road, Near Bus Stand',
      addressLine2: 'Central Supply Depot',
      village: 'Nesari',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416504',
      isActive: true,
    },
    {
      hubCode: 'HUB-GADHINGLAJ',
      name: 'Gadhinglaj GMU Hub',
      addressLine1: 'Market Yard, APMC Complex',
      addressLine2: 'Gate No. 2 Warehouse',
      village: 'Gadhinglaj',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416502',
      isActive: true,
    },
    {
      hubCode: 'HUB-WAGHARALI',
      name: 'Wagharali GMU Hub',
      addressLine1: 'Gram Panchayat Building Road',
      addressLine2: 'Collection Centre',
      village: 'Wagharali',
      taluka: 'Gadhinglaj',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416504',
      isActive: true,
    },
  ];

  for (const hubData of hubsData) {
    await prisma.hub.upsert({
      where: { hubCode: hubData.hubCode },
      update: {
        name: hubData.name,
        addressLine1: hubData.addressLine1,
        addressLine2: hubData.addressLine2,
        village: hubData.village,
        taluka: hubData.taluka,
        district: hubData.district,
        state: hubData.state,
        pincode: hubData.pincode,
        isActive: true,
        deletedAt: null,
      },
      create: hubData,
    });
    console.log(`✓ Hub ${hubData.name} (${hubData.hubCode}) upserted successfully.`);
  }

  // Seed / update GMU Coordinator logins in User table
  const usersData = [
    { phone: '1111111111', name: 'Nesari GMU Coordinator', code: 'GMU-NESARI' },
    { phone: '2222222222', name: 'Gadhinglaj GMU Coordinator', code: 'GMU-GADHINGLAJ' },
    { phone: '3333333333', name: 'Wagharali GMU Coordinator', code: 'GMU-WAGHARALI' },
  ];

  for (const u of usersData) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: u.phone },
          { phoneNumber: `+91${u.phone}` },
        ],
      },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: u.name,
          role: 'INDIVIDUAL',
          applicationStatus: 'APPROVED',
        },
      });
      console.log(`✓ User ${u.phone} (${u.name}) updated successfully.`);
    } else {
      await prisma.user.create({
        data: {
          authId: randomUUID(),
          phoneNumber: u.phone,
          fullName: u.name,
          role: 'INDIVIDUAL',
          applicationStatus: 'APPROVED',
          uniqueCode: u.code,
        },
      });
      console.log(`✓ User ${u.phone} (${u.name}) created successfully.`);
    }
  }

  const allHubs = await prisma.hub.findMany();
  console.log('\n--- ALL HUBS IN DB ---');
  console.table(allHubs.map(h => ({ Code: h.hubCode, Name: h.name, Village: h.village, Pincode: h.pincode })));
}

seedGMUHubs()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
