import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTransporters() {
  console.log('=== FIXING TRANSPORTER DETAILS ===\n');

  const configs = [
    { id: 1, name: 'Balasaheb Patil', village: 'Nesari', pincode: '416504', minWeight: 2, maxWeight: 50, ratePerKm: 16.0, operatingArea: 'Nesari', pickupLocations: '["416504"]' },
    { id: 2, name: 'Sachin Sawant', village: 'Dundage', pincode: '416501', minWeight: 2, maxWeight: 30, ratePerKm: 15.5, operatingArea: 'Dundage', pickupLocations: '["416501"]' },
    { id: 3, name: 'Amol Joshi', village: 'Mahagaon', pincode: '416503', minWeight: 2, maxWeight: 40, ratePerKm: 14.0, operatingArea: 'Mahagaon', pickupLocations: '["416503"]' },
    { id: 4, name: 'Rahul Kulkarni', village: 'Batkanangale', pincode: '416503', minWeight: 2, maxWeight: 25, ratePerKm: 15.0, operatingArea: 'Batkanangale', pickupLocations: '["416503"]' },
    { id: 5, name: 'Sandip Patil', village: 'Inchnal', pincode: '416502', minWeight: 2, maxWeight: 35, ratePerKm: 14.8, operatingArea: 'Inchnal', pickupLocations: '["416502"]' },
    { id: 13, name: 'Mahendra Powar', village: 'Inchanal', pincode: '416502', minWeight: 2, maxWeight: 10, ratePerKm: 15.0, operatingArea: 'Inchanal, Nesari', pickupLocations: '["416502", "416504"]' },
    { id: 15, name: 'Suhas Powar', village: 'Inchanal', pincode: '416502', minWeight: 2, maxWeight: 20, ratePerKm: 15.0, operatingArea: 'Inchanal, Nesari', pickupLocations: '["416502", "416504"]' },
    { id: 16, name: 'Vallabh Ghatage', village: 'Dundage', pincode: '416501', minWeight: 2, maxWeight: 20, ratePerKm: 14.5, operatingArea: 'Dundage, Nesari', pickupLocations: '["416501", "416504"]' },
  ];

  for (const c of configs) {
    // 1. Address
    await prisma.$executeRawUnsafe(`
      UPDATE public."Address" 
      SET village = $1, pincode = $2, "updatedAt" = NOW()
      WHERE "userId" = $3;
    `, c.village, c.pincode, c.id);

    // 2. RouteDetail
    const rdExists = await prisma.$queryRawUnsafe(`
      SELECT "userId" FROM public."RouteDetail" WHERE "userId" = $1;
    `, c.id) as any[];

    if (rdExists.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE public."RouteDetail"
        SET "operatingArea" = $1, "pickupLocations" = $2::jsonb, "updatedAt" = NOW()
        WHERE "userId" = $3;
      `, c.operatingArea, c.pickupLocations, c.id);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public."RouteDetail" ("userId", "operatingArea", "pickupLocations", "createdAt", "updatedAt")
        VALUES ($1, $2, $3::jsonb, NOW(), NOW());
      `, c.id, c.operatingArea, c.pickupLocations);
    }

    // 3. OtherDetails
    const odExists = await prisma.$queryRawUnsafe(`
      SELECT id FROM public."OtherDetails" WHERE "userId" = $1;
    `, c.id) as any[];

    if (odExists.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE public."OtherDetails"
        SET "minWeight" = $1, "maxWeight" = $2, "ratePerKm" = $3, "updatedAt" = NOW()
        WHERE "userId" = $4;
      `, c.minWeight, c.maxWeight, c.ratePerKm, c.id);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public."OtherDetails" ("userId", "minWeight", "maxWeight", "ratePerKm", "vehicleType", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, 'THREE_WHEELER'::public."VehicleType", NOW(), NOW());
      `, c.id, c.minWeight, c.maxWeight, c.ratePerKm);
    }

    console.log(`Updated Transporter ID ${c.id} (${c.name}): Village=${c.village}, Pincode=${c.pincode}, Rate=₹${c.ratePerKm}/km, Weight=${c.minWeight}-${c.maxWeight}kg`);
  }

  console.log('\n=== ALL TRANSPORTER DETAILS UPDATED CLEANLY ===');
}

fixTransporters()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
