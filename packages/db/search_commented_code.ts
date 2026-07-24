import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = path.join(__dirname, '../../backend/transporter/src/order/order.service.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log('Searching for commented block comments or mentions of "disabled" in order.service.ts...');
  
  let insideComment = false;
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.includes('/*') || trimmed.startsWith('//') || trimmed.includes('disabled') || trimmed.includes('Disabled')) {
      console.log(`${idx + 1}: ${trimmed}`);
    }
  });
}

main().catch(console.error);
