import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING ORDER 1012 ===');

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderId: 'ORD-PICK-1012' },
        { orderId: 'ORD-DROP-1012' },
        { orderId: { contains: '1012' } }
      ]
    },
    include: {
      seller: true,
      buyer: true
    }
  });

  console.log('Orders found:', orders.map(o => ({
    id: o.id,
    orderId: o.orderId,
    phase: o.phase,
    mainStatus: o.mainStatus,
    pickupTransporterStatus: o.pickupTransporterStatus,
    dropTransporterStatus: o.dropTransporterStatus,
    sellerVillage: o.seller?.village,
    sellerPincode: o.seller?.pincode,
    buyerVillage: o.buyer?.village,
    buyerPincode: o.buyer?.pincode
  })));

  for (const o of orders) {
    console.log(`\nAssignments for order ${o.orderId} (Phase: ${o.phase}):`);
    const assignments = await prisma.orderAssignment.findMany({
      where: { orderId: o.id },
    });
    for (const a of assignments) {
      const user = await prisma.user.findUnique({ where: { id: Number(a.assigneeId) } });
      console.log(`- Assignee: ${user?.fullName || 'UNKNOWN'} (ID: ${a.assigneeId}, Type: ${a.assigneeType}, Role: ${a.role}, Status: ${a.status})`);
    }

    // Run matching transporters logic
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

    const isPickup = o.phase === 'PICKUP';
    const p = isPickup ? (o.seller?.pincode || '') : (o.buyer?.pincode || '');
    const v = isPickup ? (o.seller?.village || '') : (o.buyer?.village || '');

    const getTransporterInfo = (tr: any) => {
      const areas = tr.operatingArea
        ? tr.operatingArea.split(',').map((s: string) => s.trim().toLowerCase())
        : [];
      const villages = parseJsonArray(tr.assignedVillages).map((s: any) => String(s).toLowerCase());
      const pincodes = parseJsonArray(tr.assignedPincodes).map((s: any) => String(s).toLowerCase());
      return { areas, villages, pincodes };
    };

    // Match using routing priority: Pincode -> Village
    let matchingTransporters = approvedTransporters.filter((tr) => {
      const { areas, pincodes } = getTransporterInfo(tr);
      const pLower = p.toLowerCase().trim();
      return pLower && (pincodes.includes(pLower) || areas.includes(pLower));
    });

    if (matchingTransporters.length === 0 && v) {
      matchingTransporters = approvedTransporters.filter((tr) => {
        const { areas, villages } = getTransporterInfo(tr);
        const vLower = v.toLowerCase().trim();
        return villages.includes(vLower) || areas.includes(vLower);
      });
    }

    console.log(`Matching Transporters (Pincode: "${p}", Village: "${v}"):`, matchingTransporters.map(t => ({
      userId: t.id,
      fullName: t.fullName
    })));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
