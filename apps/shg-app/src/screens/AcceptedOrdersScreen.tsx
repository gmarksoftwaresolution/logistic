import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
  Dimensions
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
import { getRouteForOrder, getInfoForOrder, translateRoutePart } from '../utils/orderHelpers';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'AcceptedOrders'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AcceptedOrdersScreen: React.FC<Props> = ({ navigation, route }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { acceptedOrders, receiveOrder } = useOrders();

  if (!context || !user) return null;
  const { t } = context;

  // Filter orders by legType since both backend pickup AND drop orders will have 'Accepted' status here
  const pickupOrders = acceptedOrders.filter(o => o.legType === 'pickup');
  const deliveryOrders = acceptedOrders.filter(o => o.legType === 'drop');

  // Swipe & Pager Tab Switcher State
  const [activeTab, setActiveTab] = useState<'pickup' | 'delivery'>(
    route.params?.initialTab === 'delivery' ? 'delivery' : 'pickup'
  );
  const scrollViewRef = useRef<ScrollView>(null);

  // Sync tab index when navigating between routes or receiving new initialTab param
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const isDelivery = route.params?.initialTab === 'delivery';
    setActiveTab(isDelivery ? 'delivery' : 'pickup');
    timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: isDelivery ? SCREEN_WIDTH : 0,
        animated: false
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [route.params?.initialTab, route.name]);

  const handleTabPress = (tab: 'pickup' | 'delivery') => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({
      x: tab === 'pickup' ? 0 : SCREEN_WIDTH,
      animated: true,
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

  // Confirm Modal State
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => { },
  });

  const handleQRScan = (order: Order) => {
    setModalConfig({
      visible: true,
      title: t('confirm_pickup') || "Confirm Pickup",
      message: (t('confirm_pickup_message') || `Have you successfully collected and loaded the "{parcel}"?`).replace('{parcel}', order.parcelName),
      confirmText: t('su_confirm_358') || 'Confirm',
      onConfirm: async () => {
        try {
          await receiveOrder(order);
          Toast.show({ type: 'success', text1: t('su_success_388') || 'Success', text2: t('parcel_received_msg') || 'Parcel successfully received and moved to the Delivery tab.' });
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to confirm pickup' });
        }
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
            {t("tab_pickup")}
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
            {t("tab_delivery")}
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
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {pickupOrders.length === 0 ? (
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
                {t("no_orders_pickup")}
              </Text>
            </View>
          ) : (
            pickupOrders.map(item => {
              const routeStr = getRouteForOrder(item);
              const routeParts = routeStr.split('>');
              const source = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
              const destination = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);
              const orderIdText = `ORD-1769749895005-${item.id.replace('inc-', '')}`;
              const info = getInfoForOrder(item);

              return (
                <OrderCard
                  key={item.id}
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
                />
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>

        {/* Page 2: Delivery Screen */}
        <ScrollView
          style={{ width: SCREEN_WIDTH }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {deliveryOrders.length === 0 ? (
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
                {t("no_orders_delivery")}
              </Text>
            </View>
          ) : (
            deliveryOrders.map(item => {
              const routeStr = getRouteForOrder(item);
              const routeParts = routeStr.split('>');
              const source = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
              const destination = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);
              const orderIdText = `ORD-1769749895005-${item.id.replace('inc-', '')}`;
              const info = getInfoForOrder(item);

              return (
                <OrderCard
                  key={item.id}
                  orderIdText={orderIdText}
                  source={source}
                  destination={destination}
                  qty={item.remainingQty || 1}
                  date={info.date}
                  time={info.time}
                  distance={item.distance}
                  showScanner={false}
                  onPressCard={() => handleEyeDetails(item)}
                />
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
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
    </SafeAreaView>
  );
};

export default AcceptedOrdersScreen;
