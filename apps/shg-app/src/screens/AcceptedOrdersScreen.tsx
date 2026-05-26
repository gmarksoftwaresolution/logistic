import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking
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

const AcceptedOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { acceptedOrders, receiveOrder } = useOrders();

  if (!context || !user) return null;
  const { t } = context;

  // Filter orders by status
  const pickupOrders = acceptedOrders.filter(o => o.status === 'Accepted');
  const deliveryOrders = acceptedOrders.filter(o => o.status === 'Received');

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
        {/* Pickup Tab Button (Active) */}
        <TouchableOpacity
          onPress={() => { }}
          activeOpacity={0.8}
          className="flex-1 py-3 flex-row justify-center items-center rounded-[22px] bg-[#073318] shadow-sm"
          style={{
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons
            name="cube"
            size={16}
            color="#FFFFFF"
          />
          <Text className="font-bold text-[13px] ml-1.5 text-white">
            {t("tab_pickup")}
          </Text>
          <View className="px-2.5 py-0.5 rounded-full ml-2 bg-white/20">
            <Text className="text-[10px] font-extrabold text-white">
              {pickupOrders.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delivery Tab Button (Inactive) */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Delivery')}
          activeOpacity={0.8}
          className="flex-1 py-3 flex-row justify-center items-center rounded-[22px] bg-transparent"
        >
          <Ionicons
            name="bicycle-outline"
            size={16}
            color="#64748B"
          />
          <Text className="font-bold text-[13px] ml-1.5 text-slate-500">
            {t("tab_delivery")}
          </Text>
          <View className="px-2.5 py-0.5 rounded-full ml-2 bg-[#F1F5F9]">
            <Text className="text-[10px] font-extrabold text-slate-500">
              {deliveryOrders.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* List of Cards */}
      <ScrollView
        className="flex-1 px-6 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {pickupOrders.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="cube-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-textSecondary font-bold text-center">
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
                showScanner={true}
                onScan={() => handleQRScan(item)}
                onPressCard={() => handleEyeDetails(item)}
              />
            );
          })
        )}
        <View className="h-10" />
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
