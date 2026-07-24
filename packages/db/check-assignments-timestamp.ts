import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTimestamps() {
  const assignments = await prisma.orderAssignment.findMany({
    where: { orderId: '242aa88a-22af-4446-87ab-88b368475885' },
    orderBy: { createdAt: 'asc' }
  });

  console.log('=== ASSIGNMENTS FOR ORD-PICK-1020 ===\n');
  for (const a of assignments) {
    console.log(`Assignment ID: ${a.id}`);
    console.log(`  Assignee ID: ${a.assigneeId} (${a.assigneeType})`);
    console.log(`  Role: ${a.role}, Status: ${a.status}`);
    console.log(`  CreatedAt: ${a.createdAt.toISOString()}\n`);
  }
}

checkTimestamps()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
