import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Assigning Order ID 1 to Transporter ID 1...');
  
  const updatedOrder = await prisma.order.update({
    where: { id: 1 },
    data: {
      transporterId: 1,
    },
  });

  console.log('Success! Order updated:', updatedOrder);
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
