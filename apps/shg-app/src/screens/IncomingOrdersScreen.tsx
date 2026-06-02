import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated, Modal, LayoutAnimation, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders } from '../context/OrderContext';
import { Colors, Fonts } from '../constants/theme';
import { Typography } from '../constants/typography';
import { Spacing, Grid } from '../constants/spacing';
import { normalize, moderateScale } from '../utils/responsive';
import { SharedHeader } from '../components/SharedHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { RejectReasonModal } from '../components/RejectReasonModal';
import { OrderDistance } from '../components/OrderDistance';
import { getRouteForOrder, getInfoForOrder, translateRoutePart } from '../utils/orderHelpers';
import { Order } from '../context/OrderContext';
type Props = CompositeScreenProps<NativeStackScreenProps<OrdersStackParamList, 'IncomingOrders'>, CompositeScreenProps<BottomTabScreenProps<MainTabParamList>, NativeStackScreenProps<RootStackParamList>>>;
const IncomingOrdersScreen: React.FC<Props> = ({
  navigation
}) => {
  const context = useContext(LanguageContext);
  const {
    user
  } = useUser();
  const {
    incomingOrders,
    acceptOrder,
    acceptAllOrders,
    rejectOrder
  } = useOrders();
  if (!context || !user) return null;
  const {
    t
  } = context;

  // Selection and Animation states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Confirm Modal State
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    isDestructive: false,
    confirmText: 'Confirm',
    onConfirm: () => {}
  });

  // Reject Reason Modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [ordersToRejectBatch, setOrdersToRejectBatch] = useState<Order[]>([]);
  const [currentRejectIndex, setCurrentRejectIndex] = useState(0);

  // Reschedule state hooks
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [tempSelectedDay, setTempSelectedDay] = useState(18);
  const [tempSelectedTime, setTempSelectedTime] = useState('11:00 AM');
  const [rescheduledOrders, setRescheduledOrders] = useState<Record<string, {
    date: string;
    time: string;
    reason?: string;
  }>>({});
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [rescheduleReasonModalVisible, setRescheduleReasonModalVisible] = useState(false);
  const [selectedRescheduleReason, setSelectedRescheduleReason] = useState<string | null>(null);
  const [customRescheduleReason, setCustomRescheduleReason] = useState('');
  const rescheduleReasons = [
    { key: 'orders_vehicle_issue', default: 'Vehicle Issue' },
    { key: 'orders_driver_not_available', default: 'Driver Not Available' },
    { key: 'orders_traffic_problem', default: 'Traffic Problem' },
    { key: 'orders_customer_requested_later', default: 'Customer Requested Later' },
    { key: 'orders_weather_issue', default: 'Weather Issue' },
    { key: 'orders_route_problem', default: 'Route Problem' },
    { key: 'orders_other', default: 'Other' }
  ];
  const isAllSelected = incomingOrders.length > 0 && selectedIds.length === incomingOrders.length;
  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(incomingOrders.map(o => o.id));
    }
  };
  const animatedY = useRef(new Animated.Value(100)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  // Animate bottom action bar visibility based on selection count
  useEffect(() => {
    if (selectedIds.length > 0) {
      setShouldRender(true);
      Animated.parallel([Animated.timing(animatedY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      }), Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true
      })]).start();
    } else {
      Animated.parallel([Animated.timing(animatedY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true
      }), Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })]).start(() => {
        setShouldRender(false);
      });
    }
  }, [selectedIds.length]);
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };
  const handleAcceptSelected = () => {
    const ordersToAccept = incomingOrders.filter(o => selectedIds.includes(o.id));
    if (ordersToAccept.length === 0) return;
    setModalConfig({
      visible: true,
      title: t('su_confirm_action') || "Confirm Action",
      message: (t('su_are_you_sure_accept_selected') || "Are you sure you want to accept all {count} selected order(s)?").replace('{count}', ordersToAccept.length.toString()),
      isDestructive: false,
      confirmText: t('su_accept') || 'Accept',
      onConfirm: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        ordersToAccept.forEach(order => acceptOrder(order));
        setSelectedIds([]);
        Toast.show({
          type: 'success',
          text1: t("su_success_388"),
          text2: t("su_orders_have_been_suc_389")
        });
        
        // Conditionally redirect based on whether accepted orders contain delivery items
        const hasDeliveryOrder = ordersToAccept.some(order => order.currentHolder === 'Transporter');
        if (hasDeliveryOrder) {
          navigation.navigate('Delivery');
        } else {
          navigation.navigate('AcceptedOrders');
        }
      }
    });
  };
  const handleRejectSelected = () => {
    const batch = incomingOrders.filter(o => selectedIds.includes(o.id));
    if (batch.length === 0) return;
    setOrdersToRejectBatch(batch);
    setCurrentRejectIndex(0);
    setRejectModalVisible(true);
  };
  const handleRejectModalSubmit = (order: Order, reason: string) => {
    rejectOrder({
      ...order,
      rejectReason: reason
    });
    const nextIndex = currentRejectIndex + 1;
    if (nextIndex < ordersToRejectBatch.length) {
      setCurrentRejectIndex(nextIndex);
    } else {
      setRejectModalVisible(false);
      setSelectedIds([]);
      import('react-native-toast-message').then(({
        default: Toast
      }) => Toast.show({
        type: 'success',
        text1: t("su_done_359"),
        text2: t("su_selected_orders_have_391")
      }));
    }
  };
  const handleAcceptAll = () => {
    const ordersToAccept = selectedIds.length > 0 ? incomingOrders.filter(o => selectedIds.includes(o.id)) : incomingOrders;
    if (ordersToAccept.length === 0) {
      Toast.show({
        type: 'error',
        text1: t("su_no_orders_392"),
        text2: t("su_there_are_no_incomin_393")
      });
      return;
    }
    setModalConfig({
      visible: true,
      title: t('su_confirm_action') || "Confirm Action",
      message: (t('su_are_you_sure_accept_all') || "Are you sure you want to accept all {count} order(s)?").replace('{count}', ordersToAccept.length.toString()),
      isDestructive: false,
      confirmText: t('su_accept') || 'Accept',
      onConfirm: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (selectedIds.length > 0) {
          ordersToAccept.forEach(order => acceptOrder(order));
          setSelectedIds([]);
        } else {
          acceptAllOrders();
        }
        Toast.show({
          type: 'success',
          text1: t("su_success_388"),
          text2: t("su_orders_have_been_suc_389")
        });
        
        // Conditionally redirect based on whether accepted orders contain delivery items
        const hasDeliveryOrder = ordersToAccept.some(order => order.currentHolder === 'Transporter');
        if (hasDeliveryOrder) {
          navigation.navigate('Delivery');
        } else {
          navigation.navigate('AcceptedOrders');
        }
      }
    });
  };
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      Toast.show({
        type: 'success',
        text1: t("su_refreshed_396"),
        text2: t("su_your_order_list_is_u_397")
      });
    }, 1500);
  };
  return <SafeAreaView className="flex-1" style={{
    backgroundColor: Colors.background
  }}>
      <SharedHeader title={t("su_new_orders_398")} subtitle={t('su_new_orders_sub') || 'Verify & accept incoming requests'} navigation={navigation} />

      <ScrollView style={{
      paddingHorizontal: Spacing.lg
    }} className="flex-1 pt-2" showsVerticalScrollIndicator={false}>
        {/* Top Action Buttons Row */}
        {incomingOrders.length > 0 && <>
          <View className="flex-row justify-between px-1" style={{
          marginBottom: Spacing.sm,
          marginTop: Spacing.xs
        }}>
            {/* Left Button: Reschedule */}
            <TouchableOpacity onPress={() => {
            if (selectedIds.length === 0) {
              Toast.show({
                type: 'error',
                text1: t("su_validation_error_83"),
                text2: t("su_please_select_at_lea_400")
              });
            } else {
              setRescheduleReasonModalVisible(true);
            }
          }} activeOpacity={0.75} className="flex-1 h-[50px] bg-white border border-[#CBD5E1] rounded-[25px] flex-row items-center justify-center mr-2 shadow-sm" style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2
            },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2
          }}>
              <Ionicons name="calendar-outline" size={18} color="#073318" />
              <Text style={{
              fontFamily: Fonts.bold,
              fontSize: normalize(13.5),
              color: '#073318',
              marginLeft: Spacing.xs + 1
            }}>{t("su_reschedule_401")}</Text>
            </TouchableOpacity>

            {/* Right Button: Accept All */}
            <TouchableOpacity onPress={handleAcceptAll} activeOpacity={0.75} className="flex-1 h-[50px] bg-[#073318] rounded-[25px] flex-row items-center justify-center ml-2 shadow-md" style={{
            shadowColor: '#073318',
            shadowOffset: {
              width: 0,
              height: 3
            },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 4
          }}>
              <Ionicons name="checkmark-circle-outline" size={18} color="white" />
              <Text style={{
              fontFamily: Fonts.bold,
              fontSize: normalize(13.5),
              color: 'white',
              marginLeft: Spacing.xs + 1
            }}>
                {`${t('su_accept_all') || 'Accept All'} (${incomingOrders.length})`}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row justify-between items-center px-1 mb-4 mt-2">
            <Text style={{ fontFamily: Fonts.bold, fontSize: normalize(14.5), color: '#1E293B' }}>
              {t('su_incoming_requests') || 'Incoming Requests'} ({incomingOrders.length})
            </Text>
            <TouchableOpacity 
              onPress={handleSelectAllToggle} 
              activeOpacity={0.75} 
              className="flex-row items-center bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-full shadow-sm"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 2,
                elevation: 1
              }}
            >
              <Ionicons name={isAllSelected ? "checkmark-circle" : "ellipse-outline"} size={15} color="#073318" />
              <Text style={{
                fontFamily: Fonts.bold,
                fontSize: normalize(11),
                color: '#073318',
                marginLeft: Spacing.xs - 2
              }}>
                {isAllSelected ? (t('su_deselect_all') || 'Deselect All') : (t('su_select_all') || 'Select All')}
              </Text>
            </TouchableOpacity>
          </View>
          </>}

        {/* Success Banner */}
        {showSuccessBanner && <View className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#D1FAE5] flex-row items-center justify-between mb-6 shadow-sm">
            <View className="flex-row items-center flex-1 pr-4">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View className="ml-3">
                <Text className="text-[#065F46] font-bold text-[14px]">{t("su_all_orders_reschedul_402")}</Text>
                <Text className="text-[#047857] text-[11px] mt-0.5">{t("su_all_orders_have_been_403")}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowSuccessBanner(false)}>
              <Ionicons name="close" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>}

        {/* Vertical Order Card List */}
        {incomingOrders.length === 0 ? <View className="flex-1 items-center justify-center py-20">
            <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="cube-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-textSecondary font-bold text-center">{t("su_no_incoming_orders_a_404")}</Text>
          </View> : incomingOrders.map(item => {
        const isSelected = selectedIds.includes(item.id);
        const routeText = getRouteForOrder(item);
        const info = getInfoForOrder(item);
        const orderIdText = `ORD-1769749895005-${item.id.replace('inc-', '')}`;

        // Parse Route Text Visual Flow
        const routeParts = routeText.split('>');
        const source = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
        const destination = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);
        const orderReschedule = rescheduledOrders[item.id];
        const isOrderRescheduled = !!orderReschedule;
        return <TouchableOpacity key={item.id} onPress={() => toggleSelect(item.id)} activeOpacity={0.85} style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4
          },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
          padding: 14,
          marginBottom: 12,
          borderRadius: 20,
          borderColor: isSelected ? '#CEEAD6' : isOrderRescheduled ? '#FEF08A' : '#F1F5F9',
          borderWidth: 1.5,
          backgroundColor: isOrderRescheduled && !isSelected ? '#FFFBEB' : 'white'
        }} className="flex-row items-center">
                {/* Left Selection Circular Checkbox */}
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isSelected ? '#073318' : '#CBD5E1',
                  backgroundColor: isSelected ? '#073318' : 'white',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 1
                  },
                  shadowOpacity: isSelected ? 0.1 : 0,
                  shadowRadius: 2,
                  elevation: isSelected ? 2 : 0,
                  marginRight: 12
                }} className="items-center justify-center">
                  {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                </View>

                {/* Center Content Side */}
                <View className="flex-1 pr-2">
                  {/* Order ID Badge / Highlight */}
                  <View className="flex-row items-center">
                    <Text className="text-[11px] font-semibold text-slate-700 tracking-wider">
                      #{orderIdText}
                    </Text>
                  </View>

                  {/* Route Visual Section (Horizontal) */}
                  <View className="flex-row items-center mt-2.5 mb-1 flex-wrap">
                    <Text className="text-[13px] font-bold text-[#073318]">{source}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#94A3B8" style={{
                      marginHorizontal: 6
                    }} />
                    <Text className="text-[12.5px] font-bold text-[#073318]" numberOfLines={1}>{destination}</Text>
                  </View>

                  {/* Bottom Info Badges Row */}
                  <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                    {/* Qty Badge */}
                    <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-[6px] flex-row items-center">
                      <Feather name="package" size={9} color="#4F46E5" />
                      <Text className="text-[10px] font-black text-[#4F46E5] ml-1">{t("su_qty_405")}{item.remainingQty || 1}</Text>
                    </View>

                    <Text className="text-slate-300 text-[10px] font-bold">•</Text>

                    {/* Date Badge */}
                    <View className="flex-row items-center">
                      <Feather name="calendar" size={9} color="#64748B" />
                      <Text className="text-[10px] font-medium text-slate-600 ml-1">
                        {isOrderRescheduled ? orderReschedule.date : info.date}
                      </Text>
                    </View>

                    <Text className="text-slate-300 text-[10px] font-bold">•</Text>

                    {/* Time Badge */}
                    <View className="flex-row items-center">
                      <Feather name="clock" size={9} color="#64748B" />
                      <Text className="text-[10px] font-medium text-slate-600 ml-1">
                        {isOrderRescheduled ? orderReschedule.time : info.time}
                      </Text>
                    </View>

                    {isOrderRescheduled && <>
                      <Text className="text-slate-300 text-[10px] font-bold">•</Text>
                      <View className="bg-amber-100 px-2 py-0.5 rounded-[6px] flex-row items-center">
                        <Text className="text-[10px] font-bold text-amber-700">{t("su_rescheduled_406")}</Text>
                      </View>
                    </>}
                  </View>
                </View>

                {/* Right Side: Distance Badge */}
                <OrderDistance distance={item.distance} />
              </TouchableOpacity>;
      })}


        {/* Refresh Orders Button */}
        {incomingOrders.length > 0 && <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing} className="flex-row items-center justify-center py-5">
            {isRefreshing ? <ActivityIndicator size="small" color="#073318" /> : <>
                <Ionicons name="refresh-outline" size={16} color="#073318" />
                <Text className="text-[#073318] font-bold text-sm ml-2">{t("su_refresh_orders_407")}</Text>
              </>}
          </TouchableOpacity>}
        <View className="h-28" />
      </ScrollView>

      {/* Floating Animated Selection Action Bar */}
      {shouldRender && <Animated.View style={{
      transform: [{
        translateY: animatedY
      }],
      opacity: animatedOpacity,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8
      },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 10
    }} className="absolute bottom-[110px] left-6 right-6 bg-white border border-[#F1F5F9] rounded-[30px] p-4 flex-row gap-3">
          {/* Reject Button */}
          <TouchableOpacity onPress={handleRejectSelected} activeOpacity={0.8} className="flex-1 flex-row items-center justify-center bg-[#DC2626] py-3.5 rounded-[22px] shadow-sm" style={{
        shadowColor: '#DC2626',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3
      }}>
            <Ionicons name="close-circle" size={18} color="white" />
            <Text className="text-white font-extrabold text-[14px] tracking-wide ml-2">{t("su_reject_408")}{selectedIds.length})
            </Text>
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity onPress={handleAcceptSelected} activeOpacity={0.8} className="flex-1 flex-row items-center justify-center bg-[#073318] py-3.5 rounded-[22px] shadow-md" style={{
        shadowColor: '#073318',
        shadowOffset: {
          width: 0,
          height: 3
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4
      }}>
            <Ionicons name="checkmark-circle" size={18} color="white" />
            <Text className="text-white font-extrabold text-[14px] tracking-wide ml-2">{t("su_accept_409")}{selectedIds.length})
            </Text>
          </TouchableOpacity>
        </Animated.View>}

      {/* Centered Modal for Rescheduling Date/Time */}
      <Modal visible={showBottomSheet} transparent={true} animationType="fade" onRequestClose={() => setShowBottomSheet(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          {/* Backdrop Touch to dismiss */}
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setShowBottomSheet(false)} />

          <View className="bg-white rounded-[24px] w-full max-w-[400px] p-6 shadow-2xl">
            {/* Header */}
            <Text className="text-[20px] font-bold text-textPrimary text-center mb-2">{t("su_reschedule_date_time_410")}</Text>
            <Text className="text-textSecondary text-[14px] text-center mb-6">{t("su_select_new_date_and__411")}</Text>

            {/* Calendar Picker Section */}
            <Text className="text-textPrimary font-bold text-[14px] mb-3">{t("su_select_date_412")}</Text>

            <View className="border border-slate-100 rounded-2xl p-4 mb-6">
              {/* Month Header */}
              <View className="flex-row justify-between items-center mb-4 px-2">
                <TouchableOpacity className="p-1">
                  <Ionicons name="chevron-back" size={18} color="#6B7280" />
                </TouchableOpacity>
                <Text className="font-bold text-[15px] text-textPrimary">{t("su_may_2024_413")}</Text>
                <TouchableOpacity className="p-1">
                  <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Day Headers */}
              <View className="flex-row mb-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <View key={d} style={{
                width: '14.28%',
                alignItems: 'center'
              }}>
                    <Text className="text-gray-400 text-[10px] font-bold text-center">{d}</Text>
                  </View>)}
              </View>

              {/* Days Grid */}
              <View className="flex-row flex-wrap">
                {/* Empty slots from April (28, 29, 30) */}
                {[28, 29, 30].map(day => <View key={`prev-${day}`} style={{
                width: '14.28%',
                alignItems: 'center'
              }}>
                    <View className="w-9 h-9 items-center justify-center mb-1" />
                  </View>)}

                {/* May Days (1 to 31) */}
                {Array.from({
                length: 31
              }, (_, i) => i + 1).map(day => {
                const isDaySelected = tempSelectedDay === day;
                const isPast = day < 18; // Simulated "Today" is 18
                return <View key={`may-${day}`} style={{
                  width: '14.28%',
                  alignItems: 'center'
                }}>
                      <TouchableOpacity onPress={() => {
                    if (!isPast) setTempSelectedDay(day);
                  }} activeOpacity={isPast ? 1 : 0.7} className={`w-9 h-9 items-center justify-center rounded-full mb-1 ${isDaySelected ? 'bg-[#073318]' : ''}`}>
                        <Text className={`text-[13px] ${isDaySelected ? 'font-semibold text-white' : isPast ? 'font-medium text-gray-300' : 'font-semibold text-textPrimary'}`}>{day}</Text>
                      </TouchableOpacity>
                    </View>;
              })}

                {/* Empty slots from June (1) */}
                <View style={{
                width: '14.28%',
                alignItems: 'center'
              }}>
                  <View className="w-9 h-9 items-center justify-center mb-1" />
                </View>
              </View>
            </View>

            {/* Time Selector Section */}
            <Text className="text-textPrimary font-bold text-[14px] mb-3">{t("su_select_time_414")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
              {['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map(time => {
              const isTimeSelected = tempSelectedTime === time;
              return <TouchableOpacity key={time} onPress={() => setTempSelectedTime(time)} className={`flex-row items-center px-4 py-2.5 rounded-[12px] border ${isTimeSelected ? 'bg-[#073318] border-[#073318]' : 'bg-white border-slate-200'} mr-2`}>
                    {isTimeSelected && <Ionicons name="checkmark" size={14} color="white" style={{
                  marginRight: 4
                }} />}
                    <Text className={`text-[13px] font-bold ${isTimeSelected ? 'text-white' : 'text-textSecondary'}`}>{time}</Text>
                  </TouchableOpacity>;
            })}
            </ScrollView>

            {/* Bottom Button Actions */}
            <View className="flex-row mt-2">
              <TouchableOpacity onPress={() => {
              setShowBottomSheet(false);
              setTimeout(() => setRescheduleReasonModalVisible(true), 150);
            }} activeOpacity={0.75} className="flex-1 h-[50px] bg-white border border-[#CBD5E1] rounded-[25px] items-center justify-center mr-2 shadow-sm" style={{
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2
              },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 2
            }}>
                <Text className="text-[#4B5563] font-bold text-[14px]">{t("su_back_415")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
              const finalReason = selectedRescheduleReason === 'Other' ? customRescheduleReason : selectedRescheduleReason;
              const newRescheduled = {
                ...rescheduledOrders
              };
              selectedIds.forEach(id => {
                newRescheduled[id] = {
                  date: `${tempSelectedDay} May 2024`,
                  time: tempSelectedTime,
                  reason: finalReason || undefined
                };
              });
              setRescheduledOrders(newRescheduled);
              setShowSuccessBanner(true);
              setShowBottomSheet(false);
              setSelectedIds([]);
              setSelectedRescheduleReason(null);
              setCustomRescheduleReason('');
            }} activeOpacity={0.75} className="flex-1 h-[50px] bg-[#073318] rounded-[25px] items-center justify-center ml-2 shadow-md" style={{
              shadowColor: '#073318',
              shadowOffset: {
                width: 0,
                height: 3
              },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 4
            }}>
                <Text className="text-white font-black text-[14px]">{t("su_confirm_416")}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Reschedule Reason Modal */}
      <Modal visible={rescheduleReasonModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRescheduleReasonModalVisible(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setRescheduleReasonModalVisible(false)} />

          <View className="bg-white rounded-[24px] w-full max-w-[400px] p-6 shadow-2xl">
            <Text className="text-[20px] font-bold text-textPrimary text-center mb-6">{t("su_select_reschedule_re_417")}</Text>

            <ScrollView className="max-h-[300px] mb-4" showsVerticalScrollIndicator={false}>
              {rescheduleReasons.map(reason => (
                    <TouchableOpacity
                      key={reason.key}
                      onPress={() => setSelectedRescheduleReason(reason.default)}
                      className={`flex-row items-center p-4 rounded-xl border ${
                        selectedRescheduleReason === reason.default
                          ? 'border-[#073318] bg-[#F2FDF5]'
                          : 'border-slate-200 bg-white'
                      } mb-3`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                          selectedRescheduleReason === reason.default
                            ? 'border-[#073318]'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedRescheduleReason === reason.default && (
                          <View className="w-2.5 h-2.5 rounded-full bg-[#073318]" />
                        )}
                      </View>
                      <Text
                        className={`text-[15px] ${
                          selectedRescheduleReason === reason.default
                            ? 'text-[#073318] font-bold'
                            : 'text-slate-700 font-medium'
                        }`}
                      >
                        {t(reason.key) || reason.default}
                      </Text>
                    </TouchableOpacity>
                  ))}
            </ScrollView>

            {selectedRescheduleReason === 'Other' && <TextInput value={customRescheduleReason} onChangeText={setCustomRescheduleReason} placeholder={t("su_enter_custom_reason_418")} placeholderTextColor="#94A3B8" className="border border-slate-200 rounded-[16px] p-4 text-[15px] text-textPrimary mb-4 bg-slate-50" multiline />}

            <View className="flex-row mt-2">
              <TouchableOpacity onPress={() => setRescheduleReasonModalVisible(false)} activeOpacity={0.75} className="flex-1 h-[50px] bg-white border border-[#CBD5E1] rounded-[25px] items-center justify-center mr-2 shadow-sm">
                <Text className="text-[#4B5563] font-bold text-[14px]">{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
              setRescheduleReasonModalVisible(false);
              setTimeout(() => setShowBottomSheet(true), 150);
            }} disabled={!selectedRescheduleReason || selectedRescheduleReason === 'Other' && !customRescheduleReason.trim()} activeOpacity={0.75} className={`flex-1 h-[50px] rounded-[25px] items-center justify-center ml-2 shadow-md ${!selectedRescheduleReason || selectedRescheduleReason === 'Other' && !customRescheduleReason.trim() ? 'bg-slate-300' : 'bg-[#073318]'}`}>
                <Text className="text-white font-black text-[14px]">{t("su_next_420")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal visible={modalConfig.visible} title={modalConfig.title} message={modalConfig.message} isDestructive={modalConfig.isDestructive} confirmText={modalConfig.confirmText} onCancel={() => setModalConfig({
      ...modalConfig,
      visible: false
    })} onConfirm={() => {
      modalConfig.onConfirm();
      setModalConfig({
        ...modalConfig,
        visible: false
      });
    }} />

      {/* Reject Reason Modal */}
      <RejectReasonModal visible={rejectModalVisible} order={ordersToRejectBatch[currentRejectIndex] || null} onClose={() => {
      setRejectModalVisible(false);
      setSelectedIds([]);
    }} onSubmit={handleRejectModalSubmit} />
    </SafeAreaView>;
};
export default IncomingOrdersScreen;