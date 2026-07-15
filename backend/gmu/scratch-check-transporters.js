require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getMatchingTransporters(village, pincode, postOffice, excludedIds = []) {
  const whereExcluded = excludedIds.length > 0 
    ? `AND u.id NOT IN (${excludedIds.map(id => `${id}`).join(', ')})`
    : '';

  const approvedTransporters = await prisma.$queryRawUnsafe(`
    SELECT u.id, a."postOffice", rd."operatingArea", rd."pickupLocations"
    FROM public."User" u
    JOIN public."Address" a ON u.id = a."userId"
    LEFT JOIN public."RouteDetail" rd ON u.id = rd."userId"
    WHERE u.role = 'TRANSPORTER' AND u."applicationStatus" = 'APPROVED' AND u."deletedAt" IS NULL ${whereExcluded};
  `);

  const parseJsonArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) {}
    }
    return [];
  };

  const p = pincode?.trim()?.toLowerCase();
  const v = village?.trim()?.toLowerCase();

  const normalizeStr = (s) => {
    if (!s) return '';
    return s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  };

  const getTransporterInfo = (tr) => {
    const areas = tr.operatingArea
      ? tr.operatingArea.split(',').map((s) => s.trim().toLowerCase())
      : [];
    const villages = areas;
    const pincodes = parseJsonArray(tr.pickupLocations).map((s) => String(s).trim().toLowerCase());
    const transporterPostOffice = tr.postOffice ? normalizeStr(tr.postOffice) : '';
    return { areas, villages, pincodes, postOffice: transporterPostOffice };
  };

  const matchingTransporters = approvedTransporters.filter((tr) => {
    const { areas, villages, pincodes } = getTransporterInfo(tr);
    const villageMatched = v && (villages.includes(normalizeStr(v)) || areas.includes(v));
    const pincodeMatched = p && (pincodes.includes(p) || areas.includes(p));
    return !!(villageMatched && pincodeMatched);
  });

  return matchingTransporters.map(tr => ({
    ...tr,
    id: String(tr.id)
  }));
}

async function main() {
  const matching = await getMatchingTransporters('Mahagaon', '416503', 'Mahagaon S.O');
  console.log('Matching Transporters:', matching);
}

main().finally(() => prisma.$disconnect());
