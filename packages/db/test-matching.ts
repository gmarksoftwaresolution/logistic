import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderId: 'ORD-PICK-1020' },
    include: { seller: true }
  });
  if (!order || !order.seller) {
    console.log('Order or seller not found');
    return;
  }

  const seller = order.seller;
  console.log('Seller:', {
    village: seller.village,
    pincode: seller.pincode,
    postOffice: seller.postOffice
  });

  const approvedShgs = await prisma.$queryRawUnsafe(`
    SELECT u.id, a.pincode, a.village, a."postOffice", u.role, u."applicationStatus", u."deletedAt"
    FROM public."User" u
    JOIN public."Address" a ON u.id = a."userId"
    WHERE u.role = 'SHG';
  `) as any[];

  console.log('All SHGs from queryRaw:', approvedShgs.map(s => ({
    id: s.id,
    role: s.role,
    applicationStatus: s.applicationStatus,
    deletedAt: s.deletedAt,
    village: s.village,
    pincode: s.pincode
  })));

  const normalizeStr = (s: string) => {
    if (!s) return '';
    return s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  };

  const ov = seller.village;
  const op = seller.pincode;

  const matchingShgs = approvedShgs.filter(shg => 
    shg.role === 'SHG' && shg.applicationStatus === 'APPROVED' && shg.deletedAt === null &&
    (shg.pincode && op && shg.pincode.trim().toLowerCase() === op.trim().toLowerCase()) &&
    (shg.village && ov && normalizeStr(shg.village) === normalizeStr(ov))
  );

  console.log('Matching SHGs found by logic:', matchingShgs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
