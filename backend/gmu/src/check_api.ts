import axios from 'axios';

async function main() {
  const loginRes = await axios.post('http://localhost:3002/auth/login', {
    mobileNumber: '1111111111',
    otp: '123456'
  });
  const token = loginRes.data.accessToken;
  
  const returnsRes = await axios.get('http://localhost:3002/orders/returns/buyer', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  console.log('API getReturnsBuyer response raw data:');
  console.dir(returnsRes.data.map((o: any) => ({ id: o.id, orderId: o.orderId, mainStatus: o.mainStatus })), { depth: null });
}

main().catch(console.error);
