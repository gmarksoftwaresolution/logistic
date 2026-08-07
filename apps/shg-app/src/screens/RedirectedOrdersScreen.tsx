import React, { useContext, useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  ScrollView,
  Dimensions
} from 'react-native';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders } from '../context/OrderContext';
import { SharedHeader } from '../components/SharedHeader';
import { OrderCard } from '../components/OrderCard';
import { ViewMoreButton } from '../components/ViewMoreButton';
import { getRouteForOrder, getInfoForOrder, translateRoutePart, getFormattedOrderId, getModalAddresses } from '../utils/orderHelpers';
import { FilterModal } from '../components/FilterModal';
import { FilterState, isOrderInDateRange } from '../utils/dateFilters';
import { AddressDetailsModal } from '../components/AddressDetailsModal';
import { Order } from '../context/OrderContext';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'RedirectedOrders'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RedirectedOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { redirectedOrders, highlightedOrders, refreshOrdersList } = useOrders();
  
  const [filterState, setFilterState] = useState<FilterState>({ type: 'today' });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const PAGE_SIZE = 5;
  const [pickupVisibleCount, setPickupVisibleCount] = useState(PAGE_SIZE);
  const [deliveryVisibleCount, setDeliveryVisibleCount] = useState(PAGE_SIZE);

  const [selectedAddressOrder, setSelectedAddressOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'pickup' | 'drop'>('pickup');
  const scrollViewRef = useRef<ScrollView>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (refreshOrdersList) await refreshOrdersList();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (refreshOrdersList) refreshOrdersList().catch(err => console.log('Error refreshing redirected orders:', err));
    });
    return unsubscribe;
  }, [navigation, refreshOrdersList]);

  if (!context || !user) return null;
  const { t } = context;

  // Filter redirected orders based on date filter
  const filteredOrders = redirectedOrders.filter(item => {
    const info = getInfoForOrder(item);
    const dateStr = item.date || info.date; 
    return isOrderInDateRange(dateStr, filterState);
  });

  const getRedirectStatusLabel = (item: Order) => {
    const transStatus = item.pickupTransporterStatus || '';
    const mainStatus = item.mainStatus || '';

    if (transStatus === 'PARCEL_PICKED' || mainStatus === 'IN_TRANSIT_TO_HUB' || mainStatus === 'PARCEL_PICKED') {
      return 'In Transit to Hub';
    }
    if (transStatus === 'TRANSPORTER_ACCEPTED' || mainStatus === 'PICKUP_TRANSPORTER_ACCEPTED') {
      return 'Transporter Accepted';
    }
    return 'Awaiting Transporter';
  };

  // Categorize redirected orders
  const pickupOrders = filteredOrders.filter(o => getRedirectStatusLabel(o) !== 'In Transit to Hub');
  const deliveryOrders = filteredOrders.filter(o => getRedirectStatusLabel(o) === 'In Transit to Hub');

  const handleTabPress = (tab: 'pickup' | 'drop') => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({
      x: tab === 'pickup' ? 0 : SCREEN_WIDTH,
      animated: false,
    });
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    const newTab = index === 0 ? 'pickup' : 'drop';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const renderOrderCard = (item: Order) => {
    const routeStr = getRouteForOrder(item);
    const routeParts = routeStr.split('>');
    const source = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
    const destination = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);
    const orderIdText = `#${getFormattedOrderId(item)}`;
    const info = getInfoForOrder(item);

    return (
      <OrderCard
        orderIdText={orderIdText}
        source={source}
        destination={destination}
        qty={item.remainingQty || 1}
        date={info.date}
        time={info.time}
        distance={item.distance}
        showScanner={false}
        onPressCard={() => navigation.navigate('OrderDetails', { order: item })}
        onViewAddress={() => setSelectedAddressOrder(item)}
        isHighlighted={highlightedOrders[item.id]}
        isRescheduled={false}
        isRedirected={true}
        transporterName={item.transporterName}
        transporterMobile={item.transporterMobile}
        vehicleNumber={item.vehicleNumber}
        transporterId={item.transporterId}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <SharedHeader 
        title="Redirected Orders" 
        subtitle="Orders redirected directly to Transporters for pickup" 
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
        {/* Pickup Tab Button */}
        <TouchableOpacity
          onPress={() => handleTabPress('pickup')}
          activeOpacity={0.8}
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${activeTab === 'pickup' ? 'bg-[#073318]' : 'bg-transparent'}`}
          style={activeTab === 'pickup' ? {
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          } : undefined}
        >
          <Ionicons
            name={activeTab === 'pickup' ? "cube" : "cube-outline"}
            size={16}
            color={activeTab === 'pickup' ? "#FFFFFF" : "#64748B"}
          />
          <Text className={`font-bold text-[13px] ml-1.5 ${activeTab === 'pickup' ? 'text-white' : 'text-slate-500'}`}>
            {t("tab_pickup") || "Pickup"}
          </Text>
          <View
            className="px-2.5 py-0.5 rounded-full ml-2"
            style={activeTab === 'pickup' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
          >
            <Text className={`text-[10px] font-extrabold ${activeTab === 'pickup' ? 'text-white' : 'text-slate-500'}`}>
              {pickupOrders.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Drop Tab Button */}
        <TouchableOpacity
          onPress={() => handleTabPress('drop')}
          activeOpacity={0.8}
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${activeTab === 'drop' ? 'bg-[#073318]' : 'bg-transparent'}`}
          style={activeTab === 'drop' ? {
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          } : undefined}
        >
          <Ionicons
            name={activeTab === 'drop' ? "bicycle" : "bicycle-outline"}
            size={16}
            color={activeTab === 'drop' ? "#FFFFFF" : "#64748B"}
          />
          <Text className={`font-bold text-[13px] ml-1.5 ${activeTab === 'drop' ? 'text-white' : 'text-slate-500'}`}>
            Drop
          </Text>
          <View
            className="px-2.5 py-0.5 rounded-full ml-2"
            style={activeTab === 'drop' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
          >
            <Text className={`text-[10px] font-extrabold ${activeTab === 'drop' ? 'text-white' : 'text-slate-500'}`}>
              {deliveryOrders.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Swipeable Pager Area */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
        contentContainerStyle={{ width: SCREEN_WIDTH * 2 }}
      >
        {/* Page 1: Pickup Screen */}
        <FlatList
          refreshControl={<SharedRefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          data={pickupOrders.length === 0 ? [] : pickupOrders.slice(0, pickupVisibleCount)}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          ListEmptyComponent={
            pickupOrders.length === 0 ? (
              <View
                className="items-center justify-center py-12 px-6 rounded-[24px] bg-white/40 border-2 border-[#CBD5E1]"
                style={{ borderStyle: 'dashed' }}
              >
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-white shadow-sm"
                  style={{ borderWidth: 1, borderColor: '#E2E8F0' }}
                >
                  <Ionicons name="cube-outline" size={28} color="#94A3B8" />
                </View>
                <Text className="text-[15px] font-black text-slate-700 text-center">
                  No redirected pickup orders found
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => renderOrderCard(item)}
          ListFooterComponent={
            pickupOrders.length > 0 ? (
              <ViewMoreButton 
                totalCount={pickupOrders.length}
                visibleCount={pickupVisibleCount}
                onPress={() => setPickupVisibleCount(prev => prev + PAGE_SIZE)}
              />
            ) : null
          }
        />

        {/* Page 2: Delivery Screen */}
        <FlatList
          refreshControl={<SharedRefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          data={deliveryOrders.length === 0 ? [] : deliveryOrders.slice(0, deliveryVisibleCount)}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          ListEmptyComponent={
            deliveryOrders.length === 0 ? (
              <View
                className="items-center justify-center py-12 px-6 rounded-[24px] bg-white/40 border-2 border-[#CBD5E1]"
                style={{ borderStyle: 'dashed' }}
              >
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-white shadow-sm"
                  style={{ borderWidth: 1, borderColor: '#E2E8F0' }}
                >
                  <Ionicons name="bicycle-outline" size={28} color="#94A3B8" />
                </View>
                <Text className="text-[15px] font-black text-slate-700 text-center">
                  No redirected drop orders found
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => renderOrderCard(item)}
          ListFooterComponent={
            deliveryOrders.length > 0 ? (
              <ViewMoreButton 
                totalCount={deliveryOrders.length}
                visibleCount={deliveryVisibleCount}
                onPress={() => setDeliveryVisibleCount(prev => prev + PAGE_SIZE)}
              />
            ) : null
          }
        />
      </ScrollView>

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

export default RedirectedOrdersScreen;
