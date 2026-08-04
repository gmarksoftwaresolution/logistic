const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src/generated');
const dest = path.join(__dirname, 'dist/generated');

if (fs.existsSync(src)) {
  try {
    fs.cpSync(src, dest, { recursive: true, force: true, errorOnExist: false });
    console.log('Copied src/generated to dist/generated successfully.');
  } catch (err) {
    console.warn('Note on copying src/generated to dist/generated:', err.message);
  }
} else {
  console.log('src/generated does not exist.');
}
