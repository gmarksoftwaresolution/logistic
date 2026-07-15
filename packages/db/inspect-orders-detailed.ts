import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== DETAILED ORDERS INSPECTION ===');
  
  const orders = await prisma.order.findMany({
    include: {
      seller: true,
      buyer: true,
      assignments: true
    }
  });

  console.log(`Total orders in public."Order" table: ${orders.length}`);

  for (const o of orders) {
    console.log(`- Order: ID=${o.id}, orderId=${o.orderId}, phase=${o.phase}, mainStatus=${o.mainStatus}, pickupShgStatus=${o.pickupShgStatus}`);
    if (o.seller) {
      console.log(`  Seller: ID=${o.seller.id}, Name=${o.seller.sellerName}, Village=${o.seller.village}, Pincode=${o.seller.pincode}`);
    } else {
      console.log(`  Seller: (NONE)`);
    }
    console.log(`  Assignments: Count=${o.assignments.length}`, o.assignments.map(a => ({
      assigneeId: a.assigneeId,
      assigneeType: a.assigneeType,
      role: a.role,
      status: a.status
    })));
  }

  const shgs = await prisma.user.findMany({
    where: { role: 'SHG' },
    include: { address: true }
  });
  console.log('--- ALL APPROVED SHGs ---');
  for (const s of shgs) {
    console.log(`SHG: ID=${s.id}, Name=${s.fullName}, Status=${s.applicationStatus}, Village=${s.address?.village}, Pincode=${s.address?.pincode}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
