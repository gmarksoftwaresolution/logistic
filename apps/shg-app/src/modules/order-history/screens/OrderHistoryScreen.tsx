import React, { useContext, useState } from 'react';
import { View, Text, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from "../../../navigation/types";
import { LanguageContext } from '../../../context/LanguageContext';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { HistoryHeader } from '../components/HistoryHeader';
import { HistoryStats } from '../components/HistoryStats';
import { HistorySearch } from '../components/HistorySearch';
import { HistoryTabs } from '../components/HistoryTabs';
import { HistoryFilterModal } from '../components/HistoryFilterModal';
import { HistoryCard } from '../components/HistoryCard';
import { EmptyHistory } from '../components/EmptyHistory';
import { AddressDetailsModal } from '../../../components/AddressDetailsModal';
import { HistoryItem } from '../types/history.types';
import { getFormattedOrderId } from '../../../utils/orderHelpers';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'OrderHistory'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const OrderHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const t = context?.t || ((k: string) => k);

  const {
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
  } = useOrderHistory();

  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedAddressOrder, setSelectedAddressOrder] = useState<HistoryItem | null>(null);

  const renderHeader = () => (
    <View>
      <HistoryHeader />
      <HistoryStats stats={stats} />
      <HistorySearch 
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilterPress={() => setFilterVisible(true)}
      />
      <HistoryTabs 
        selectedStatus={statusFilter}
        onSelect={setStatusFilter}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {loading && !refreshing && groupedOrders.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#073318" />
        </View>
      ) : (
        <SectionList
          sections={groupedOrders}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <HistoryCard 
              order={item} 
              onPress={(order) => {
                navigation.navigate('OrderHistoryDetails', { order });
              }}
              onViewAddress={setSelectedAddressOrder}
            />
          )}
          renderSectionHeader={({ section: { title, data } }) => (
            <View className="flex-row justify-between items-center px-5 py-3 bg-[#F8FAFC]">
              <Text className="text-[14px] font-bold text-slate-800">{title}</Text>
              <View className="bg-slate-200 px-2 py-0.5 rounded-md">
                <Text className="text-[11px] font-bold text-slate-600">
                  {data.length} {t('orders') || 'Orders'}
                </Text>
              </View>
            </View>
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View className="px-5 mt-10">
              <EmptyHistory />
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#073318']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#073318" />
              </View>
            ) : null
          }
        />
      )}

      <HistoryFilterModal 
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        initialFilterType="All"
        onApply={(filterType, range) => {
          setFilterVisible(false);
          setDateRange(range);
        }}
      />

      {selectedAddressOrder && (() => {
        let pickup = selectedAddressOrder.seller?.address;
        let delivery = selectedAddressOrder.buyer?.address;
        
        if (selectedAddressOrder.legType === 'pickup') {
            delivery = { addressLine1: 'Transporter Hub' };
        } else {
            pickup = { addressLine1: 'Transporter Hub' };
        }

        return (
          <AddressDetailsModal
            visible={!!selectedAddressOrder}
            onClose={() => setSelectedAddressOrder(null)}
            orderIdText={selectedAddressOrder.pickupOrderNumber || selectedAddressOrder.dropOrderNumber || selectedAddressOrder.masterOrder?.orderNumber || `ORD-${selectedAddressOrder.id}`}
            pickupAddress={pickup}
            deliveryAddress={delivery}
            distance={'0'}
          />
        );
      })()}
    </SafeAreaView>
  );
};

export default OrderHistoryScreen;
