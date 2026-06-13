import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Database Users with role TRANSPORTER ===');
  const transporters = await prisma.user.findMany({
    where: { role: 'TRANSPORTER' },
    select: { id: true, phoneNumber: true, fullName: true }
  });
  console.log(transporters);

  console.log('\n=== Database Pickup Orders ===');
  const pickups = await prisma.pickupOrder.findMany({
    select: { id: true, pickupOrderNumber: true, transporterId: true, status: true }
  });
  console.log(pickups);

  console.log('\n=== Database Drop Orders ===');
  const drops = await prisma.dropOrder.findMany({
    select: { id: true, dropOrderNumber: true, transporterId: true, status: true }
  });
  console.log(drops);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
