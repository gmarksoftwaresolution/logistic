import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar%4021@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=public"
    }
  }
});

async function main() {
  console.log('=== INVESTIGATING ADDRESSES FOR ACTIVE SHGs ===');
  
  const shgIds = [6, 7, 8, 9, 10, 11, 14];
  
  for (const id of shgIds) {
    const addresses = await prisma.address.findMany({
      where: { userId: id }
    });
    console.log(`SHG ID ${id} has ${addresses.length} address rows:`, addresses.map(a => ({
      id: a.id,
      village: a.village,
      pincode: a.pincode
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
