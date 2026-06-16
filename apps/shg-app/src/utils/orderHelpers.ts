export const getRouteForOrder = (item: any) => {
  if (item.id?.startsWith('RTO-')) {
    if (item.isRejectedDelivery) {
      if (item.id === 'RTO-1769749895005-201' || item.id === 'RTO-1769749895005-204') {
        // Return drops (Transporter -> Customer). If rejected, returns to Transporter.
        return `${item.address} > Transporter`;
      } else {
        // Return pickups (Customer -> Transporter). If rejected, returns to Customer.
        return `Transporter > ${item.address}`;
      }
    }
    
    if (item.legType === 'pickup') {
      return `${item.address} > Transporter`;
    } else {
      if (item.id === 'RTO-1769749895005-201' || item.id === 'RTO-1769749895005-204') {
        return `Transporter > ${item.address}`;
      } else {
        return `${item.address} > Transporter`;
      }
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
