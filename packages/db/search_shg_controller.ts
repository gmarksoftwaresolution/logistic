import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = path.join(__dirname, '../../backend/shg/src/order/order.controller.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log('Searching for endpoints in SHG order.controller.ts...');
  
  lines.forEach((line, idx) => {
    if (line.includes('@Get(') || line.includes('@Post(') || line.includes('assigned')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}

main().catch(console.error);
