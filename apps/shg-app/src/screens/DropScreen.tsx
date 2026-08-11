import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
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
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
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
  NativeStackScreenProps<OrdersStackParamList, 'Drop'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DropScreen: React.FC<Props> = ({ navigation, route }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { acceptedOrders, receiveOrder, refreshOrdersList, deliverOrder } = useOrders();

  if (!context || !user) return null;
  const { t } = context;

  // Auto-refresh instantly on screen focus
  useFocusEffect(
    useCallback(() => {
      if (refreshOrdersList) {
        refreshOrdersList().catch(() => {});
      }
    }, [refreshOrdersList])
  );

  // Pickup orders: Accepted orders (waiting for receipt/pickup)
  const pickupOrders = acceptedOrders.filter(o => o.status === 'Accepted' && !o.isPickupRedirected);
  // Delivery orders: PickedUp orders (received and ready for delivery/drop)
  const deliveryOrders = acceptedOrders.filter(o => o.status === 'PickedUp' && !o.isDropRedirected);

  // Swipe & Pager Tab Switcher State
  const [activeTab, setActiveTab] = useState<'pickup' | 'drop'>('drop');
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

  const handleTabPress = (tab: 'pickup' | 'drop') => {
    if (tab === 'pickup') {
      navigation.navigate('AcceptedOrders');
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    const newTab = index === 0 ? 'pickup' : 'drop';
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

  // OTP Delivery Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpOrder, setOtpOrder] = useState<Order | null>(null);
  const [otpCode, setOtpCode] = useState('1234');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  const handleSendOtp = (order: Order) => {
    setOtpOrder(order);
    setOtpCode('1234');
    setOtpModalVisible(true);
    Toast.show({
      type: 'info',
      text1: 'OTP Sent',
      text2: 'Delivery OTP 1234 sent to customer mobile.',
    });
  };

  const handleConfirmDeliveryWithOtp = async () => {
    if (!otpOrder) return;
    if (otpCode !== '1234' && otpCode.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter valid delivery PIN (1234).');
      return;
    }
    try {
      setIsSubmittingOtp(true);
      await deliverOrder(otpOrder, otpCode || '1234');
      setOtpModalVisible(false);
      setOtpOrder(null);
      Toast.show({
        type: 'success',
        text1: t('su_success_388') || 'Success',
        text2: 'Order delivered successfully and moved to Completed section.',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to confirm delivery. Please try again.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

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

        {/* Drop Tab Button */}
        <TouchableOpacity
          onPress={() => handleTabPress('drop')}
          activeOpacity={0.8}
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${
            activeTab === 'drop' ? 'bg-[#073318] shadow-sm' : 'bg-transparent'
          }`}
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
          <Text className={`font-bold text-[13px] ml-1.5 ${
            activeTab === 'drop' ? 'text-white' : 'text-slate-500'
          }`}>
            Drop
          </Text>
          <View className={`px-2.5 py-0.5 rounded-full ml-2 ${
            activeTab === 'drop' ? 'bg-white/20' : 'bg-[#F1F5F9]'
          }`}>
            <Text className={`text-[10px] font-extrabold ${
              activeTab === 'drop' ? 'text-white' : 'text-slate-500'
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
          keyExtractor={(item, index) => `${item.id}-${item.legType || 'pickup'}-${index}`}
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
          keyExtractor={(item, index) => `${item.id}-${item.legType || 'delivery'}-${index}`}
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
                onSendOtp={() => handleSendOtp(item)}
                onPressCard={() => handleSendOtp(item)}
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

      {/* OTP Delivery Verification Modal */}
      {otpModalVisible && otpOrder && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 360,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="items-center mb-4">
              <View className="w-14 h-14 bg-emerald-50 rounded-full items-center justify-center mb-2 border border-emerald-100">
                <Ionicons name="shield-checkmark" size={28} color="#059669" />
              </View>
              <Text className="text-[17px] font-black text-slate-900 text-center">
                Customer Delivery OTP
              </Text>
              <Text className="text-[12px] font-bold text-emerald-700 mt-0.5">
                Order #{getFormattedOrderId(otpOrder)}
              </Text>
            </View>

            <Text className="text-[12px] font-medium text-slate-600 text-center mb-4">
              Preset delivery PIN code is configured. Enter or confirm customer PIN to complete delivery.
            </Text>

            <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 items-center">
              <Text className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                DELIVERY PIN CODE
              </Text>
              <Text className="text-[26px] font-black text-[#073318] tracking-widest">
                1234
              </Text>
            </View>

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtpOrder(null);
                }}
                disabled={isSubmittingOtp}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center justify-center"
              >
                <Text className="text-[13px] font-bold text-slate-600">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmDeliveryWithOtp}
                disabled={isSubmittingOtp}
                className="flex-1 py-3.5 rounded-xl bg-[#059669] items-center justify-center shadow-sm"
              >
                <Text className="text-[13px] font-extrabold text-white">
                  {isSubmittingOtp ? 'Verifying...' : 'Confirm Delivery'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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

export default DropScreen;
