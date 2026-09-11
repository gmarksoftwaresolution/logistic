const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { OR: [{ id: 'ORD-2026-116' }, { orderId: 'ORD-2026-116' }, { id: '116' }] },
    include: { seller: true, buyer: true, parcels: true, assignments: true }
  });

  console.log("Order 116 flowType in DB:", o.flowType);

  // Now simulate getAssignedPickups for transporter 151
  const allShgUsers = await prisma.user.findMany({
    where: { role: 'SHG', applicationStatus: 'APPROVED' },
    include: { address: true, shgDetail: true }
  });

  const normalizeStr = (s) => (s ? s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase() : '');

  const cleanOrderId = (o.orderId || o.id).replace(/^ORD-/, '');
  const directShgId = o.pickupShgId;
  const assignShgId = o.assignments?.find((a) => a.role === 'PICKUP' && a.assigneeType === 'SHG')?.assigneeId;
  const holderShgId = o.parcels?.find((p) => p.currentHolderType === 'SHG')?.currentHolderId;
  const sellerVillageNorm = normalizeStr(o.seller?.village);

  const shgUser = allShgUsers.find(u =>
    (directShgId && (String(u.id) === String(directShgId) || u.authId === String(directShgId))) ||
    (assignShgId && (String(u.id) === String(assignShgId) || u.authId === String(assignShgId))) ||
    (holderShgId && (String(u.id) === String(holderShgId) || u.authId === String(holderShgId))) ||
    (sellerVillageNorm && normalizeStr(u.address?.village) === sellerVillageNorm)
  ) || null;

  const buyerVillageNorm = normalizeStr(o.buyer?.village);
  const dropShgId = o.dropShgId;
  const dropAssignShgId = o.assignments?.find((a) => a.role === 'DROP' && a.assigneeType === 'SHG')?.assigneeId;

  const dropShgUser = allShgUsers.find(u =>
    (dropShgId && (String(u.id) === String(dropShgId) || u.authId === String(dropShgId))) ||
    (dropAssignShgId && (String(u.id) === String(dropAssignShgId) || u.authId === String(dropAssignShgId))) ||
    (buyerVillageNorm && normalizeStr(u.address?.village) === buyerVillageNorm)
  ) || null;

  const payload = {
    id: cleanOrderId,
    masterOrderId: o.masterOrderId,
    orderId: o.orderId || o.id,
    flowType: o.flowType,
    pickupShgId: o.pickupShgId,
    dropShgId: o.dropShgId,
    pickupTransporterId: o.pickupTransporterId,
    pickupTransporterStatus: o.pickupTransporterStatus || 'PENDING',
    pickupShgStatus: o.pickupShgStatus,
    dropShgStatus: o.dropShgStatus,
    mainStatus: o.mainStatus,
    seller: o.seller,
    buyer: o.buyer,
    shg: shgUser ? { crpName: shgUser.shgDetail?.crpName, village: shgUser.address?.village } : null,
    dropShgDetails: dropShgUser ? { crpName: dropShgUser.shgDetail?.crpName, village: dropShgUser.address?.village, mobileNumber: dropShgUser.shgDetail?.crpMobile } : null
  };

  console.log("Returned Payload for getAssignedPickups:", JSON.stringify(payload, null, 2));

  // Now test how OrderManagementContext.tsx processes this payload:
  const isDirect = payload.flowType === 'DIRECT_SHG_TO_SHG' || payload.flowType === 'shg_to_shg' || String(payload.flowType || '').toUpperCase() === 'DIRECT_SHG_TO_SHG';
  const pickupPoint = payload.shg?.village || payload.seller?.village || 'Pickup Village';
  const dropPoint = isDirect ? (payload.buyer?.village || payload.dropShgDetails?.village || 'Buyer Village') : 'Nesari Hub';
  const flowTypeVal = isDirect ? 'shg_to_shg' : 'shg_to_gmu';

  console.log("Processed Batch in Context:");
  console.log("  isDirect:", isDirect);
  console.log("  flowTypeVal:", flowTypeVal);
  console.log("  pickupPointName:", pickupPoint);
  console.log("  dropPointName:", dropPoint);
  console.log("  Route Card Text:", isDirect ? `From - ${pickupPoint} To ${dropPoint}` : `From - ${pickupPoint} To Nesari Hub`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
