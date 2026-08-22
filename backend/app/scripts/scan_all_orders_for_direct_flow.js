require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const DEFAULT_HUB = 'Nesari, Gadhinglaj, Kolhapur, Maharashtra 416504, India';

async function fetchRouteDistance(origin, destination, apiKey) {
  try {
    const res = await axios.post(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      {
        origins: [{ waypoint: { address: origin } }],
        destinations: [{ waypoint: { address: destination } }],
        travelMode: 'DRIVE',
      },
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,status',
        },
        timeout: 5000,
      }
    );
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0].distanceMeters || 0;
    }
  } catch (_) {}
  return 0;
}

async function evaluateOrder(order, apiKey) {
  const sellerVillage = order.seller?.village || '';
  const buyerVillage = order.buyer?.village || '';

  if (!sellerVillage || !buyerVillage) return { eligible: false, reason: 'Missing village data' };

  const sellerAddr = `${sellerVillage}, Gadhinglaj, Kolhapur, Maharashtra, India`;
  const buyerAddr = `${buyerVillage}, Gadhinglaj, Kolhapur, Maharashtra, India`;

  try {
    const [directDistMeters, leg1Meters, leg2Meters] = await Promise.all([
      fetchRouteDistance(sellerAddr, buyerAddr, apiKey),
      fetchRouteDistance(sellerAddr, DEFAULT_HUB, apiKey),
      fetchRouteDistance(DEFAULT_HUB, buyerAddr, apiKey),
    ]);

    const directKm = (directDistMeters / 1000).toFixed(1);
    const viaHubKm = ((leg1Meters + leg2Meters) / 1000).toFixed(1);
    const totalViaHubMeters = leg1Meters + leg2Meters;

    const isEligible = directDistMeters > 0 && totalViaHubMeters > 0 && (directDistMeters <= totalViaHubMeters * 0.70);

    return {
      eligible: isEligible,
      directKm,
      viaHubKm,
      savingsKm: (viaHubKm - directKm).toFixed(1),
    };
  } catch (err) {
    return { eligible: false, reason: err.message };
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  console.log('Scanning present orders with Google Routes API v2...\n');

  const orders = await prisma.order.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderId: true,
      mainStatus: true,
      seller: { select: { village: true, pincode: true } },
      buyer: { select: { village: true, pincode: true } },
    }
  });

  const directFlowEligible = [];
  const normalHubEligible = [];

  for (const order of orders) {
    const result = await evaluateOrder(order, apiKey);
    if (result.eligible) {
      directFlowEligible.push({ ...order, result });
    } else {
      normalHubEligible.push({ ...order, result });
    }
  }

  console.log('=== ⚡ ORDERS QUALIFIED FOR DIRECT SHG-TO-SHG FLOW (HUB SKIPPED) ===');
  directFlowEligible.forEach(o => {
    console.log(`✅ OrderID: ${o.orderId} | Status: ${o.mainStatus} | Route: ${o.seller?.village} -> ${o.buyer?.village} | Direct: ${o.result.directKm} km vs Via Hub: ${o.result.viaHubKm} km (Saves ${o.result.savingsKm} km)`);
  });

  console.log('\n=== 🏢 ORDERS REQUIRING NORMAL HUB FLOW (VIA NESARI HUB) ===');
  normalHubEligible.forEach(o => {
    console.log(`🏢 OrderID: ${o.orderId} | Status: ${o.mainStatus} | Route: ${o.seller?.village} -> ${o.buyer?.village} | Direct: ${o.result.directKm} km vs Via Hub: ${o.result.viaHubKm} km`);
  });
}

main().finally(async () => { await prisma.$disconnect(); });
