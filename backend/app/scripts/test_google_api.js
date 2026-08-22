require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const o = await prisma.order.findFirst({
    where: { orderId: 'ORD-2026-117' },
    include: { seller: true, buyer: true }
  });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const sellerAddr = `${o.seller.village}, ${o.seller.taluka}, ${o.seller.district}, ${o.seller.state} ${o.seller.pincode}, India`;
  const buyerAddr = `${o.buyer.village}, ${o.buyer.taluka}, ${o.buyer.district}, ${o.buyer.state} ${o.buyer.pincode}, India`;
  const hubAddr = `Nesari, Gadhinglaj, Kolhapur, Maharashtra 416504, India`;

  console.log('Seller Addr:', sellerAddr);
  console.log('Buyer Addr:', buyerAddr);

  const resDirect = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(sellerAddr)}&destinations=${encodeURIComponent(buyerAddr)}&key=${apiKey}`);
  console.log('API Response status:', resDirect.data.status);
  if (resDirect.data.rows && resDirect.data.rows[0]) {
    console.log('Direct Element:', JSON.stringify(resDirect.data.rows[0].elements[0]));
  } else {
    console.log('Full API Data:', resDirect.data);
  }
}

main().finally(async () => { await prisma.$disconnect(); });
