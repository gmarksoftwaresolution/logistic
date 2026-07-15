import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING TRANSPORTER MATCHING FOR Batkanangale 416503 ===');

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

  console.log('All Approved Transporters:', approvedTransportersRaw.map(t => ({
    fullName: t.fullName,
    phoneNumber: t.phoneNumber,
    operatingArea: t.operatingArea,
    routePincodes: t.routePincodes,
    milkVanVillages: t.milkVanVillages
  })));

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

  const p = '416503';
  const v = 'batkanangale';

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
    return p && (pincodes.includes(p) || areas.includes(p));
  });
  console.log('Priority 1 Matches (Pincode):', matchingTransporters.map(t => t.fullName));

  // Priority 2: Village
  if (matchingTransporters.length === 0 && v) {
    matchingTransporters = approvedTransporters.filter(tr => {
      const { areas, villages } = getTransporterLocations(tr);
      return villages.includes(v) || areas.includes(v);
    });
    console.log('Priority 2 Matches (Village):', matchingTransporters.map(t => t.fullName));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
