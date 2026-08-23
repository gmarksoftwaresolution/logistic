const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test getUpcomingOrders logic directly
async function testUpcoming() {
  const transporterUserId = 151; // transporter user ID from assignments
  const orders = await prisma.order.findMany({
    where: { id: 'ORD-2026-116' },
    include: { seller: true, buyer: true, parcels: true }
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

  const matchedUpcoming = [];
  for (const order of orders) {
    const isDirect = order.flowType === 'DIRECT_SHG_TO_SHG' || order.flowType === 'shg_to_shg';
    matchedUpcoming.push({ ...order, legType: 'shg_to_shg', isPickupLeg: true, isDirect });
  }

  const formattedUpcoming = matchedUpcoming.map((order) => {
    const isDirect = order.isDirect;
    const sellerVillageNorm = normalizeStr(order.seller?.village);
    const buyerVillageNorm = normalizeStr(order.buyer?.village);

    const pickupShgUser = allShgUsers.find(u =>
      (order.pickupShgId && (String(u.id) === String(order.pickupShgId) || u.authId === String(order.pickupShgId))) ||
      (sellerVillageNorm && normalizeStr(u.address?.village) === sellerVillageNorm)
    );

    const dropShgUser = allShgUsers.find(u =>
      (order.dropShgId && (String(u.id) === String(order.dropShgId) || u.authId === String(order.dropShgId))) ||
      (buyerVillageNorm && normalizeStr(u.address?.village) === buyerVillageNorm)
    );

    const pickupShgName = pickupShgUser?.shgDetail?.shgName || `${order.seller?.village} SHG Center`;
    const pickupShgCrp = pickupShgUser?.shgDetail?.crpName || pickupShgUser?.fullName || order.seller?.sellerName;

    const dropShgName = dropShgUser?.shgDetail?.shgName || `${order.buyer?.village} SHG Center`;
    const dropShgCrp = dropShgUser?.shgDetail?.crpName || dropShgUser?.fullName || order.buyer?.buyerName;

    const originAddress = {
      name: pickupShgCrp,
      shgName: pickupShgName,
      phone: pickupShgUser?.shgDetail?.crpMobile || pickupShgUser?.phoneNumber || order.seller?.mobileNumber,
      village: pickupShgUser?.address?.village || order.seller?.village,
      pincode: pickupShgUser?.address?.pincode || order.seller?.pincode,
    };

    const destinationAddress = {
      name: dropShgCrp,
      shgName: dropShgName,
      phone: dropShgUser?.shgDetail?.crpMobile || dropShgUser?.phoneNumber || order.buyer?.mobileNumber,
      village: dropShgUser?.address?.village || order.buyer?.village,
      pincode: dropShgUser?.address?.pincode || order.buyer?.pincode,
    };

    return {
      id: order.id,
      displayId: `#${order.id}`,
      flowType: 'shg_to_shg',
      originAddress,
      destinationAddress
    };
  });

  console.log("Returned Payload for Order 116:", JSON.stringify(formattedUpcoming, null, 2));
}

testUpcoming().catch(console.error).finally(() => prisma.$disconnect());
