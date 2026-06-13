import { useState, useCallback, useEffect } from 'react';
import { getOrderHistory } from '../services/orderHistoryService';
import { HistoryGroup, HistoryStats, HistoryStatus } from '../types/history.types';

export const useOrderHistory = () => {
  const [groupedOrders, setGroupedOrders] = useState<HistoryGroup[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<HistoryStatus>('All Orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{fromDate?: string; toDate?: string}>({});

  const fetchHistory = useCallback(async (isRefresh = false) => {
    const currentPage = isRefresh ? 1 : page;
    
    if (isRefresh) {
      setRefreshing(true);
    } else if (currentPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      const response = await getOrderHistory(
        currentPage,
        20,
        searchQuery,
        statusFilter,
        dateRange.fromDate,
        dateRange.toDate
      );

      if (isRefresh || currentPage === 1) {
        setGroupedOrders(response.groupedOrders);
      } else {
        // Merge the new groupedOrders with the existing ones intelligently
        setGroupedOrders(prev => {
          const newGroups = [...prev];
          response.groupedOrders.forEach(incomingGroup => {
            const existingGroupIndex = newGroups.findIndex(g => g.title === incomingGroup.title);
            if (existingGroupIndex !== -1) {
              newGroups[existingGroupIndex].data = [...newGroups[existingGroupIndex].data, ...incomingGroup.data];
            } else {
              newGroups.push(incomingGroup);
            }
          });
          return newGroups;
        });
      }
      
      setStats(response.stats);
      setHasMore(currentPage < response.meta.totalPages);
      setPage(currentPage + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [page, searchQuery, statusFilter, dateRange]);

  useEffect(() => {
    setPage(1);
    fetchHistory(true);
  }, [statusFilter, searchQuery, dateRange]);

  const loadMore = () => {
    if (hasMore && !loading && !loadingMore) {
      fetchHistory();
    }
  };

  const onRefresh = () => {
    fetchHistory(true);
  };

  return {
    groupedOrders,
    stats,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    loadMore,
    onRefresh,
  };
};
