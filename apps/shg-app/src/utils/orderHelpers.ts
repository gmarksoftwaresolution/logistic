export const formatAddressString = (addr: any): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [
      addr.addressLine1,
      addr.addressLine2,
      addr.landmark,
      addr.village,
      addr.taluka,
      addr.district,
      addr.city,
      addr.state,
      addr.pincode
    ].map(p => (p !== null && p !== undefined && typeof p !== 'object') ? String(p).trim() : '').filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }
  return typeof addr === 'object' ? '' : String(addr || '');
};

export const getRouteForOrder = (item: any) => {
  if (item.isRedirected || item.isPickupRedirected) {
    return `Seller > Transporter`;
  }

  // Use explicitly stored original route data for Return orders to prevent swapping
  if (item.id?.includes('RTO-') || item.orderId?.includes('RTO-') || item.id?.includes('RET-') || item.orderId?.includes('RET-')) {
    if (item.fromLocation && item.toLocation) {
      return `${formatAddressString(item.fromLocation)} > ${formatAddressString(item.toLocation)}`;
    }
    // Fallback if fromLocation/toLocation are missing for some reason, reconstruct original based on sourceAddress
    if (item.sourceAddress === 'Transporter') {
      return `Transporter > ${formatAddressString(item.address)}`;
    } else {
      const source = formatAddressString(item.sourceAddress || item.address);
      return `${source} > Transporter`;
    }
  }

  const addrStr = formatAddressString(item.address);

  if (item.legType === 'pickup') {
    // Seller Address -> Transporter
    return `${addrStr} > Transporter`;
  } else if (item.legType === 'drop') {
    const isToTransporter = addrStr.toLowerCase().includes('transporter');
    if (isToTransporter) {
      // Seller order delivery leg (Seller Address -> Transporter)
      const source = formatAddressString(item.sourceAddress || 'Seller');
      return `${source} > Transporter`;
    } else {
      // Transporter order delivery leg (Transporter -> Buyer Address)
      return `Transporter > ${addrStr}`;
    }
  } else {
    // Fallback if no legType
    if (item.status === 'assigned') {
      return `Transporter > ${addrStr}`;
    }
    const source = formatAddressString(item.sourceAddress || item.address);
    return `${source} > Transporter`;
  }
};

export const getModalAddresses = (item: any, t: any) => {
  const routeStr = getRouteForOrder(item);
  const routeParts = routeStr.split('>');
  const pickup = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
  const delivery = translateRoutePart(routeParts[1]?.trim() || 'Transporter', t);

  return { pickup, delivery };
};

export const getInfoForOrder = (item: any) => {
  const date = item.date || '18 May 2024';
  const time = item.time || '11:00 AM';
  return { date, time };
};

export const formatOrderNumber = (orderNumber: string | any) => {
  if (!orderNumber) return '';

  let rawId = typeof orderNumber === 'string'
    ? orderNumber
    : (orderNumber.orderId || orderNumber.id || '');

  rawId = rawId.replace('inc-', '');

  let formatted = rawId
    .replace(/-pickup-/gi, '-')
    .replace(/-drop-/gi, '-')
    .replace(/-pickup$/gi, '')
    .replace(/-drop$/gi, '')
    .replace(/^MO-/i, ''); // Strip MO- prefix

  return formatted.replace(/^#/, '');
};

export const getFormattedOrderId = (item: any) => {
  return formatOrderNumber(item);
};

export const translateRoutePart = (part: any, t: any) => {
  if (!part) return '';
  let p = typeof part === 'string' ? part : formatAddressString(part);
  p = (p || '').trim();
  if (p === 'Transporter') return t('su_transporter_346') || p;
  if (p === 'Buyer') return t('su_buyer') || p;
  if (p === 'Seller') return t('su_seller') || p;
  return p;
};
