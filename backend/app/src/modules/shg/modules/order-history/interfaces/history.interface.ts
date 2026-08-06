export interface IHistoryStats {
  totalOrders: number;
  completedOrders: number;
}

export interface IHistoryResponse {
  success?: boolean;
  stats?: IHistoryStats;
  groupedOrders?: any[];
  items?: any[];
  pagination?: any;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
