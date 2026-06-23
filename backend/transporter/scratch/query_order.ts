import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const ids = [479, 481, 474];
    console.log('--- DB CONNECTION ---');
    console.log('Database URL:', process.env.DATABASE_URL);

    for (const id of ids) {
      const drop = await prisma.dropOrder.findUnique({
        where: { id },
        include: {
          buyer: true,
        }
      });
      console.log(`\n--- DROP ORDER ${id} ---`);
      if (drop) {
        console.log({
          id: drop.id,
          status: drop.status,
          transporterId: drop.transporterId,
          masterOrderId: drop.masterOrderId,
          buyerPhone: drop.buyer?.phoneNumber,
          buyerName: drop.buyer?.fullName,
        });

        // Find associated pickup order
        const pickup = await prisma.pickupOrder.findFirst({
          where: { masterOrderId: drop.masterOrderId }
        });
        console.log(`Associated Pickup Order:`, pickup ? {
          id: pickup.id,
          status: pickup.status,
          transporterId: pickup.transporterId,
        } : 'None');
      } else {
        console.log('Not found');
      }
    }

    // Let's also check the logged in transporter details for user 66 and user 2
    const users = await prisma.user.findMany({
      where: { id: { in: [2, 66] } }
    });
    console.log('\n--- TRANSPORTER USERS ---');
    users.forEach(u => {
      console.log({ id: u.id, fullName: u.fullName, phoneNumber: u.phoneNumber, role: u.role });
    });

  } catch (err: any) {
    console.error('Script error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
