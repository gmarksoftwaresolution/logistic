export const getRouteForOrder = (item: any) => {
  // item.address contains the formatted address from the backend
  // legType tells us if it's a pickup or drop
  if (item.legType === 'pickup') {
    // Seller -> Transporter
    return `${item.address} > Transporter`;
  } else {
    // Seller -> Transporter
    const source = item.sourceAddress || item.address;
    return `${source} > Transporter`;
  }
};

export const getInfoForOrder = (item: any) => {
  const date = '18 May 2024';
  let time = '11:00 AM';
  if (item.id === 'inc-4') {
    time = '01:00 PM';
  }
  return { date, time };
};

export const getFormattedOrderId = (item: any) => {
  // Use the actual backend orderId instead of generating a custom one
  return item.orderId || item.id;
};

export const translateRoutePart = (part: string, t: any) => {
  const p = part.trim();
  if (p === 'Transporter') return t('su_transporter_346') || p;
  if (p === 'Buyer') return t('su_buyer') || p;
  if (p === 'Seller') return t('su_seller') || p;
  return p;
};
