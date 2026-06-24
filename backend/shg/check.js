const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.dropOrder.findMany({ where: { dropOrderNumber: 'RET-1769749895005-23' } })
  .then(console.log)
  .finally(() => p.$disconnect());
