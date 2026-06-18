export const getRouteForOrder = (item: any) => {
  // Use explicitly stored original route data for Return orders to prevent swapping
  if (item.id?.includes('RTO-') || item.orderId?.includes('RTO-')) {
    if (item.fromLocation && item.toLocation) {
      return `${item.fromLocation} > ${item.toLocation}`;
    }
    // Fallback if fromLocation/toLocation are missing for some reason, reconstruct original based on sourceAddress
    if (item.sourceAddress === 'Transporter') {
      return `Transporter > ${item.address}`;
    } else {
      const source = item.sourceAddress || item.address;
      return `${source} > Transporter`;
    }
  }

  if (item.isRejectedDelivery) {
    if (item.legType === 'pickup') {
      // Returned back to Seller: Transporter -> Seller
      return `Transporter > ${item.sourceAddress || item.address}`;
    } else {
      // Returned back to Transporter: Buyer -> Transporter
      return `${item.address} > Transporter`;
    }
  }

  if (item.legType === 'pickup') {
    // Seller Address -> Transporter
    return `${item.address} > Transporter`;
  } else if (item.legType === 'drop') {
    const isToTransporter = item.address?.toLowerCase().includes('transporter');
    if (isToTransporter) {
      // Seller order delivery leg (Seller Address -> Transporter)
      const source = item.sourceAddress || 'Seller';
      return `${source} > Transporter`;
    } else {
      // Transporter order delivery leg (Transporter -> Buyer Address)
      return `Transporter > ${item.address}`;
    }
  } else {
    // Fallback if no legType
    if (item.status === 'assigned') {
      return `Transporter > ${item.address}`;
    }
    const source = item.sourceAddress || item.address;
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
    .replace(/-drop$/gi, '');

  return formatted.replace(/^#/, '');
};

export const getFormattedOrderId = (item: any) => {
  return formatOrderNumber(item);
};

export const translateRoutePart = (part: string, t: any) => {
  const p = part.trim();
  if (p === 'Transporter') return t('su_transporter_346') || p;
  if (p === 'Buyer') return t('su_buyer') || p;
  if (p === 'Seller') return t('su_seller') || p;
  return p;
};
