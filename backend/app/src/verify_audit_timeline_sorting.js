const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTimeline(orderIdStr) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderIdStr }, { orderId: orderIdStr }] },
    include: {
      seller: true,
      buyer: true,
      parcels: {
        include: {
          scanHistories: true
        }
      },
      assignments: true,
    }
  });

  if (!order) {
    console.log(`Order ${orderIdStr} not found!`);
    return;
  }

  console.log(`\n=== Verification of Tracking Audit History for ${order.id} (${order.orderId}) ===`);
  
  const allScans = [];
  if (order.parcels) {
    order.parcels.forEach(p => {
      if (p.scanHistories) {
        p.scanHistories.forEach(sh => {
          allScans.push({
            status: sh.action || sh.scanResult || 'Status Update',
            action: sh.action,
            timestamp: sh.scanTime,
            location: sh.locationName || 'Hub Staging',
            actorRole: sh.scannedByRole || 'SYSTEM',
            actorName: sh.scannedByName || 'Officer',
          });
        });
      }
    });
  }

  allScans.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log("Raw Scans Chronological Count:", allScans.length);
  allScans.forEach(s => {
    const istTime = new Date(s.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`  - [IST: ${istTime}] ${s.status} (by ${s.actorName})`);
  });
}

async function main() {
  await verifyTimeline('ORD-2026-111');
  await verifyTimeline('ORD-2026-113');
  await verifyTimeline('ORD-2026-118');
}

main().catch(console.error).finally(() => prisma.$disconnect());
