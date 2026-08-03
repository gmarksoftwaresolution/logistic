import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = path.join(__dirname, '../../backend/shg/src/order/order.service.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log('Searching around line 658 in shg order.service.ts...');
  for (let i = Math.max(0, 640); i < Math.min(lines.length, 675); i++) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
  }
}

main().catch(console.error);
