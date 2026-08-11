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

      const rawItems = Array.isArray(response?.groupedOrders)
        ? response.groupedOrders
        : (Array.isArray(response?.items) ? response.items : []);

      const rawStats = response?.stats || {
        totalOrders: response?.pagination?.total || rawItems.length || 0,
        completedOrders: rawItems.filter((i: any) => i.status === 'COMPLETED' || i.mainStatus === 'COMPLETED' || i.mainStatus === 'DELIVERED').length || 0,
      };

      // Construct grouped sections for SectionList
      let formattedGroups: HistoryGroup[] = [];
      if (Array.isArray(response?.groupedOrders)) {
        formattedGroups = response.groupedOrders;
      } else if (rawItems.length > 0) {
        const groupMap: Record<string, any[]> = {};
        rawItems.forEach((item: any) => {
          const dateObj = new Date(item.createdAt || Date.now());
          const groupTitle = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : 'Order History';
          if (!groupMap[groupTitle]) {
            groupMap[groupTitle] = [];
          }
          groupMap[groupTitle].push(item);
        });

        formattedGroups = Object.entries(groupMap).map(([title, data]) => ({
          title,
          data,
        }));
      }

      if (isRefresh || currentPage === 1) {
        setGroupedOrders(formattedGroups);
      } else {
        setGroupedOrders(prev => {
          const newGroups = Array.isArray(prev) ? [...prev] : [];
          formattedGroups.forEach(incomingGroup => {
            const existingGroupIndex = newGroups.findIndex(g => g.title === incomingGroup.title);
            if (existingGroupIndex !== -1) {
              newGroups[existingGroupIndex].data = [...(newGroups[existingGroupIndex].data || []), ...(incomingGroup.data || [])];
            } else {
              newGroups.push(incomingGroup);
            }
          });
          return newGroups;
        });
      }

      setStats(rawStats);
      const totalPages = response?.meta?.totalPages || response?.pagination?.totalPages || 1;
      setHasMore(currentPage < totalPages);
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
