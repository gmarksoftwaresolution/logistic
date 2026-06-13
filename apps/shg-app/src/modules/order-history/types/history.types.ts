export type HistoryStatus = 'All Orders' | 'Completed' | 'Rejected';

export interface HistoryStats {
  totalOrders: number;
  completedOrders: number;
  rejectedOrders: number;
}

export interface HistoryFilter {
  status: HistoryStatus;
  fromDate?: string;
  toDate?: string;
  searchQuery?: string;
}

export interface HistoryItem {
  id: number;
  legType: 'pickup' | 'drop';
  status: string;
  createdAt: string;
  pickupOrderNumber?: string;
  dropOrderNumber?: string;
  masterOrder?: any;
  items?: any[];
  seller?: any;
  buyer?: any;
  deliveryAddress?: string;
}

export interface HistoryGroup {
  title: string;
  data: HistoryItem[];
}

export interface HistoryResponse {
  success: boolean;
  stats: HistoryStats;
  groupedOrders: HistoryGroup[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
