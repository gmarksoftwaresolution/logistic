const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude backend build folders and db build folders from Metro file watching and resolution
config.resolver.blockList = [
  /[\\/]backend[\\/][^\\/]+[\\/]dist[\\/]/,
  /[\\/]packages[\\/]db[\\/]dist[\\/]/,
  ...config.resolver.blockList
];

module.exports = withNativeWind(config, { input: "./global.css" });
