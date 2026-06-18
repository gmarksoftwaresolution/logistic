import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders, Order } from '../context/OrderContext';
import { SharedHeader } from '../components/SharedHeader';
import { OrderCard } from '../components/OrderCard';
import { ViewMoreButton } from '../components/ViewMoreButton';
import { getRouteForOrder, getInfoForOrder, translateRoutePart, getFormattedOrderId, getModalAddresses } from '../utils/orderHelpers';
import { AddressDetailsModal } from '../components/AddressDetailsModal';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'ReturnOrders'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ReturnOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { returnedOrders, highlightedOrders } = useOrders();

  if (!context || !user) return null;
  const { t } = context;

  // Filter orders
  const pickupOrders = returnedOrders.filter(o => o.legType === 'pickup');
  const deliveryOrders = returnedOrders.filter(o => o.legType === 'drop');

  const [activeTab, setActiveTab] = useState<'pickup' | 'delivery'>('pickup');
  const scrollViewRef = useRef<ScrollView>(null);

  const PAGE_SIZE = 5;
  const [pickupVisibleCount, setPickupVisibleCount] = useState(PAGE_SIZE);
  const [deliveryVisibleCount, setDeliveryVisibleCount] = useState(PAGE_SIZE);

  const handleTabPress = (tab: 'pickup' | 'delivery') => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({
      x: tab === 'pickup' ? 0 : SCREEN_WIDTH,
      animated: false,
    });
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    const newTab = index === 0 ? 'pickup' : 'delivery';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const [selectedAddressOrder, setSelectedAddressOrder] = useState<Order | null>(null);

  const handleEyeDetails = (order: Order) => {
    navigation.navigate('OrderDetails', { order });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Shared Header */}
      <SharedHeader
        title="Returned Orders"
        subtitle="Manage return pickup and return delivery orders"
        navigation={navigation}
      />
      {/* Mockup-Perfect Segment Tab Switcher */}
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
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${
            activeTab === 'pickup' ? 'bg-[#073318]' : 'bg-transparent'
          }`}
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
          <Text className={`font-bold text-[13px] ml-1.5 ${
            activeTab === 'pickup' ? 'text-white' : 'text-slate-500'
          }`}>
            Pickup Returns
          </Text>
          <View 
            className="px-2.5 py-0.5 rounded-full ml-2"
            style={activeTab === 'pickup' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
          >
            <Text className={`text-[10px] font-extrabold ${
              activeTab === 'pickup' ? 'text-white' : 'text-slate-500'
            }`}>
              {pickupOrders.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delivery Tab Button */}
        <TouchableOpacity
          onPress={() => handleTabPress('delivery')}
          activeOpacity={0.8}
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${
            activeTab === 'delivery' ? 'bg-[#073318]' : 'bg-transparent'
          }`}
          style={activeTab === 'delivery' ? {
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          } : undefined}
        >
          <Ionicons
            name={activeTab === 'delivery' ? "bicycle" : "bicycle-outline"}
            size={16}
            color={activeTab === 'delivery' ? "#FFFFFF" : "#64748B"}
          />
          <Text className={`font-bold text-[13px] ml-1.5 ${
            activeTab === 'delivery' ? 'text-white' : 'text-slate-500'
          }`}>
            Delivery Returns
          </Text>
          <View 
            className="px-2.5 py-0.5 rounded-full ml-2"
            style={activeTab === 'delivery' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
          >
            <Text className={`text-[10px] font-extrabold ${
              activeTab === 'delivery' ? 'text-white' : 'text-slate-500'
            }`}>
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
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          data={pickupOrders.length === 0 ? [] : pickupOrders.slice(0, pickupVisibleCount)}
          keyExtractor={(item) => item.id}
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
                <Text className="text-[16px] font-black text-slate-800 text-center mb-1.5">
                  No Pickup Return Orders
                </Text>
                <Text className="text-[13px] font-medium text-slate-500 text-center px-4">
                  No return pickup orders available.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
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
                showScanner={false}
                onPressCard={() => handleEyeDetails(item)}
                onViewAddress={() => setSelectedAddressOrder(item)}
                isHighlighted={highlightedOrders[item.id]}
              />
            );
          }}
          ListFooterComponent={
            <>
              {pickupOrders.length > 0 && (
                <ViewMoreButton 
                  totalCount={pickupOrders.length}
                  visibleCount={pickupVisibleCount}
                  onPress={() => setPickupVisibleCount(prev => prev + PAGE_SIZE)}
                />
              )}
              <View className="h-10" />
            </>
          }
        />

        {/* Page 2: Delivery Screen */}
        <FlatList
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          data={deliveryOrders.length === 0 ? [] : deliveryOrders.slice(0, deliveryVisibleCount)}
          keyExtractor={(item) => item.id}
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
                  <Ionicons name="cube-outline" size={28} color="#94A3B8" />
                </View>
                <Text className="text-[16px] font-black text-slate-800 text-center mb-1.5">
                  No Delivery Return Orders
                </Text>
                <Text className="text-[13px] font-medium text-slate-500 text-center px-4">
                  No return delivery orders available.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
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
                showScanner={false}
                onPressCard={() => handleEyeDetails(item)}
                onViewAddress={() => setSelectedAddressOrder(item)}
                isHighlighted={highlightedOrders[item.id]}
                isRejectedDelivery={item.isRejectedDelivery}
              />
            );
          }}
          ListFooterComponent={
            <>
              {deliveryOrders.length > 0 && (
                <ViewMoreButton 
                  totalCount={deliveryOrders.length}
                  visibleCount={deliveryVisibleCount}
                  onPress={() => setDeliveryVisibleCount(prev => prev + PAGE_SIZE)}
                />
              )}
              <View className="h-10" />
            </>
          }
        />
      </ScrollView>

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
            isRejectedDelivery={selectedAddressOrder.isRejectedDelivery}
          />
        );
      })()}
    </SafeAreaView>
  );
};

export default ReturnOrdersScreen;
