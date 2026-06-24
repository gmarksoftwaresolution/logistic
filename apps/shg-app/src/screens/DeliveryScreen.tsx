import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
  Dimensions,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders, Order } from '../context/OrderContext';
import { SharedHeader } from '../components/SharedHeader';
import { OrderCard } from '../components/OrderCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { ViewMoreButton } from '../components/ViewMoreButton';
import { getRouteForOrder, getInfoForOrder, translateRoutePart, getFormattedOrderId, getModalAddresses } from '../utils/orderHelpers';
import { AddressDetailsModal } from '../components/AddressDetailsModal';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'Delivery'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DeliveryScreen: React.FC<Props> = ({ navigation, route }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { acceptedOrders, receiveOrder } = useOrders();

  if (!context || !user) return null;
  const { t } = context;

  // Pickup orders: Accepted pickups that haven't been received from seller yet
  const pickupOrders = acceptedOrders.filter(o => o.status === 'Accepted' && o.legType === 'pickup');
  // Delivery orders: PickedUp pickups OR Accepted drop orders (drops skip the pickup step)
  const deliveryOrders = acceptedOrders.filter(o => 
    o.status === 'PickedUp' || 
    (o.status === 'Accepted' && o.legType === 'drop')
  );

  // Swipe & Pager Tab Switcher State
  const [activeTab, setActiveTab] = useState<'pickup' | 'delivery'>('delivery');
  const scrollViewRef = useRef<ScrollView>(null);

  const PAGE_SIZE = 5;
  const [pickupVisibleCount, setPickupVisibleCount] = useState(PAGE_SIZE);
  const [deliveryVisibleCount, setDeliveryVisibleCount] = useState(PAGE_SIZE);

  // Sync tab index when navigating between routes
  useEffect(() => {
    let timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [route.name]);

  const handleTabPress = (tab: 'pickup' | 'delivery') => {
    if (tab === 'pickup') {
      navigation.navigate('AcceptedOrders');
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    const newTab = index === 0 ? 'pickup' : 'delivery';
    if (newTab === 'pickup') {
      navigation.navigate('AcceptedOrders');
    }
  };

  // Confirm Modal State for Pickup confirmations
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => { },
  });

  const [selectedAddressOrder, setSelectedAddressOrder] = useState<Order | null>(null);

  const handleQRScan = (order: Order) => {
    setModalConfig({
      visible: true,
      title: t('confirm_pickup') || "Confirm Pickup",
      message: (t('confirm_pickup_message') || `Have you successfully collected and loaded the "{parcel}"?`).replace('{parcel}', order.parcelName),
      confirmText: t('su_confirm_358') || 'Confirm',
      onConfirm: () => {
        receiveOrder(order);
        Toast.show({ type: 'success', text1: t('su_success_388') || 'Success', text2: t('parcel_received_msg') || 'Parcel successfully received and moved to the Delivery tab.' });
      }
    });
  };

  const handleEyeDetails = (order: Order) => {
    navigation.navigate('OrderDetails', { order });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Brand-Aligned GramUnnati Header */}
      <SharedHeader
        title={t("title_accepted_orders")}
        subtitle={t("subtitle_accepted_orders")}
        navigation={navigation}
      />

      {/* Mockup-Perfect Segment Tab Switcher */}
      <View
        className="bg-white border border-[#F1F5F9] rounded-[28px] p-1.5 flex-row mx-6 my-4 gap-2 shadow-sm"
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
            activeTab === 'pickup' ? 'bg-[#073318] shadow-sm' : 'bg-transparent'
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
            {t("tab_pickup")}
          </Text>
          <View className={`px-2.5 py-0.5 rounded-full ml-2 ${
            activeTab === 'pickup' ? 'bg-white/20' : 'bg-[#F1F5F9]'
          }`}>
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
            activeTab === 'delivery' ? 'bg-[#073318] shadow-sm' : 'bg-transparent'
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
            {t("tab_delivery")}
          </Text>
          <View className={`px-2.5 py-0.5 rounded-full ml-2 ${
            activeTab === 'delivery' ? 'bg-white/20' : 'bg-[#F1F5F9]'
          }`}>
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
        onMomentumScrollEnd={handleScroll}
        className="flex-1"
        contentOffset={{ x: SCREEN_WIDTH, y: 0 }}
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
              <View className="items-center justify-center py-20">
                <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="cube-outline" size={32} color="#94A3B8" />
                </View>
                <Text className="text-textSecondary font-bold text-center">
                  {t("no_orders_pickup")}
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
                distance={item.distance}
                showScanner={true}
                onScan={() => handleQRScan(item)}
                onPressCard={() => handleEyeDetails(item)}
                onViewAddress={() => setSelectedAddressOrder(item)}
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
              <View className="items-center justify-center py-20">
                <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="cube-outline" size={32} color="#94A3B8" />
                </View>
                <Text className="text-textSecondary font-bold text-center">
                  {t("no_orders_delivery")}
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
                distance={item.distance}
                showScanner={false}
                onPressCard={() => handleEyeDetails(item)}
                onViewAddress={() => setSelectedAddressOrder(item)}
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

      <ConfirmModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onCancel={() => setModalConfig({ ...modalConfig, visible: false })}
        onConfirm={() => {
          modalConfig.onConfirm();
          setModalConfig({ ...modalConfig, visible: false });
        }}
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

export default DeliveryScreen;
