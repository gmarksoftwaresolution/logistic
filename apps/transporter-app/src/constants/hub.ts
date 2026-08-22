export const HUB_CONFIG = {
  name: 'Nesari Hub',
  fullName: 'Nesari Central GMU Hub',
  address: 'Nesari Central GMU Hub, Near Main Station, Nesari',
  village: 'Nesari',
  taluka: 'Gadhinglaj',
  district: 'Kolhapur',
  state: 'Maharashtra',
  pincode: '416504',
};

/**
 * Helper to check if a point name matches a Hub point.
 * Supports current HUB_CONFIG.name and legacy names for backward compatibility with active orders.
 */
export const isHubPoint = (pointName?: string | null): boolean => {
  if (!pointName) return false;
  const normalized = pointName.trim().toLowerCase();
  return (
    normalized === HUB_CONFIG.name.toLowerCase() ||
    normalized === HUB_CONFIG.fullName.toLowerCase() ||
    normalized === 'gadhinglaj hub' ||
    normalized === 'central hub gmu' ||
    normalized === 'gadhinglaj central gmu hub'
  );
};
