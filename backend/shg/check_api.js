const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/orders/returns/pickup/197/reject',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});
req.on('error', error => console.error(error));
req.write(JSON.stringify({ reason: 'Test' }));
req.end();
