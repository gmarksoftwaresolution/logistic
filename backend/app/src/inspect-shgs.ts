import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shgs = await prisma.user.findMany({
    where: { role: 'SHG', applicationStatus: 'APPROVED' },
    select: { id: true, authId: true, fullName: true, phoneNumber: true }
  });

  const addresses = await prisma.address.findMany({
    where: { userId: { in: shgs.map(s => s.id) } }
  });

  const serviceAreas = await prisma.shgServiceArea.findMany({});

  console.log('=== APPROVED SHGs ===');
  shgs.forEach(s => {
    const addr = addresses.find(a => a.userId === s.id);
    const sa = serviceAreas.filter(a => String(a.shgUserId) === String(s.id) || a.shgUserId === s.authId);
    console.log(`SHG: ${s.fullName} (ID: ${s.id}, Auth: ${s.authId}) | Village: ${addr?.village || 'N/A'}, Pincode: ${addr?.pincode || 'N/A'} | Service Areas:`, sa.map(a => `${a.village} (${a.pincode})`));
  });

  const sellers = await prisma.seller.findMany({});
  console.log('\n=== SELLERS ===');
  sellers.forEach(sel => {
    console.log(`Seller: ${sel.sellerName} (ID: ${sel.id}) | Village: ${sel.village}, Pincode: ${sel.pincode}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
