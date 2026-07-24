import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SharedHeader } from '../components/SharedHeader';
import { LanguageContext } from '../context/LanguageContext';
import axiosInstance from '../api/axiosInstance';

const EarningsScreen: React.FC<{ route?: any, navigation?: any }> = ({ route, navigation }) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;

  const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState<any>(null);

  const fetchEarnings = async () => {
    try {
      const response = await axiosInstance.get(`/earnings?filter=${activeFilter}`);
      if (response.data?.success) {
        setEarningsData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch earnings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEarnings();
  }, [activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEarnings();
    setRefreshing(false);
  }, [activeFilter]);

  const formatCurrency = (amount: number) => {
    return '₹' + (amount || 0).toLocaleString('en-IN');
  };

  const renderFilterTabs = () => {
    const tabs: Array<{ key: 'today' | 'week' | 'month', label: string }> = [
      { key: 'today', label: 'Today' },
      { key: 'week', label: 'This Week' },
      { key: 'month', label: 'This Month' },
    ];

    return (
      <View style={styles.filterContainer}>
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSummaryCards = () => {
    const summary = earningsData?.summary || {};
    const cards = [
      { title: "Today's Earnings", amount: summary.todayEarnings || 0, icon: "cash-outline" },
      { title: "This Week", amount: summary.weekEarnings || 0, icon: "calendar-outline" },
      { title: "This Month", amount: summary.monthEarnings || 0, icon: "wallet-outline" },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryCardsContainer}>
        {cards.map((card, idx) => (
          <View key={idx} style={styles.summaryCard}>
            <View style={styles.summaryCardIconWrap}>
              <Ionicons name={card.icon as any} size={20} color="#16A34A" />
            </View>
            <Text style={styles.summaryCardTitle}>{card.title}</Text>
            <Text style={styles.summaryCardAmount}>{formatCurrency(card.amount)}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderEarningsSummary = () => {
    const summary = earningsData?.summary || {};
    return (
      <View style={styles.earningsSummaryContainer}>
        <View style={styles.earningsSummaryContent}>
          <Text style={styles.sectionHeader}>Earnings Summary</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryRowLeft}>
              <View style={styles.summaryRowIcon}>
                <Ionicons name="cube-outline" size={20} color="#64748B" />
              </View>
              <Text style={styles.summaryRowLabel}>Completed Orders</Text>
            </View>
            <Text style={styles.summaryRowValue}>{summary.completedOrders || 0}</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryRowLeft}>
              <View style={styles.summaryRowIcon}>
                <Ionicons name="pricetag-outline" size={20} color="#64748B" />
              </View>
              <Text style={styles.summaryRowLabel}>Per Order Rate</Text>
            </View>
            <Text style={styles.summaryRowValue}>{formatCurrency(summary.perOrderRate || 15)}</Text>
          </View>

          <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={styles.summaryRowLeft}>
              <View style={styles.summaryRowIcon}>
                <Ionicons name="wallet" size={20} color="#16A34A" />
              </View>
              <Text style={[styles.summaryRowLabel, { fontWeight: '600', color: '#1E293B' }]}>Total Earnings</Text>
            </View>
            <Text style={[styles.summaryRowValue, { color: '#16A34A', fontSize: 18 }]}>{formatCurrency(summary.totalEarnings || 0)}</Text>
          </View>
        </View>
        
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#16A34A" />
          <Text style={styles.infoBannerText}>You earn ₹15 for every completed order.</Text>
        </View>
      </View>
    );
  };

  const renderRecentEarnings = () => {
    const recent = earningsData?.recentEarnings || [];
    
    return (
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionHeader}>Recent Earnings</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All {'>'}</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No recent earnings found.</Text>
          </View>
        )}

        {recent.map((earning: any, index: number) => {
          const date = new Date(earning.completedAt);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          let dateStr = '';
          if (date.toDateString() === today.toDateString()) {
            dateStr = 'Today';
          } else if (date.toDateString() === yesterday.toDateString()) {
            dateStr = 'Yesterday';
          } else {
            dateStr = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
          }
          
          const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
          const timeLabel = `${dateStr} • ${timeStr}`;

          return (
            <View key={earning.id} style={styles.earningItem}>
              <View style={styles.earningItemLeft}>
                <View style={styles.earningIconWrap}>
                  <Ionicons name="document-text-outline" size={24} color="#16A34A" />
                </View>
                <View style={styles.earningItemTextWrap}>
                  <Text style={styles.earningOrderNumber}>{earning.orderNumber}</Text>
                  <Text style={styles.earningTime}>{timeLabel}</Text>
                </View>
              </View>
              <Text style={styles.earningAmount}>+{formatCurrency(earning.amount)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title={t('earning') || 'Earnings'} subtitle="Track your earnings and income" navigation={navigation} />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <SharedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderFilterTabs()}
        
        {loading && !refreshing ? (
          <View style={{ marginTop: 40 }}>
            <ActivityIndicator size="large" color="#16A34A" />
          </View>
        ) : (
          <>
            {renderSummaryCards()}
            {renderEarningsSummary()}
            {renderRecentEarnings()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  filterTabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  summaryCardsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    width: 140,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryCardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  earningsSummaryContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  earningsSummaryContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryRowLabel: {
    fontSize: 14,
    color: '#475569',
  },
  summaryRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    paddingHorizontal: 16,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#15803D',
    marginLeft: 8,
    fontWeight: '500',
  },
  recentSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  earningItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  earningItemTextWrap: {
    justifyContent: 'center',
  },
  earningOrderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  earningTime: {
    fontSize: 13,
    color: '#64748B',
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#94A3B8',
    fontSize: 14,
  }
});

export default EarningsScreen;
