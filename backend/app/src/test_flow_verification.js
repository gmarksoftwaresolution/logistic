const axios = require('axios');

async function test() {
  const BASE_URL = 'http://localhost:3000/api';

  // 1. Transporter App assigned drop endpoint for Transporter 150
  try {
    const resDrop = await axios.get(`${BASE_URL}/orders/drop/assigned`, {
      headers: { user: JSON.stringify({ id: 150, role: 'TRANSPORTER', phoneNumber: '9876543210' }) }
    });
    const order111Drop = (resDrop.data || []).find(o => o.orderId === '111' || o.id === '111');
    console.log("Transporter API /orders/drop/assigned:");
    console.log("  Order 111 found:", !!order111Drop);
    if (order111Drop) {
      console.log("  mainStatus:", order111Drop.mainStatus);
      console.log("  dropTransporterStatus:", order111Drop.dropTransporterStatus);
    }
  } catch (err) {
    console.error("Error fetching drop assigned:", err.message);
  }

  // 2. SHG App active assigned orders endpoint for Drop SHG (Rutuja, ID 2)
  try {
    const resShgAssigned = await axios.get(`${BASE_URL}/shg/orders/assigned`, {
      headers: { user: JSON.stringify({ id: 2, role: 'SHG', phoneNumber: '9999999993' }) }
    });
    const order111Shg = (resShgAssigned.data || []).find(o => o.orderId === '111' || o.id === 'ORD-2026-111' || o.id === '111');
    console.log("\nSHG API /shg/orders/assigned:");
    console.log("  Order 111 found in active SHG assigned:", !!order111Shg);
    if (order111Shg) {
      console.log("  mainStatus:", order111Shg.mainStatus);
      console.log("  dropShgStatus:", order111Shg.dropShgStatus);
    }
  } catch (err) {
    console.error("Error fetching SHG assigned:", err.message);
  }

  // 3. SHG App completed orders endpoint for Drop SHG (Rutuja, ID 2)
  try {
    const resShgCompleted = await axios.get(`${BASE_URL}/shg/orders/completed`, {
      headers: { user: JSON.stringify({ id: 2, role: 'SHG', phoneNumber: '9999999993' }) }
    });
    const newOrders = resShgCompleted.data?.newOrders || resShgCompleted.data || [];
    const order111Completed = (Array.isArray(newOrders) ? newOrders : []).find(o => o.orderId === '111' || o.id === 'ORD-2026-111' || o.id === '111');
    console.log("\nSHG API /shg/orders/completed:");
    console.log("  Order 111 found in SHG completed:", !!order111Completed);
  } catch (err) {
    console.error("Error fetching SHG completed:", err.message);
  }
}

test();
