const fs = require('fs');
const path = require('path');

const keysPath = path.join(__dirname, 'extracted_keys.json');
const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

const localesDir = path.join(__dirname, 'src', 'locales');
const files = ['en.json', 'hi.json', 'mr.json'];

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.assign(data, keys);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
});
console.log('Appended keys to all locale files.');
