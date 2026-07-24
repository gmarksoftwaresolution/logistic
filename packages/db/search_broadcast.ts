import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = path.join(__dirname, '../../backend/transporter/src/order/order.service.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log('Searching for "broadcast" or "autoBroadcast" in transporter order.service.ts...');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('broadcast')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}

main().catch(console.error);
