const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
      }
    }
  }

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();
const unifiedBackendPort = 3000;
const apiUrlValue = `http://${localIp}:${unifiedBackendPort}/api`;

console.log(`[IP Auto-Config] Detected local LAN IP: ${localIp}`);
console.log(`[IP Auto-Config] Unified Backend Port: ${unifiedBackendPort}`);

const transporterEnvPath = path.join(__dirname, '..', '..', '..', 'apps', 'transporter-app', '.env');
updateEnvFile(transporterEnvPath, apiUrlValue);

const shgEnvPath = path.join(__dirname, '..', '..', '..', 'apps', 'shg-app', '.env');
updateEnvFile(shgEnvPath, apiUrlValue);

function updateEnvFile(filePath, value) {
  try {
    let content = '';
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
      const regex = /^EXPO_PUBLIC_API_URL=.*$/m;

      if (regex.test(content)) {
        content = content.replace(regex, `EXPO_PUBLIC_API_URL=${value}`);
      } else {
        content += `\nEXPO_PUBLIC_API_URL=${value}\n`;
      }
    } else {
      content = `EXPO_PUBLIC_API_URL=${value}\n`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[IP Auto-Config] Successfully updated ${path.basename(filePath)} -> EXPO_PUBLIC_API_URL=${value}`);
  } catch (err) {
    console.error(`[IP Auto-Config] Failed to update env file at ${filePath}:`, err.message);
  }
}
