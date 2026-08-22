require('dotenv').config({ path: '.env' });
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDNMv_sau3_koFOtAvkLkwsZgn_Y8iydy0';
const NESARI_HUB_ADDR = 'Nesari, Gadhinglaj, Kolhapur, Maharashtra 416504, India';

async function computeRoutes(sellerAddr, buyerAddr) {
  try {
    const url = `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix?key=${GOOGLE_API_KEY}`;
    const payload = {
      origins: [
        { waypoint: { address: sellerAddr } },
        { waypoint: { address: NESARI_HUB_ADDR } }
      ],
      destinations: [
        { waypoint: { address: NESARI_HUB_ADDR } },
        { waypoint: { address: buyerAddr } }
      ],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE'
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration'
    };

    const res = await axios.post(url, payload, { headers, timeout: 8000 });
    const matrix = res.data || [];

    // Extract distances in meters
    // Origin 0 (Seller) -> Dest 0 (Hub) => Leg 1
    // Origin 0 (Seller) -> Dest 1 (Buyer) => Direct
    // Origin 1 (Hub) -> Dest 1 (Buyer) => Leg 2
    let sellerToHubMeters = null;
    let sellerToBuyerMeters = null;
    let hubToBuyerMeters = null;

    matrix.forEach(item => {
      const o = item.originIndex;
      const d = item.destinationIndex;
      const dist = item.distanceMeters || 0;

      if (o === 0 && d === 0) sellerToHubMeters = dist;
      if (o === 0 && d === 1) sellerToBuyerMeters = dist;
      if (o === 1 && d === 1) hubToBuyerMeters = dist;
    });

    if (sellerToHubMeters && sellerToBuyerMeters && hubToBuyerMeters) {
      const directKm = (sellerToBuyerMeters / 1000).toFixed(1);
      const viaHubKm = ((sellerToHubMeters + hubToBuyerMeters) / 1000).toFixed(1);
      const savingsKm = (viaHubKm - directKm).toFixed(1);
      const isDirect = sellerToBuyerMeters <= (sellerToHubMeters + hubToBuyerMeters) * 0.70;

      return {
        isDirect,
        directKm,
        viaHubKm,
        savingsKm
      };
    }
  } catch (err) {
    console.warn(`[computeRoutes Notice] Google API notice for ${sellerAddr} -> ${buyerAddr}:`, err.message);
  }

  return { isDirect: false, directKm: 'N/A', viaHubKm: 'N/A', savingsKm: '0' };
}

async function main() {
  console.log('=== STEP 1: RESETTING ALL ORDERS BACK TO CLEAN STARTING STATE ===');

  // Reset all orders to PICKUP_ASSIGNED, pickupShgStatus ACCEPTED, transporter status PENDING
  await prisma.order.updateMany({
    data: {
      mainStatus: 'PICKUP_ASSIGNED',
      pickupShgStatus: 'ACCEPTED',
      pickupTransporterId: null,
      pickupTransporterStatus: 'PENDING',
      dropTransporterId: null,
      dropTransporterStatus: 'PENDING',
      dropShgStatus: 'PENDING',
      remarks: null
    }
  });

  console.log('✅ Reset all order statuses to PICKUP_ASSIGNED & PENDING Transporter.');

  console.log('\n=== STEP 2: RUNNING LIVE GOOGLE ROUTES API V2 ON ALL ORDERS ===');

  const orders = await prisma.order.findMany({
    include: { seller: true, buyer: true }
  });

  for (const o of orders) {
    const seller = o.seller;
    const buyer = o.buyer;

    if (!seller || !buyer) continue;

    const sellerAddr = `${seller.village}, ${seller.taluka || 'Gadhinglaj'}, ${seller.district || 'Kolhapur'}, ${seller.state || 'Maharashtra'} ${seller.pincode || ''}, India`;
    const buyerAddr = `${buyer.village}, ${buyer.taluka || 'Gadhinglaj'}, ${buyer.district || 'Kolhapur'}, ${buyer.state || 'Maharashtra'} ${buyer.pincode || ''}, India`;

    const routeResult = await computeRoutes(sellerAddr, buyerAddr);
    const flowType = routeResult.isDirect ? 'DIRECT_SHG_TO_SHG' : 'VIA_HUB';

    await prisma.order.update({
      where: { id: o.id },
      data: { flowType }
    });

    console.log(`OrderID: ${o.orderId} | Route: ${seller.village} ➔ ${buyer.village} | Direct: ${routeResult.directKm} km vs Via Hub: ${routeResult.viaHubKm} km (Savings: ${routeResult.savingsKm} km) => Flow: ${flowType}`);
  }

  console.log('\n============================================================');
  console.log('✅ COMPLETED ALL GOOGLE MAPS ROUTE EVALUATIONS & ORDER RESETS!');
  console.log('============================================================');
}

main().finally(async () => { await prisma.$disconnect(); });
