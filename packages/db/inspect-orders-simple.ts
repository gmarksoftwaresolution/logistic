process.env.DATABASE_URL = "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=public";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orderCount = await prisma.order.count();
  const pickupCount = await prisma.pickupOrder.count();
  const dropCount = await prisma.dropOrder.count();
  const shgCount = await prisma.user.count({ where: { role: 'SHG' } });
  const transporterCount = await prisma.user.count({ where: { role: 'TRANSPORTER' } });

  console.log('--- DB COUNTS ---');
  console.log('Order table count:', orderCount);
  console.log('PickupOrder table count:', pickupCount);
  console.log('DropOrder table count:', dropCount);
  console.log('SHG users count:', shgCount);
  console.log('Transporter users count:', transporterCount);

  const orders = await prisma.order.findMany({
    where: {
      phase: 'PICKUP',
      returnType: null,
      OR: [
        { mainStatus: { in: ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING'] } },
        { mainStatus: 'PICKUP_ASSIGNED', OR: [{ pickupShgStatus: 'PENDING' }, { pickupShgStatus: 'pending' }, { pickupShgStatus: null }] }
      ],
      mainStatus: { in: ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'PICKUP_ASSIGNED'] }
    },
    include: { assignments: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Result Count:', orders.length);
  console.log('Sample assignments count:', orders.map(o => o.assignments.length));
}

main().catch(console.error).finally(() => prisma.$disconnect());
