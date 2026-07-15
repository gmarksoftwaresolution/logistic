import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BROADCASTING TRANSPORTERS FOR ORD-PICK-1018 ===');

  const order = await prisma.order.findFirst({
    where: { orderId: 'ORD-PICK-1018', phase: 'PICKUP' },
    include: {
      seller: true
    }
  });

  if (!order) {
    console.log('Order not found!');
    return;
  }

  // Get approved transporters
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

  const p = order.seller.pincode || '';
  const v = order.seller.village || '';

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

  console.log('Matching Transporters identified:', matchingTransporters.map(t => ({
    userId: t.id,
    fullName: t.fullName
  })));

  if (matchingTransporters.length > 0) {
    // Delete any existing transporter assignments for this order
    await prisma.orderAssignment.deleteMany({
      where: {
        orderId: order.id,
        role: 'PICKUP',
        assigneeType: 'TRANSPORTER'
      }
    });

    // Create new pending assignments
    for (const t of matchingTransporters) {
      await prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: t.id,
          assigneeType: 'TRANSPORTER',
          role: 'PICKUP',
          status: 'PENDING'
        }
      });
    }

    // Update order status to PENDING
    await prisma.order.update({
      where: { id: order.id },
      data: {
        pickupTransporterStatus: 'PENDING'
      }
    });

    console.log('Successfully created assignments in DB!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
