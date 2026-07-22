import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('=== VERIFYING TRANSPORTER MATCHING ALGORITHM (WEIGHT & RATE) ===\n');

  // Fetch approved transporters with location and vehicle details
  const approvedTransporters = await prisma.$queryRawUnsafe(`
    SELECT u.id, u."fullName", a."postOffice", rd."operatingArea", rd."pickupLocations", od."minWeight", od."maxWeight", od."ratePerKm"
    FROM public."User" u
    JOIN public."Address" a ON u.id = a."userId"
    LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
    LEFT JOIN public."OtherDetails" od ON u.id = od."userId"
    WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
  `) as any[];

  console.log(`Found ${approvedTransporters.length} approved transporters in DB:\n`);
  for (const tr of approvedTransporters) {
    console.log(`- Transporter ID: ${tr.id} (${tr.fullName || 'N/A'})`);
    console.log(`  Operating Area: ${tr.operatingArea || 'N/A'}`);
    console.log(`  Pickup Locations: ${tr.pickupLocations || 'N/A'}`);
    console.log(`  minWeight: ${tr.minWeight ?? 'None'}, maxWeight: ${tr.maxWeight ?? 'None'}, ratePerKm: ₹${tr.ratePerKm ?? 'N/A'}/km\n`);
  }

  console.log('=== TEST MATCHING LOGIC SIMULATION ===');

  const testCases = [
    { label: 'Test 1: Small Shipment (5 kg)', weight: 5 },
    { label: 'Test 2: Medium Shipment (500 kg)', weight: 500 },
    { label: 'Test 3: Heavy Shipment (5000 kg)', weight: 5000 },
  ];

  for (const tc of testCases) {
    console.log(`\n--- ${tc.label} ---`);
    const weightNum = tc.weight;

    // Weight capacity check
    const weightEligible = approvedTransporters.filter((tr) => {
      const minW = tr.minWeight !== null && tr.minWeight !== undefined ? Number(tr.minWeight) : null;
      const maxW = tr.maxWeight !== null && tr.maxWeight !== undefined ? Number(tr.maxWeight) : null;

      if (minW !== null && weightNum < minW) return false;
      if (maxW !== null && weightNum > maxW) return false;
      return true;
    });

    console.log(`Weight Eligible Count: ${weightEligible.length}/${approvedTransporters.length}`);

    if (weightEligible.length > 0) {
      const rates = weightEligible
        .map(tr => tr.ratePerKm !== null && tr.ratePerKm !== undefined ? Number(tr.ratePerKm) : null)
        .filter((r): r is number => r !== null && !isNaN(r));

      if (rates.length > 0) {
        const minRate = Math.min(...rates);
        const best = weightEligible.filter(tr => Number(tr.ratePerKm) === minRate);
        console.log(`Lowest Rate Found: ₹${minRate}/km`);
        console.log(`Selected Transporter(s): ${best.map(b => `${b.id} (${b.fullName || 'N/A'})`).join(', ')}`);
      } else {
        console.log(`No ratePerKm specified on weight-eligible transporters. All ${weightEligible.length} selected.`);
      }
    } else {
      console.log('No transporters eligible for this weight.');
    }
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

runVerification()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
