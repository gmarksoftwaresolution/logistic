import * as fs from 'fs';
import * as path from 'path';

const files = [
  'seed_20_mixed_orders.ts',
  'seed_consolidated_orders.ts',
  'seed_mock_orders.ts',
  'seed_4_orders.ts',
  'clean_and_seed_3.ts'
];

async function main() {
  console.log('Searching for PickupOrder/DropOrder creations in seed files...');
  
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find blocks where "prisma.pickupOrder.create" or "prisma.dropOrder.create" is called
    // and see the status set, and check the corresponding prisma.order.create call.
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('prisma.pickupOrder.create') || line.includes('prisma.dropOrder.create') || line.includes('prisma.order.create')) {
        console.log(`\n--- ${file} (Line ${idx + 1}) ---`);
        for (let i = Math.max(0, idx - 10); i < Math.min(lines.length, idx + 20); i++) {
          console.log(`${i + 1}: ${lines[i]}`);
        }
      }
    });
  }
}

main().catch(console.error);
