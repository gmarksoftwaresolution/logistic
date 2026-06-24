const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.pickupOrder.findMany({ where: { pickupOrderNumber: 'RET-1769749895005-23' } })
  .then(console.log)
  .finally(() => { p.$disconnect(); });
