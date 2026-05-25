const fs = require('fs');
const code = fs.readFileSync('./src/screens/SignupScreen.tsx', 'utf8');

// Find all placeholder="..."
const placeholders = [...code.matchAll(/placeholder=(?:'([^']+)'|"([^"]+)")/g)].map(m => m[1] || m[2]);
console.log('Placeholders:', placeholders.length, placeholders.slice(0, 5));

// Find all text inside <Text>...</Text> (simple cases)
const texts = [...code.matchAll(/<Text[^>]*>\s*([^<{]+)\s*<\/Text>/g)].map(m => m[1].trim()).filter(Boolean);
console.log('Texts:', texts.length, texts.slice(0, 5));
