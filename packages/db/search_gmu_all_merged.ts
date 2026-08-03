import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = path.join(__dirname, '../../apps/GMU-hub/src/pages/OrderManagementPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log('Searching for allMergedOrders and its source variables in OrderManagementPage.tsx...');
  
  lines.forEach((line, idx) => {
    if (line.includes('allMergedOrders') || line.includes('const returnPickupNewOrders') || line.includes('const returnDropNewOrders')) {
      if (line.length < 150) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    }
  });
}

main().catch(console.error);
