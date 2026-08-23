const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { id: 'ORD-2026-116' },
    include: { seller: true, buyer: true, assignments: true }
  });

  const allShgUsers = await prisma.user.findMany({
    where: { role: 'SHG', applicationStatus: 'APPROVED', deletedAt: null },
    select: {
      id: true,
      authId: true,
      fullName: true,
      phoneNumber: true,
      address: { select: { village: true, pincode: true, taluka: true, district: true, deliveryAddress: true } },
      shgDetail: { select: { shgName: true, crpName: true, crpMobile: true } }
    }
  });

  const normalizeStr = (s) => (s ? s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase() : '');

  const isRedirected = !!(o.isPickupRedirected || o.pickupShgStatus === 'REDIRECTED');
  const buyerVillageNorm = normalizeStr(o.buyer?.village);
  const dropShgId = o.dropShgId;
  const dropAssignShgId = o.assignments?.find((a) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;

  const dropShgUser = allShgUsers.find(u =>
    (dropShgId && (String(u.id) === String(dropShgId) || u.authId === String(dropShgId))) ||
    (dropAssignShgId && (String(u.id) === String(dropAssignShgId) || u.authId === String(dropAssignShgId))) ||
    (buyerVillageNorm && normalizeStr(u.address?.village) === buyerVillageNorm)
  ) || null;

  const dropShgData = dropShgUser ? {
    crpName: dropShgUser.shgDetail?.crpName || dropShgUser.fullName,
    shgName: dropShgUser.shgDetail?.shgName || `${dropShgUser.address?.village} Drop SHG`,
    village: dropShgUser.address?.village || o.buyer?.village,
    pincode: dropShgUser.address?.pincode || o.buyer?.pincode,
    phone: dropShgUser.shgDetail?.crpMobile || dropShgUser.phoneNumber
  } : null;

  const isDirect = o.flowType === 'DIRECT_SHG_TO_SHG' || o.flowType === 'shg_to_shg';
  const pickupPoint = isRedirected ? o.seller?.village : (o.seller?.village || 'Pickup Village');
  const dropPoint = isDirect ? (dropShgData?.village || o.buyer?.village) : 'Nesari Hub';

  console.log("Mapped Order 116 for Transporter:");
  console.log("  flowType:", o.flowType);
  console.log("  isDirect:", isDirect);
  console.log("  pickupPointName:", pickupPoint);
  console.log("  dropPointName:", dropPoint);
  console.log("  Route Card Title:", `From - ${pickupPoint} To ${dropPoint}`);
  console.log("  dropShgDetails:", dropShgData);
}

main().catch(console.error).finally(() => prisma.$disconnect());
