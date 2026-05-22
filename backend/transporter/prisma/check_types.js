const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('User id type in client:');
// We can check the metadata or typings
// Let's just print a dummy user object properties or look at Prisma's d.ts
const fs = require('fs');
const path = require('path');
try {
  const dtsPath = path.join(__dirname, '../node_modules/.prisma/client/index.d.ts');
  const content = fs.readFileSync(dtsPath, 'utf8');
  const match = content.match(/export type User = \$Types\.DefaultSelection<.*?id:\s*(.*?)\n/s);
  if (match) {
    console.log('User model:', match[0]);
  } else {
    // try different regex
    const match2 = content.match(/export type User = \{[\s\S]*?id:\s*(.*?)\n/);
    console.log('User model 2:', match2 ? match2[0] : 'not found');
  }
} catch (e) {
  console.error(e);
}
