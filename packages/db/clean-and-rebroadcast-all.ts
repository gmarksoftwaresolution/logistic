import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAndRebroadcast() {
  console.log('=== CLEANING STALE TRANSPORTER ASSIGNMENTS & RE-BROADCASTING ===\n');

  // Fetch orders at PARCEL_AT_SHG stage
  const ordersAtShg = await prisma.order.findMany({
    where: {
      phase: 'PICKUP',
      mainStatus: 'PARCEL_AT_SHG',
      pickupTransporterId: null
    },
    include: { seller: true }
  });

  console.log(`Found ${ordersAtShg.length} active orders waiting for Transporter Pickup:\n`);

  for (const order of ordersAtShg) {
    console.log(`Evaluating Order: ${order.orderId} (${order.id})`);
    console.log(`  Village: ${order.seller?.village}, Pincode: ${order.seller?.pincode}, Weight: ${order.totalWeight} kg`);

    // Fetch approved transporters
    const approvedTransporters = await prisma.$queryRawUnsafe(`
      SELECT u.id, u."fullName", a."postOffice", rd."operatingArea", rd."pickupLocations", od."minWeight", od."maxWeight", od."ratePerKm"
      FROM public."User" u
      JOIN public."Address" a ON u.id = a."userId"
      LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
      LEFT JOIN public."OtherDetails" od ON u.id = od."userId"
      WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
    `) as any[];

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

    // 1 & 2: Village + Pincode
    const locationMatched = approvedTransporters.filter((tr) => {
      const { areas, villages, pincodes } = getTransporterInfo(tr);
      const villageMatches = Boolean(v && (villages.includes(normalizeStr(v)) || areas.includes(v)));
      const pinMatches = Boolean(p && (pincodes.includes(p) || areas.includes(p)));
      return villageMatches && pinMatches;
    });

    // 3: Weight Capacity Match
    const totalWeight = Number(order.totalWeight || 0);
    const weightEligible = locationMatched.filter((tr) => {
      const minW = tr.minWeight !== null && tr.minWeight !== undefined ? Number(tr.minWeight) : null;
      const maxW = tr.maxWeight !== null && tr.maxWeight !== undefined ? Number(tr.maxWeight) : null;

      if (minW !== null && totalWeight < minW) return false;
      if (maxW !== null && totalWeight > maxW) return false;
      return true;
    });

    // 4: Lowest Rate Selection
    const validRates = weightEligible
      .map(tr => (tr.ratePerKm !== null && tr.ratePerKm !== undefined ? Number(tr.ratePerKm) : null))
      .filter((r): r is number => r !== null && !isNaN(r));

    let finalSelected = weightEligible;
    if (validRates.length > 0) {
      const minRate = Math.min(...validRates);
      finalSelected = weightEligible.filter((tr) => {
        const rate = tr.ratePerKm !== null && tr.ratePerKm !== undefined ? Number(tr.ratePerKm) : null;
        return rate === minRate;
      });
    }

    console.log(`  Selected Transporter(s): ${finalSelected.map(t => `${t.id} (${t.fullName}, ₹${t.ratePerKm}/km)`).join(', ')}`);

    // Clean up old pending assignments
    await prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'TRANSPORTER',
        status: 'PENDING'
      }
    });

    // Insert new pending assignments
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
    console.log(`  Broadcast updated successfully.\n`);
  }

  console.log('=== ALL TRANSPORTER BROADCASTS UPDATED ===');
}

cleanAndRebroadcast()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
