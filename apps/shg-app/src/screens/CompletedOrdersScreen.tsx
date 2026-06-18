import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders } from '../context/OrderContext';
import { SharedHeader } from '../components/SharedHeader';
import { HighlightCardWrapper } from '../components/HighlightCardWrapper';
import { OrderDistance } from '../components/OrderDistance';
import { ViewMoreButton } from '../components/ViewMoreButton';
import { getRouteForOrder, getInfoForOrder, translateRoutePart, getFormattedOrderId, getModalAddresses } from '../utils/orderHelpers';
import { FilterModal } from '../components/FilterModal';
import { FilterState, isOrderInDateRange } from '../utils/dateFilters';
import { AddressDetailsModal } from '../components/AddressDetailsModal';
import { Order } from '../context/OrderContext';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'CompletedOrders'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const CompletedOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { deliveredOrders, highlightedOrders } = useOrders();
  
  const normalCompletedOrders = deliveredOrders.filter(o => !o.id.startsWith('RTO-'));
  const returnCompletedOrders = deliveredOrders.filter(o => o.id.startsWith('RTO-'));
  
  const [activeTab, setActiveTab] = useState<'new' | 'return'>('new');
  
  const [filterState, setFilterState] = useState<FilterState>({ type: 'today' });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedAddressOrder, setSelectedAddressOrder] = useState<Order | null>(null);

  if (!context || !user) return null;
  const { t } = context;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <SharedHeader 
        title={t("title_completed_orders") || "Completed Orders"} 
        subtitle={t("subtitle_completed_orders") || "Orders successfully completed for pickup & delivery"} 
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
            {t("filter_label") || "Filter"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Segment Tab Switcher */}
      <View
        className="bg-white border border-[#F1F5F9] rounded-[28px] p-1.5 flex-row mx-6 my-4 gap-2"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {/* New Tab Button */}
        <TouchableOpacity
          onPress={() => setActiveTab('new')}
          activeOpacity={0.8}
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${
            activeTab === 'new' ? 'bg-[#073318]' : 'bg-transparent'
          }`}
          style={activeTab === 'new' ? {
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          } : undefined}
        >
          <Text className={`font-bold text-[13px] ${
            activeTab === 'new' ? 'text-white' : 'text-slate-500'
          }`}>
            New
          </Text>
          <View 
            className="px-2.5 py-0.5 rounded-full ml-2"
            style={activeTab === 'new' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
          >
            <Text className={`text-[10px] font-extrabold ${
              activeTab === 'new' ? 'text-white' : 'text-slate-500'
            }`}>
              {normalCompletedOrders.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Return Tab Button */}
        <TouchableOpacity
          onPress={() => setActiveTab('return')}
          activeOpacity={0.8}
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${
            activeTab === 'return' ? 'bg-[#073318]' : 'bg-transparent'
          }`}
          style={activeTab === 'return' ? {
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          } : undefined}
        >
          <Text className={`font-bold text-[13px] ${
            activeTab === 'return' ? 'text-white' : 'text-slate-500'
          }`}>
            Return
          </Text>
          <View 
            className="px-2.5 py-0.5 rounded-full ml-2"
            style={activeTab === 'return' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
          >
            <Text className={`text-[10px] font-extrabold ${
              activeTab === 'return' ? 'text-white' : 'text-slate-500'
            }`}>
              {returnCompletedOrders.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {/* Main Content Area */}
      {(() => {
        const currentData = activeTab === 'new' ? normalCompletedOrders : returnCompletedOrders;
        const filteredOrders = currentData.filter(item => {
          const info = getInfoForOrder(item);
          const dateStr = item.time || info.date; 
          return isOrderInDateRange(dateStr, filterState);
        });

        return (
          <FlatList
            className="flex-1 pt-2"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
            data={filteredOrders.length === 0 ? [] : filteredOrders.slice(0, visibleCount)}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            ListEmptyComponent={
              filteredOrders.length === 0 ? (
                <View className="pt-6">
                  <View 
                    className="items-center justify-center py-12 px-6 rounded-[24px] bg-white/40 border-2 border-[#CBD5E1]"
                    style={{ borderStyle: 'dashed' }}
                  >
                    <View
                      className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-white shadow-sm"
                      style={{ borderWidth: 1, borderColor: '#E2E8F0' }}
                    >
                      <Ionicons name="time-outline" size={28} color="#94A3B8" />
                    </View>
                    <Text className="text-[15px] font-black text-slate-700 text-center">
                      {t("no_orders_found") || "No orders found"}
                    </Text>
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              const orderIdText = `#${getFormattedOrderId(item)}`;
              const routeStr = getRouteForOrder(item);
              const routeParts = routeStr.split('>');
              const source = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
              const destination = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);
              const info = getInfoForOrder(item);

              return (
                <HighlightCardWrapper isHighlighted={highlightedOrders[item.id]}>
                  <View 
                    className="rounded-[24px] mb-4 overflow-hidden border border-white/60"
                    style={{ 
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.85)'
                    }}
                  >
                    <BlurView intensity={50} tint="light">
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('CompletedOrderDetails', { order: item })}
                        className="p-5 bg-white/70"
                      >
                        <View className="flex-row justify-between items-center mb-3">
                          <Text className="text-[14px] font-black text-[#073318] tracking-wide">{orderIdText}</Text>
                          <View className="px-3.5 py-1.5 rounded-full bg-[#E2F0E7]">
                            <Text className="text-[11px] font-bold text-[#073318]">{t("status_completed") || "Completed"}</Text>
                          </View>
                        </View>
                        
                        <View className="flex-row items-center justify-between mb-2 mt-1">
                          <View className="flex-1 flex-row items-center pr-2">
                            <Text className="text-[13px] font-extrabold text-[#111827] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{source}</Text>
                            <Ionicons name="arrow-forward" size={12} color="#94A3B8" style={{ marginHorizontal: 6 }} />
                            <Text className="text-[13px] font-extrabold text-[#111827] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{destination}</Text>
                          </View>
                          <OrderDistance distance={item.distance} />
                        </View>

                        {/* View Address Button */}
                        <TouchableOpacity 
                          onPress={() => setSelectedAddressOrder(item)} 
                          activeOpacity={0.7}
                          className="mt-2 mb-4 self-start flex-row items-center px-2 py-0.5 rounded-[6px] border border-[#22C55E]/40 bg-[#F0FDF4]"
                        >
                          <Ionicons name="location-outline" size={10} color="#16A34A" style={{ marginRight: 4 }} />
                          <Text className="text-[10px] font-bold text-[#16A34A] tracking-wide">
                            {t("view_address") || "View Address"}
                          </Text>
                        </TouchableOpacity>
                        
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[13px] text-[#8792A1] font-medium">
                            {item.remainingQty || 1} {t("su_products") || "products"} • {item.weight || 2} {t("su_kg") || "kg"}
                          </Text>
                          <Text className="text-[12px] text-[#8792A1] font-medium">
                            {item.time || `${info.date}, ${info.time}`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </BlurView>
                  </View>
                </HighlightCardWrapper>
              );
            }}
            ListFooterComponent={
              filteredOrders.length > 0 ? (
                <ViewMoreButton 
                  totalCount={filteredOrders.length}
                  visibleCount={visibleCount}
                  onPress={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                />
              ) : null
            }
          />
        );
      })()}

      <FilterModal
        visible={isFilterModalVisible}
        currentFilter={filterState}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={(f) => setFilterState(f)}
      />

      {selectedAddressOrder && (() => {
        const { pickup, delivery } = getModalAddresses(selectedAddressOrder, t);
        return (
          <AddressDetailsModal
            visible={!!selectedAddressOrder}
            onClose={() => setSelectedAddressOrder(null)}
            orderIdText={getFormattedOrderId(selectedAddressOrder)}
            pickupAddress={pickup}
            deliveryAddress={delivery}
            distance={selectedAddressOrder.distance || '0'}
          />
        );
      })()}
    </SafeAreaView>
  );
};

export default CompletedOrdersScreen;
