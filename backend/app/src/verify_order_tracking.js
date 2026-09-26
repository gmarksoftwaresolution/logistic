const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { enrichOrdersWithAuditTimeline } = require('./common/utils/audit-timeline.util');

async function testEnrichment() {
  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      seller: true,
      buyer: true,
      parcels: { include: { scanHistories: true } },
      assignments: true,
    }
  });

  const enriched = await enrichOrdersWithAuditTimeline(orders, prisma);
  console.log(`Enriched ${enriched.length} orders.`);
  enriched.forEach(o => {
    console.log(`\nOrder: ${o.orderId || o.id} (${o.mainStatus})`);
    console.log(`Tracking events count: ${o.tracking?.length || 0}`);
    o.tracking?.forEach(t => {
      console.log(`  - [${t.timestamp}] ${t.status}`);
    });
  });
}

testEnrichment().catch(console.error).finally(() => prisma.$disconnect());
