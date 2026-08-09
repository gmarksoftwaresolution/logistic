import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspectShgs() {
  const shgs = await prisma.user.findMany({
    where: { role: 'SHG' },
    include: { address: true, shgDetail: true }
  });
  console.log('--- APPROVED SHG USERS ---');
  for (const s of shgs) {
    const sa = await prisma.shgServiceArea.findMany({
      where: { OR: [{ shgUserId: String(s.id) }, { shgUserId: s.authId || '' }] }
    });
    console.log(`SHG ID: ${s.id} | Phone: ${s.phoneNumber} | Name: ${s.fullName} | Primary Village: ${s.address?.village} | Pincode: ${s.address?.pincode}`);
    console.log(`  Service Areas (${sa.length}):`, sa.map((a: any) => `${a.village} (${a.pincode})`).join(', '));
  }

  console.log('\n--- 20 SEEDED ORDERS SUMMARY ---');
  const orders = await prisma.order.findMany({
    include: { seller: true, buyer: true }
  });
  orders.forEach((o: any) => {
    console.log(`Order ${o.id} | MainStatus: ${o.mainStatus} | Pickup SHG ID: ${o.pickupShgId} | Drop SHG ID: ${o.dropShgId} | Seller Village: ${o.seller?.village} (${o.seller?.pincode}) | Buyer Village: ${o.buyer?.village} (${o.buyer?.pincode})`);
  });
}

inspectShgs().finally(() => prisma.$disconnect());
