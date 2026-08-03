import axios from 'axios';

async function main() {
  console.log('=== CHECK SERVER HEALTH ===');
  try {
    const res1 = await axios.get('http://localhost:3001/orders/counts', {
      headers: { 'x-bypass-token': 'GMU_INTERNAL_BYPASS', 'x-user-role': 'ADMIN' }
    });
    console.log('GMU Backend Port 3001 Counts:', res1.data);
  } catch (err: any) {
    console.error('GMU Backend Port 3001 Error:', err.message);
  }

  try {
    const res2 = await axios.get('http://localhost:3001/orders/pickup/assigned', {
      headers: { 'x-bypass-token': 'GMU_INTERNAL_BYPASS', 'x-user-role': 'ADMIN' }
    });
    console.log('GMU Backend Port 3001 Pickup Assigned length:', res2.data?.length);
  } catch (err: any) {
    console.error('GMU Backend Port 3001 Assigned Error:', err.message);
  }
}

main();
