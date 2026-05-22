export const getRouteForOrder = (item: any) => {
  if (item.id === 'inc-1') return 'Transporter > HDFC Bank, nesari';
  if (item.id === 'inc-2') return 'Transporter > surya bekari, nesari';
  if (item.id === 'inc-3') return 'hifi shop > Transporter';
  if (item.id === 'inc-4') return 'home no. 23 > Transporter';
  return item.currentHolder === 'Transporter' ? 'Transporter > Buyer' : 'Seller > Transporter';
};

export const getInfoForOrder = (item: any) => {
  const date = '18 May 2024';
  let time = '11:00 AM';
  if (item.id === 'inc-2' || item.id === 'inc-4') {
    time = '01:00 PM';
  }
  return { date, time };
};

export const getFormattedOrderId = (item: any) => {
  return `ORD-1769749895005-${item.id.replace('inc-', '')}`;
};
