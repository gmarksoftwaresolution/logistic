import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { SharedHeader } from '../components/SharedHeader';
import { useOrders } from '../context/OrderContext';
import { OrderCard } from '../components/OrderCard';
import { getRouteForOrder, getInfoForOrder } from '../utils/orderHelpers';
import { FilterModal } from '../components/FilterModal';
import { FilterState, isOrderInDateRange } from '../utils/dateFilters';
import WalkthroughElement from '../components/WalkthroughElement';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderHistory'>;

export default function OrderHistoryScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { deliveredOrders } = useOrders();
  
  const [filterState, setFilterState] = useState<FilterState>({ type: 'Today' });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  if (!context || !user) return null;
  const { t } = context;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <SharedHeader 
        title="Completed Orders" 
        subtitle={t('history_subtitle') || 'View your past performance'} 
        navigation={navigation} 
      />

      {/* Filter Button */}
      <View className="px-6 flex-row justify-end py-2">
        <TouchableOpacity
          onPress={() => setIsFilterModalVisible(true)}
          activeOpacity={0.7}
          className={`flex-row items-center px-4 py-2 rounded-full border ${isFilterModalVisible ? 'bg-[#F2FDF5] border-[#073318]' : 'bg-white border-slate-200 shadow-sm'}`}
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
        >
          <Ionicons name="filter" size={14} color={isFilterModalVisible ? '#073318' : '#4B5563'} style={{ marginRight: 6 }} />
          <Text className={`text-[13px] font-bold ${isFilterModalVisible ? 'text-[#073318]' : 'text-textPrimary'}`}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {(() => {
        const filteredOrders = deliveredOrders.filter(item => {
          const info = getInfoForOrder(item);
          return isOrderInDateRange(info.date, filterState);
        });

        if (filteredOrders.length === 0) {
          return (
            <View className="flex-1 items-center justify-center px-6 mt-16">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4 border border-slate-100">
                <Ionicons name="file-tray-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-textSecondary font-bold text-center">
                No orders found
              </Text>
            </View>
          );
        }

        return (
          <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
            {filteredOrders.map((item, index) => {
              const routeStr = getRouteForOrder(item);
              const routeParts = routeStr.split('>');
              const source = routeParts[0]?.trim() || 'Transporter';
              const destination = routeParts[1]?.trim() || 'Buyer';
              const orderIdText = `ORD-1769749895005-${item.id.replace('inc-', '')}`;
              const info = getInfoForOrder(item);

              const card = (
                <OrderCard
                  orderIdText={orderIdText}
                  source={source}
                  destination={destination}
                  qty={item.remainingQty || 1}
                  date={info.date}
                  time={info.time}
                  showScanner={false}
                  onPressCard={() => (navigation as any).navigate('CompletedOrderDetails', { order: item })}
                />
              );

              if (index === 0) {
                return (
                  <WalkthroughElement key={item.id} stepId="select_completed_order_card">
                    {card}
                  </WalkthroughElement>
                );
              }

              return React.cloneElement(card, { key: item.id });
            })}
            <View className="h-10" />
          </ScrollView>
        );
      })()}

      <FilterModal
        visible={isFilterModalVisible}
        currentFilter={filterState}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={(f) => setFilterState(f)}
      />
    </SafeAreaView>
  );
}
