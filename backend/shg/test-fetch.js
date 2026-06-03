const axios = require('axios');
require('dotenv').config();

async function testFetch() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      phoneNumber: '7777777777' // Assuming this is SHG 9
    });
    const token = loginRes.data.token;
    
    const res = await axios.get('http://localhost:3000/api/orders/pickup/assigned', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Assigned Pickups: ${res.data.length}`);
    console.log(`Statuses: ${res.data.map(d => d.status).join(', ')}`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testFetch();
