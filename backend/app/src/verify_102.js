const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.order.findFirst({
    where: { id: 'ORD-2026-102' },
    include: { seller: true, buyer: true }
  });

  const isRedirected = !!((o).isPickupRedirected || o.pickupShgStatus === 'REDIRECTED' || o.pickupShgStatus === 'REJECTED');
  console.log("Order 102 pickupShgStatus:", o.pickupShgStatus);
  console.log("Order 102 isPickupRedirected:", o.isPickupRedirected);
  console.log("Evaluated isRedirected:", isRedirected);
  console.log("Seller Name:", o.seller?.fullName || o.seller?.sellerName);
  console.log("Seller Phone:", o.seller?.mobileNumber);
  console.log("Seller Address:", o.seller?.addressLine1, o.seller?.village, o.seller?.pincode);
}

main().catch(console.error).finally(() => prisma.$disconnect());
