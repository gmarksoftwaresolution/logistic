import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList
} from 'react-native';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders, Order } from '../context/OrderContext';
import { SharedHeader } from '../components/SharedHeader';
import { OrderCard } from '../components/OrderCard';
import { ViewMoreButton } from '../components/ViewMoreButton';
import { ConfirmModal } from '../components/ConfirmModal';
import Toast from 'react-native-toast-message';
import { getRouteForOrder, getInfoForOrder, translateRoutePart, getFormattedOrderId, getModalAddresses } from '../utils/orderHelpers';
import { AddressDetailsModal } from '../components/AddressDetailsModal';

import { ReturnOtpModal } from '../components/ReturnOtpModal';
import { SellerDeliveryOtpModal } from '../components/SellerDeliveryOtpModal';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'ReturnedOrders'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ReturnedOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { returnedOrders, highlightedOrders, receiveOrder, refreshOrdersList, deliverOrder } = useOrders();

  if (!context || !user) return null;
  const { t } = context;

  // Filter orders: 'Accepted' goes to Pickup tab, 'PickedUp' goes to Delivery tab
  const pickupOrders = returnedOrders.filter(o => o.status === 'Accepted');
  const deliveryOrders = returnedOrders.filter(o => o.status === 'PickedUp');

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

  // Auto-refresh instantly on screen focus
  useFocusEffect(
    useCallback(() => {
      if (refreshOrdersList) {
        refreshOrdersList().catch(() => {});
      }
    }, [refreshOrdersList])
  );

  const PAGE_SIZE = 5;
  const [pickupVisibleCount, setPickupVisibleCount] = useState(PAGE_SIZE);
  const [deliveryVisibleCount, setDeliveryVisibleCount] = useState(PAGE_SIZE);

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

  // Return OTP Modal state
  const [returnOtpModalVisible, setReturnOtpModalVisible] = useState(false);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<Order | null>(null);

  const handleReturnPickupPress = (order: Order) => {
    const isSecondLegReturnDrop = ['DISPATCHED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG'].includes(order.mainStatus || order.status || '');
    if (isSecondLegReturnDrop) {
      setModalConfig({
        visible: true,
        title: "Confirm Pickup",
        message: "Are you sure you want to pickup?",
        confirmText: "Submit",
        cancelText: "Cancel",
        showInput: false,
        onConfirm: async () => {
          try {
            await receiveOrder(order);
            Toast.show({
              type: 'success',
              text1: 'Pickup Confirmed',
              text2: 'Parcel received from Transporter and moved to Drop (Return).',
            });
          } catch (err: any) {
            console.error('Failed to confirm return drop pickup:', err);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: err?.response?.data?.message || 'Failed to complete pickup',
            });
          }
        }
      });
      return;
    }

    // FIRST RETURN PICKUP FLOW (Buyer -> SHG) - 100% UNTOUCHED
    setSelectedReturnOrder({ ...order });
    setReturnOtpModalVisible(true);
  };

  const handleCloseReturnOtpModal = () => {
    setReturnOtpModalVisible(false);
    setSelectedReturnOrder(null);
  };

  const handleVerifyReturnOtp = async (otp: string) => {
    if (!selectedReturnOrder) return;
    const targetOrder = selectedReturnOrder;
    await receiveOrder(targetOrder, otp);
    Toast.show({
      type: 'success',
      text1: 'Pickup Verified',
      text2: 'Parcel received from Buyer and moved to Drop (Return).',
    });
    handleCloseReturnOtpModal();
  };

  // Seller Delivery OTP Modal State (Scenario 2: SHG -> Seller)
  const [sellerOtpModalVisible, setSellerOtpModalVisible] = useState(false);
  const [selectedSellerDropOrder, setSelectedSellerDropOrder] = useState<Order | null>(null);

  const handleSellerDropPress = (order: Order) => {
    setSelectedSellerDropOrder(order);
    setSellerOtpModalVisible(true);
  };

  const handleVerifySellerDeliveryOtp = async (otp: string) => {
    if (!selectedSellerDropOrder) return;
    await deliverOrder(selectedSellerDropOrder, otp);
    setSellerOtpModalVisible(false);
    setSelectedSellerDropOrder(null);
    Toast.show({
      type: 'success',
      text1: 'Return Delivered',
      text2: 'Return order delivered to seller and moved to Completed section.',
    });
  };

  // Confirm Modal State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    showInput: boolean;
    onConfirm: (code?: string) => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    showInput: false,
    onConfirm: (code?: string) => Promise.resolve(),
  });

  const [selectedAddressOrder, setSelectedAddressOrder] = useState<Order | null>(null);

  const handleQRScan = (order: Order) => {
    handleReturnPickupPress(order);
  };

  const handleHandoverScan = (order: Order) => {
    setBarcodeInput('');
    setModalConfig({
      visible: true,
      title: "Verify Handover to Transporter",
      message: `Please scan or enter the original delivery QR/barcode to verify handover for "${order.parcelName}".`,
      confirmText: t('su_confirm_358') || 'Confirm',
      showInput: true,
      onConfirm: async (scannedCode?: string) => {
        try {
          await receiveOrder(order, scannedCode);
          Toast.show({ type: 'success', text1: t('su_success_388') || 'Success', text2: 'Handover successfully verified.' });
        } catch (error: any) {
          const errMsg = error.response?.data?.message || 'Failed to verify handover';
          Toast.show({ type: 'error', text1: 'Error', text2: Array.isArray(errMsg) ? errMsg[0] : errMsg });
        }
      }
    });
  };

  const handleEyeDetails = (order: Order) => {
    (navigation.navigate as any)('ReturnOrderDetails', { order });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Shared Header */}
      <SharedHeader
        title="Return Orders"
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
            Pickup ( Return )
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

        {/* Drop Tab Button */}
        <TouchableOpacity
          onPress={() => handleTabPress('drop')}
          activeOpacity={0.8}
          className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${
            activeTab === 'drop' ? 'bg-[#073318]' : 'bg-transparent'
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
            Drop ( Return )
          </Text>
          <View 
            className="px-2.5 py-0.5 rounded-full ml-2"
            style={activeTab === 'drop' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
          >
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
          keyExtractor={(item, index) => `${item.id}-${item.legType || 'pickup'}-${index}`}
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

            const isSecondLegReturnDrop = ['DISPATCHED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG'].includes(item.mainStatus || item.status || '');

            return (
              <OrderCard
                orderIdText={orderIdText}
                source={source}
                destination={destination}
                qty={item.remainingQty || 1}
                date={info.date}
                time={info.time}
                onSendOtp={() => handleReturnPickupPress(item)}
                otpButtonLabel={isSecondLegReturnDrop ? 'Pickup' : 'Pickup (OTP)'}
                onPressCard={() => handleEyeDetails(item)}
                onViewAddress={() => setSelectedAddressOrder(item)}
                isHighlighted={highlightedOrders[item.id]}
                isRescheduled={!!item.rescheduledDate}
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
          refreshControl={<SharedRefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          data={deliveryOrders.length === 0 ? [] : deliveryOrders.slice(0, deliveryVisibleCount)}
          keyExtractor={(item, index) => `${item.id}-${item.legType || 'delivery'}-${index}`}
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
            const isSecondLegReturnDrop = ['DISPATCHED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG'].includes(item.mainStatus || item.status || '');
            const routeStr = getRouteForOrder(item);
            const routeParts = routeStr.split('>');
            const source = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
            const destination = translateRoutePart(routeParts[1]?.trim() || (isSecondLegReturnDrop ? 'Seller' : 'Buyer'), t);
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
                onSendOtp={isSecondLegReturnDrop ? () => handleSellerDropPress(item) : undefined}
                otpButtonLabel={isSecondLegReturnDrop ? 'Drop' : undefined}
                showScanner={false}
                onPressCard={() => handleEyeDetails(item)}
                onViewAddress={() => setSelectedAddressOrder(item)}
                isHighlighted={highlightedOrders[item.id]}
                isRescheduled={!!item.rescheduledDate}
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
        cancelText={modalConfig.cancelText || 'Cancel'}
        showInput={modalConfig.showInput}
        inputValue={barcodeInput}
        onInputChange={setBarcodeInput}
        inputPlaceholder="Scan or enter delivery QR/barcode"
        onCancel={() => {
          setModalConfig(prev => ({ ...prev, visible: false }));
          setBarcodeInput('');
        }}
        onConfirm={async () => {
          if (modalConfig.onConfirm) {
            await modalConfig.onConfirm(barcodeInput);
          }
          setModalConfig(prev => ({ ...prev, visible: false }));
          setBarcodeInput('');
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

      {/* Buyer Return OTP Modal */}
      <ReturnOtpModal
        visible={returnOtpModalVisible}
        onClose={handleCloseReturnOtpModal}
        onVerify={handleVerifyReturnOtp}
        orderIdText={selectedReturnOrder ? getFormattedOrderId(selectedReturnOrder) : ''}
        buyerMobile={selectedReturnOrder ? (selectedReturnOrder.buyer?.mobileNumber || selectedReturnOrder.buyer?.phoneNumber || selectedReturnOrder.mobile || (selectedReturnOrder as any).buyerMobile || 'N/A') : ''}
      />

      {/* Seller Delivery OTP Modal (Scenario 2: SHG -> Seller) */}
      <SellerDeliveryOtpModal
        visible={sellerOtpModalVisible}
        onClose={() => {
          setSellerOtpModalVisible(false);
          setSelectedSellerDropOrder(null);
        }}
        onVerify={handleVerifySellerDeliveryOtp}
        orderIdText={selectedSellerDropOrder ? `#${getFormattedOrderId(selectedSellerDropOrder)}` : ''}
        sellerMobile={selectedSellerDropOrder?.sellerMobile || selectedSellerDropOrder?.seller?.mobileNumber || selectedSellerDropOrder?.seller?.phoneNumber || selectedSellerDropOrder?.mobile || ''}
      />
    </SafeAreaView>
  );
};

export default ReturnedOrdersScreen;
