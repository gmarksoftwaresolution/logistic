export type FilterType = 'today' | '1_week' | '15_days' | '1_month' | 'custom_date_range';

export interface FilterState {
  type: FilterType;
  startDate?: Date;
  endDate?: Date;
}

export const parseOrderDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // Try direct parsing
  let d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  
  // Try cleaning string e.g. "21-May-2026, 5:18 pm" -> "21 May 2026"
  const cleaned = dateString.split(',')[0].replace(/-/g, ' ');
  d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  
  return new Date(); // fallback
};

export const isOrderInDateRange = (dateString: string, filterState: FilterState): boolean => {
  const orderDate = parseOrderDate(dateString);
  
  const today = new Date();
  // Set today to the end of the current day for inclusive upper bounds
  today.setHours(23, 59, 59, 999);
  
  const orderTime = orderDate.getTime();
  
  switch (filterState.type) {
    case 'today': {
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      return orderTime >= startOfToday.getTime() && orderTime <= today.getTime();
    }
    case '1_week': {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return orderTime >= start.getTime() && orderTime <= today.getTime();
    }
    case '15_days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 15);
      start.setHours(0, 0, 0, 0);
      return orderTime >= start.getTime() && orderTime <= today.getTime();
    }
    case '1_month': {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return orderTime >= start.getTime() && orderTime <= today.getTime();
    }
    case 'custom_date_range': {
      if (!filterState.startDate || !filterState.endDate) return true;
      const start = new Date(filterState.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filterState.endDate);
      end.setHours(23, 59, 59, 999);
      return orderTime >= start.getTime() && orderTime <= end.getTime();
    }
    default:
      return true;
  }
};
