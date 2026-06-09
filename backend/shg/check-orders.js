require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
  const allMasterOrders = await prisma.masterOrder.findMany();
  console.log('Total Master Orders:', allMasterOrders.length);
  
  const targetPrefix = 'ORD-1769749895005';
  
  const toDelete = allMasterOrders.filter(o => !o.orderNumber.startsWith(targetPrefix));
  console.log('Orders to delete:', toDelete.length);
  
  for (const o of toDelete) {
    console.log('Deleting:', o.orderNumber);
    // Delete all related records
    await prisma.dropTracking.deleteMany({ where: { dropOrder: { masterOrderId: o.id } } });
    await prisma.pickupTracking.deleteMany({ where: { pickupOrder: { masterOrderId: o.id } } });
    
    await prisma.dropOrderItem.deleteMany({ where: { dropOrder: { masterOrderId: o.id } } });
    await prisma.pickupOrderItem.deleteMany({ where: { pickupOrder: { masterOrderId: o.id } } });
    
    await prisma.dropOrder.deleteMany({ where: { masterOrderId: o.id } });
    await prisma.pickupOrder.deleteMany({ where: { masterOrderId: o.id } });
    
    await prisma.masterOrderItem.deleteMany({ where: { masterOrderId: o.id } });
    
    await prisma.masterOrder.delete({ where: { id: o.id } });
  }
  
  const remaining = await prisma.masterOrder.findMany();
  console.log('Remaining Master Orders:', remaining.length);
}

checkOrders().catch(console.error).finally(() => prisma.$disconnect());
