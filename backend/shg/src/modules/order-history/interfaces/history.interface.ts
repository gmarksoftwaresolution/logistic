export interface IHistoryStats {
  totalOrders: number;
  completedOrders: number;
  rejectedOrders: number;
}

export interface IHistoryResponse {
  success: boolean;
  stats: IHistoryStats;
  groupedOrders: any[]; // we'll use Prisma return types in the service, but keep interface generic or bind to entity
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
