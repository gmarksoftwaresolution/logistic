export const getRouteForOrder = (item: any) => {
  // item.address contains the formatted address from the backend
  // legType tells us if it's a pickup or drop
  if (item.legType === 'pickup') {
    // Seller -> Transporter
    return `${item.address} > Transporter`;
  } else if (item.legType === 'drop') {
    // Transporter -> Buyer
    return `Transporter > ${item.address}`;
  } else {
    // Fallback if no legType
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
  const date = '18 May 2024';
  let time = '11:00 AM';
  if (item.id === 'inc-4') {
    time = '01:00 PM';
  }
  return { date, time };
};

export const formatOrderNumber = (orderNumber: string | any) => {
  if (!orderNumber) return '';
  
  let rawId = typeof orderNumber === 'string' 
    ? orderNumber 
    : (orderNumber.orderId || orderNumber.id || '');
  
  rawId = rawId.replace('inc-', '');

  if (!rawId.startsWith('ORD-') && !rawId.startsWith('#')) {
    rawId = `ORD-1769749895005-${rawId}`;
  }

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
