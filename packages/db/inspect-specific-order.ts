import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING ORDER ORD-PICK-1018 ===');

  const order = await prisma.order.findFirst({
    where: { orderId: 'ORD-PICK-1018', phase: 'PICKUP' },
    include: {
      seller: true,
      buyer: true
    }
  });

  if (!order) {
    console.log('Order not found!');
    return;
  }

  console.log('Order details:', {
    id: order.id,
    orderId: order.orderId,
    sellerVillage: order.seller.village,
    sellerPincode: order.seller.pincode,
    seller: order.seller
  });

  // Let's run getMatchingTransporters logic manually
  const p = order.seller.pincode || '';
  const v = order.seller.village || '';

  console.log(`Searching matching transporters for village: "${v}", pincode: "${p}"`);

  const approvedTransportersRaw = await prisma.$queryRawUnsafe(`
    SELECT 
      u.id as "userId",
      u."fullName",
      u."phoneNumber",
      rd."operatingArea",
      rd."pickupLocations" as "routePincodes",
      mv."assignedVillages" as "milkVanVillages"
    FROM public."User" u
    LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
    LEFT JOIN public."MilkVanDetail" mv ON u.id = mv."userId"
    WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL;
  `) as any[];

  const parseJsonArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) {}
    }
    return [];
  };

  const approvedTransporters = approvedTransportersRaw.map(t => {
    const mvVillages = parseJsonArray(t.milkVanVillages);
    const areaVillages = t.operatingArea 
      ? t.operatingArea.split(',').map((s: string) => s.trim()) 
      : [];
    const assignedVillages = mvVillages.length > 0 ? mvVillages : areaVillages;
    const assignedPincodes = parseJsonArray(t.routePincodes);

    return {
      id: String(t.userId),
      userId: t.userId,
      fullName: t.fullName,
      assignedVillages,
      assignedPincodes,
      operatingArea: t.operatingArea
    };
  });

  const getTransporterLocations = (tr: any) => {
    const areas = tr.operatingArea
      ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
      : [];
    const villages = parseJsonArray(tr.assignedVillages).map((s: any) => String(s).toLowerCase());
    const pincodes = parseJsonArray(tr.assignedPincodes).map((s: any) => String(s).toLowerCase());
    return { areas, villages, pincodes };
  };

  // Priority 1: Pincode
  let matchingTransporters = approvedTransporters.filter(tr => {
    const { areas, pincodes } = getTransporterLocations(tr);
    const pLower = p.toLowerCase().trim();
    return pLower && (pincodes.includes(pLower) || areas.includes(pLower));
  });
  console.log('Priority 1 Matches (Pincode):', matchingTransporters.map(t => t.fullName));

  // Priority 2: Village
  if (matchingTransporters.length === 0 && v) {
    matchingTransporters = approvedTransporters.filter(tr => {
      const { areas, villages } = getTransporterLocations(tr);
      const vLower = v.toLowerCase().trim();
      return villages.includes(vLower) || areas.includes(vLower);
    });
    console.log('Priority 2 Matches (Village):', matchingTransporters.map(t => t.fullName));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
