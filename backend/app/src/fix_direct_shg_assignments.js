const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDirectOrders() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { flowType: 'DIRECT_SHG_TO_SHG' },
        { flowType: 'shg_to_shg' }
      ]
    },
    include: { buyer: true, assignments: true }
  });

  const shgUsers = await prisma.user.findMany({
    where: { role: 'SHG', applicationStatus: 'APPROVED', deletedAt: null },
    include: { address: true, shgDetail: true }
  });

  const normalizeStr = (s) => (s ? s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase() : '');

  console.log(`Fixing ${orders.length} direct SHG-to-SHG orders in DB...`);

  for (const order of orders) {
    if (!order.buyer) continue;
    const bVillageNorm = normalizeStr(order.buyer.village);
    const bPincode = (order.buyer.pincode || '').trim().toLowerCase();

    // Priority 1: Match BOTH Village AND Pincode
    let matchedDropShg = shgUsers.find((u) => {
      const vNorm = normalizeStr(u.address?.village);
      const p = (u.address?.pincode || '').trim().toLowerCase();
      return bVillageNorm && vNorm && (vNorm === bVillageNorm || vNorm.includes(bVillageNorm) || bVillageNorm.includes(vNorm)) && (!bPincode || !p || p === bPincode);
    });

    // Priority 2: Match Village
    if (!matchedDropShg && bVillageNorm) {
      matchedDropShg = shgUsers.find((u) => {
        const vNorm = normalizeStr(u.address?.village);
        return vNorm && (vNorm === bVillageNorm || vNorm.includes(bVillageNorm) || bVillageNorm.includes(vNorm));
      });
    }

    if (matchedDropShg) {
      const dropShgIdStr = String(matchedDropShg.id);

      // Update Order table
      await prisma.order.updateMany({
        where: {
          OR: [
            { id: order.id },
            { orderId: order.id },
            ...(order.orderId ? [{ id: order.orderId }, { orderId: order.orderId }] : [])
          ]
        },
        data: {
          dropShgId: dropShgIdStr,
          dropShgStatus: 'PENDING'
        }
      });

      // Update or create OrderAssignment
      await prisma.orderAssignment.deleteMany({
        where: {
          orderId: order.id,
          role: 'DROP',
          assigneeType: 'SHG'
        }
      });

      await prisma.orderAssignment.create({
        data: {
          orderId: order.id,
          assigneeId: dropShgIdStr,
          assigneeType: 'SHG',
          role: 'DROP',
          status: 'ACCEPTED'
        }
      });

      console.log(`Order ${order.id} (${order.orderId}): Set dropShgId = ${dropShgIdStr} (${matchedDropShg.shgDetail?.crpName || matchedDropShg.fullName}, Village: ${matchedDropShg.address?.village})`);
    } else {
      console.warn(`Order ${order.id}: No matching Drop SHG found for buyer village "${order.buyer.village}"`);
    }
  }

  console.log("DB Fix Completed!");
}

fixDirectOrders().catch(console.error).finally(() => prisma.$disconnect());
