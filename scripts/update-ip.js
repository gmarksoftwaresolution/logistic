const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  
  // Look for standard WiFi/Ethernet IPs first (typically 192.168.x.x or 10.x.x.x)
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
      }
    }
  }

  // Fallback to any non-internal IPv4
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
const backendPort = 3001; // Transporter backend port
const apiUrlValue = `http://${localIp}:${backendPort}`;

console.log(`[IP Auto-Config] Detected local LAN IP: ${localIp}`);

// Update .env for transporter-app
const transporterEnvPath = path.join(__dirname, '..', 'apps', 'transporter-app', '.env');
updateEnvFile(transporterEnvPath, apiUrlValue);

// Also update .env for shg-app if it exists (using its port 3000)
const shgEnvPath = path.join(__dirname, '..', 'apps', 'shg-app', '.env');
const shgApiUrlValue = `http://${localIp}:3000`;
updateEnvFile(shgEnvPath, shgApiUrlValue);

function updateEnvFile(filePath, value) {
  if (!fs.existsSync(filePath)) {
    console.log(`[IP Auto-Config] Env file not found at ${filePath}, skipping.`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /^EXPO_PUBLIC_API_URL=.*$/m;

    if (regex.test(content)) {
      content = content.replace(regex, `EXPO_PUBLIC_API_URL=${value}`);
    } else {
      content += `\nEXPO_PUBLIC_API_URL=${value}\n`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[IP Auto-Config] Successfully updated ${path.basename(filePath)} -> EXPO_PUBLIC_API_URL=${value}`);
  } catch (err) {
    console.error(`[IP Auto-Config] Failed to update env file at ${filePath}:`, err.message);
  }
}
