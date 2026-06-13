import axiosInstance from '../../../api/axiosInstance';
import { HistoryResponse, HistoryStatus } from '../types/history.types';

export const getOrderHistory = async (
  page: number = 1,
  limit: number = 20,
  query?: string,
  status?: HistoryStatus,
  fromDate?: string,
  toDate?: string
): Promise<HistoryResponse> => {
  const params: any = { page, limit };
  if (query) params.query = query;
  if (status && status !== 'All Orders') {
    // backend expects 'Completed' or 'Rejected'
    params.status = status;
  }
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;

  const response = await axiosInstance.get('/order-history', { params });
  return response.data;
};

export const getOrderHistoryDetails = async (id: number | string): Promise<any> => {
  const response = await axiosInstance.get(`/order-history/${id}`);
  return response.data;
};
