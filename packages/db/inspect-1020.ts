import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBroadcast1020() {
  console.log('=== TESTING TRANSPORTER BROADCAST MATCHING FOR ORD-PICK-1020 ===\n');

  const order = await prisma.order.findFirst({
    where: { orderId: 'ORD-PICK-1020', phase: 'PICKUP' },
    include: { seller: true, buyer: true }
  });

  if (!order) {
    console.log('Order ORD-PICK-1020 not found');
    return;
  }

  console.log(`Order ID: ${order.id} (${order.orderId})`);
  console.log(`Seller Village: ${order.seller?.village}, Pincode: ${order.seller?.pincode}`);
  console.log(`Total Weight: ${order.totalWeight} kg`);

  // Query approved transporters
  const approvedTransporters = await prisma.$queryRawUnsafe(`
    SELECT u.id, u."fullName", a."postOffice", rd."operatingArea", rd."pickupLocations", od."minWeight", od."maxWeight", od."ratePerKm"
    FROM public."User" u
    JOIN public."Address" a ON u.id = a."userId"
    LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
    LEFT JOIN public."OtherDetails" od ON u.id = od."userId"
    WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
  `) as any[];

  console.log(`\nFound ${approvedTransporters.length} total approved transporters in DB.\n`);

  const p = order.seller?.pincode?.trim()?.toLowerCase();
  const v = order.seller?.village?.trim()?.toLowerCase();

  const parseJsonArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) {}
    }
    return [];
  };

  const normalizeStr = (s: string) => {
    if (!s) return '';
    return s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  };

  const getTransporterInfo = (tr: any) => {
    const areas = tr.operatingArea
      ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
      : [];
    const villages = areas;
    const pincodes = parseJsonArray(tr.pickupLocations).map((s: any) => String(s).trim().toLowerCase());
    const transporterPostOffice = tr.postOffice ? normalizeStr(tr.postOffice) : '';
    return { areas, villages, pincodes, postOffice: transporterPostOffice };
  };

  // Step 1 & 2: Village Match AND Pincode Match
  const locationMatched = approvedTransporters.filter((tr) => {
    const { areas, villages, pincodes } = getTransporterInfo(tr);
    const villageMatches = Boolean(v && (villages.includes(normalizeStr(v)) || areas.includes(v)));
    const pinMatches = Boolean(p && (pincodes.includes(p) || areas.includes(p)));
    return villageMatches && pinMatches;
  });

  console.log(`Location Matched Count (Village + Pincode): ${locationMatched.length}`);
  for (const tr of locationMatched) {
    console.log(`  - Transporter ID: ${tr.id} (${tr.fullName}): minWeight=${tr.minWeight}, maxWeight=${tr.maxWeight}, ratePerKm=${tr.ratePerKm}`);
  }

  // Step 3: Weight Capacity Match
  const totalWeight = Number(order.totalWeight || 0);
  const weightEligible = locationMatched.filter((tr) => {
    const minW = tr.minWeight !== null && tr.minWeight !== undefined ? Number(tr.minWeight) : null;
    const maxW = tr.maxWeight !== null && tr.maxWeight !== undefined ? Number(tr.maxWeight) : null;

    if (minW !== null && totalWeight < minW) return false;
    if (maxW !== null && totalWeight > maxW) return false;
    return true;
  });

  console.log(`\nWeight Eligible Count (Weight=${totalWeight}kg): ${weightEligible.length}`);
  for (const tr of weightEligible) {
    console.log(`  - Transporter ID: ${tr.id} (${tr.fullName}): minWeight=${tr.minWeight}, maxWeight=${tr.maxWeight}, ratePerKm=${tr.ratePerKm}`);
  }

  // Step 4: Lowest Rate Selection
  const validRates = weightEligible
    .map(tr => (tr.ratePerKm !== null && tr.ratePerKm !== undefined ? Number(tr.ratePerKm) : null))
    .filter((r): r is number => r !== null && !isNaN(r));

  let finalSelected = weightEligible;
  if (validRates.length > 0) {
    const minRate = Math.min(...validRates);
    console.log(`\nLowest Rate Found: ₹${minRate}/km`);
    finalSelected = weightEligible.filter((tr) => {
      const rate = tr.ratePerKm !== null && tr.ratePerKm !== undefined ? Number(tr.ratePerKm) : null;
      return rate === minRate;
    });
  }

  console.log(`\nFINAL SELECTED TRANSPORTERS FOR BROADCAST (${finalSelected.length}):`);
  for (const tr of finalSelected) {
    console.log(`  ==> Transporter ID: ${tr.id} (${tr.fullName}), Rate: ₹${tr.ratePerKm}/km, Capacity: ${tr.minWeight}-${tr.maxWeight}kg`);
  }

  // Perform actual cleanup of old pending assignments and update to new ones!
  console.log('\n--- Cleaning up old pending assignments for ORD-PICK-1020 ---');
  await prisma.orderAssignment.deleteMany({
    where: {
      orderId: order.id,
      role: 'PICKUP',
      assigneeType: 'TRANSPORTER',
      status: 'PENDING'
    }
  });

  for (const tr of finalSelected) {
    await prisma.orderAssignment.create({
      data: {
        orderId: order.id,
        assigneeId: String(tr.id),
        assigneeType: 'TRANSPORTER',
        role: 'PICKUP',
        status: 'PENDING'
      }
    });
  }

  console.log('Updated database assignments successfully!');
}

testBroadcast1020()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
