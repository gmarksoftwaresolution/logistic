import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated, Modal, LayoutAnimation, TextInput, FlatList } from 'react-native';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import TextTicker from 'react-native-text-ticker';
import { CompositeScreenProps, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders } from '../context/OrderContext';
import { Colors, Fonts } from '../constants/theme';
import { Typography } from '../constants/typography';
import { Spacing, Grid } from '../constants/spacing';
import { FilterState, isOrderInDateRange } from '../utils/dateFilters';
import { AddressDetailsModal } from '../components/AddressDetailsModal';
import { normalize, moderateScale } from '../utils/responsive';
import { SharedHeader } from '../components/SharedHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { RejectReasonModal } from '../components/RejectReasonModal';
import { ViewMoreButton } from '../components/ViewMoreButton';
import { OrderDistance } from '../components/OrderDistance';
import { getRouteForOrder, getInfoForOrder, translateRoutePart, getFormattedOrderId, getModalAddresses } from '../utils/orderHelpers';
import { Order } from '../context/OrderContext';
import { HighlightCardWrapper } from '../components/HighlightCardWrapper';
import WalkthroughElement from '../components/WalkthroughElement';
import { useOnboarding } from '../context/OnboardingContext';

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
    acceptOrders,
    acceptAllOrders,
    rejectOrder,
    highlightedOrders,
    incomingReturnOrders,
    acceptReturnOrders,
    rejectReturnOrders
  } = useOrders();
  const { isActive, currentStep, nextStep } = useOnboarding();
  const insets = useSafeAreaInsets();
  if (!context || !user) return null;
  const {
    t
  } = context;
  const { refreshOrdersList } = useOrders();
  const isScreenFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => {
      refreshOrdersList();
    }, [refreshOrdersList])
  );

  const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
    switch (icon) {
      case 'bike': return 'bicycle-outline';
      case 'car': return 'car-sport-outline';
      case 'auto': return 'bus-outline';
      case 'pickup': return 'car-outline';
      case 'minivan': return 'bus-outline';
      case 'truck': return 'car-outline';
      case 'tractor': return 'car-outline';
      default: return 'car-outline';
    }
  };

  // Selection and Animation states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isNavigating = useRef(false);

  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [visibleReturnCount, setVisibleReturnCount] = useState(PAGE_SIZE);
  const [activeTab, setActiveTab] = useState<'new' | 'returns'>('new');
  const [selectedReturnIds, setSelectedReturnIds] = useState<string[]>([]);

  // Confirm Modal State
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    isDestructive: false,
    isInfoOnly: false,
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
  const [rescheduledCount, setRescheduledCount] = useState(0);
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
  const currentTabData = activeTab === 'new' ? incomingOrders : incomingReturnOrders;
  const currentSelectedIds = activeTab === 'new' ? selectedIds : selectedReturnIds;
  const setCurrentSelectedIds = activeTab === 'new' ? setSelectedIds : setSelectedReturnIds;

  const isAllSelected = currentTabData.length > 0 && currentSelectedIds.length === currentTabData.length;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setCurrentSelectedIds([]);
    } else {
      setCurrentSelectedIds(currentTabData.map((o: any) => o.id));
    }
  };
  const animatedY = useRef(new Animated.Value(100)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  // Animate bottom action bar visibility based on selection count
  useEffect(() => {
    if (currentSelectedIds.length > 0) {
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
  }, [currentSelectedIds.length]);
  const toggleSelect = (id: string) => {
    setCurrentSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };
  
  const [selectedAddressOrder, setSelectedAddressOrder] = useState<Order | null>(null);

  const handleAcceptSelected = () => {
    const isReturns = activeTab === 'returns';
    const ordersToAccept = isReturns 
      ? incomingReturnOrders.filter(o => selectedReturnIds.includes(o.id))
      : incomingOrders.filter(o => selectedIds.includes(o.id));
      
    if (ordersToAccept.length === 0) return;
    
    setModalConfig({
      visible: true,
      title: isReturns ? "Confirm Return Acceptance" : (t('su_confirm_action') || "Confirm Action"),
      message: isReturns 
        ? "Are you sure you want to accept the selected return order(s)?"
        : (t('su_are_you_sure_accept_selected') || "Are you sure you want to accept all {count} selected order(s)?").replace('{count}', ordersToAccept.length.toString()),
      isDestructive: false,
      isInfoOnly: false,
      confirmText: t('su_accept') || 'Accept',
      onConfirm: async () => {
        setIsProcessing(true);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        try {
          if (isReturns) {
            await acceptReturnOrders(selectedReturnIds);
            setSelectedReturnIds([]);
            Toast.show({
              type: 'success',
              text1: "Return Order Accepted",
              text2: "Pickup Return Created"
            });
            navigation.navigate('ReturnedOrders');
          } else {
            await acceptOrders(ordersToAccept);
            setSelectedIds([]);
            Toast.show({
              type: 'success',
              text1: t("su_success_388"),
              text2: t("su_orders_have_been_suc_389")
            });
            // Redirect directly to AcceptedOrders (pickup tab)
            navigation.navigate('AcceptedOrders', { initialTab: 'pickup' });
          }
          
          setModalConfig(prev => ({ ...prev, visible: false }));
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: isReturns ? 'Failed to accept return orders.' : 'Failed to accept orders.'
          });
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };
  const handleRejectSelected = () => {
    const isReturnsTab = activeTab === 'returns';
    const sourceArray = isReturnsTab ? incomingReturnOrders : incomingOrders;
    const currentSelected = isReturnsTab ? selectedReturnIds : selectedIds;
    
    const batch = sourceArray.filter(o => currentSelected.includes(o.id));
    if (batch.length === 0) return;
    setOrdersToRejectBatch(batch);
    setCurrentRejectIndex(0);
    setRejectModalVisible(true);
  };
  const handleRejectModalSubmit = async (order: Order, reason: string) => {
    try {
      if (activeTab === 'returns') {
        const idsToReject = ordersToRejectBatch.map(o => o.id);
        await rejectReturnOrders(idsToReject, reason);
      } else {
        await Promise.all(ordersToRejectBatch.map(o => 
          rejectOrder({
            ...o,
            rejectReason: reason
          })
        ));
      }
      setRejectModalVisible(false);
      if (activeTab === 'returns') {
        setSelectedReturnIds([]);
      } else {
        setSelectedIds([]);
      }
      import('react-native-toast-message').then(({
        default: Toast
      }) => Toast.show({
        type: 'success',
        text1: t("su_done_359"),
        text2: t("su_selected_orders_have_391")
      }));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to reject order.'
      });
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
      isInfoOnly: false,
      confirmText: t('su_accept') || 'Accept',
      onConfirm: async () => {
        setIsProcessing(true);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        try {
          if (selectedIds.length > 0) {
            await acceptOrders(ordersToAccept);
            setSelectedIds([]);
          } else {
            await acceptAllOrders();
          }
          Toast.show({
            type: 'success',
            text1: t("su_success_388"),
            text2: t("su_orders_have_been_suc_389")
          });
          
          setModalConfig({ ...modalConfig, visible: false });
          // Redirect directly to AcceptedOrders (pickup tab)
          navigation.navigate('AcceptedOrders', { initialTab: 'pickup' });
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to accept orders.'
          });
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (refreshOrdersList) await refreshOrdersList();
    } finally {
      setIsRefreshing(false);
    }
  };
  return <SafeAreaView className="flex-1" style={{
    backgroundColor: Colors.background
  }}>
      <SharedHeader title="Incoming Orders" subtitle="Review and manage newly received orders" navigation={navigation} />

      <FlatList 
        refreshControl={<SharedRefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        style={{ paddingHorizontal: Spacing.lg }} 
        className="flex-1 pt-2" 
        showsVerticalScrollIndicator={false}
        data={activeTab === 'new' ? (incomingOrders.length === 0 ? [] : incomingOrders.slice(0, visibleCount)) : incomingReturnOrders.slice(0, visibleReturnCount)}
        keyExtractor={item => item.id}
        ListHeaderComponent={<>
        {/* Segment Tab Switcher */}
        <View
          className="bg-white border border-[#F1F5F9] rounded-[28px] p-1.5 flex-row mb-4 gap-2 mx-1"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 3,
            marginTop: 4,
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
                {incomingOrders.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Returns Tab Button */}
          <TouchableOpacity
            onPress={() => setActiveTab('returns')}
            activeOpacity={0.8}
            className={`flex-1 py-3 flex-row justify-center items-center rounded-[22px] ${
              activeTab === 'returns' ? 'bg-[#073318]' : 'bg-transparent'
            }`}
            style={activeTab === 'returns' ? {
              shadowColor: '#073318',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            } : undefined}
          >
            <Text className={`font-bold text-[13px] ${
              activeTab === 'returns' ? 'text-white' : 'text-slate-500'
            }`}>
              Return
            </Text>
            <View 
              className="px-2.5 py-0.5 rounded-full ml-2"
              style={activeTab === 'returns' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#F1F5F9' }}
            >
              <Text className={`text-[10px] font-extrabold ${
                activeTab === 'returns' ? 'text-white' : 'text-slate-500'
              }`}>
                {incomingReturnOrders.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
          
        {currentTabData.length > 0 && (
          <View className="flex-row justify-between items-center px-1 mb-4 mt-2">
            <Text style={{ fontFamily: Fonts.bold, fontSize: normalize(14.5), color: '#1E293B' }}>
              {activeTab === 'new' ? (t('su_incoming_requests') || 'Incoming Requests') : 'Return Requests'} ({currentTabData.length})
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
        )}

        {/* Success Banner */}
        {showSuccessBanner && <View className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#D1FAE5] flex-row items-center justify-between mb-6 shadow-sm">
            <View className="flex-row items-center flex-1 pr-4">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View className="ml-3">
                <Text className="text-[#065F46] font-bold text-[14px]">
                  {activeTab === 'returns' 
                    ? t("su_return_order_accepted") || "Return Order Accepted Successfully"
                    : rescheduledCount === 1 
                      ? t("su_order_rescheduled_success") || "1 order rescheduled successfully"
                      : rescheduledCount === incomingOrders.length 
                        ? t("su_all_orders_reschedul_402") || "All orders rescheduled successfully"
                        : (t("su_orders_rescheduled_success") || "{count} orders rescheduled successfully").replace('{count}', rescheduledCount.toString())}
                </Text>
                <Text className="text-[#047857] text-[11px] mt-0.5">
                  {activeTab === 'returns'
                    ? t("su_pickup_return_created") || "Pickup return order has been created"
                    : rescheduledCount === 1 
                      ? t("su_order_has_been_updated") || "Order has been updated with the new date and time."
                      : rescheduledCount === incomingOrders.length 
                        ? t("su_all_orders_have_been_403") || "All orders have been updated with the new date and time."
                        : (t("su_orders_have_been_updated") || "Selected orders have been updated with the new date and time.")}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowSuccessBanner(false)}>
              <Ionicons name="close" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>}
        </>}
        ListEmptyComponent={
          activeTab === 'returns' ? (
            <View className="flex-1 items-center justify-center py-20 mt-4">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4 border border-slate-100 shadow-sm">
                <Ionicons name="refresh" size={32} color="#94A3B8" />
              </View>
              <Text className="text-[17px] font-black text-slate-800 text-center mb-1.5">No Return Orders</Text>
              <Text className="text-[13px] font-medium text-slate-500 text-center px-4">Return orders will appear here when available.</Text>
            </View>
          ) : incomingOrders.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                <Ionicons name="cube-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-textSecondary font-bold text-center">{t("su_no_incoming_orders_a_404")}</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
        const isSelected = currentSelectedIds.includes(item.id);
        const routeText = getRouteForOrder(item);
        const info = getInfoForOrder(item);
        const orderIdText = getFormattedOrderId(item);

        // Parse Route Text Visual Flow
        const routeParts = routeText.split('>');
        const source = translateRoutePart(routeParts[0]?.trim() || 'Transporter', t);
        const destination = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);
        const orderReschedule = rescheduledOrders[item.id];
        const isOrderRescheduled = !!orderReschedule;
        const showSuggestionPanel = item.parcelWeight !== undefined && item.parcelWeight > 30 && item.recommendedVehicle;

        return (
          <HighlightCardWrapper isHighlighted={highlightedOrders[item.id]}>
            <TouchableOpacity key={item.id} onPress={() => toggleSelect(item.id)} activeOpacity={0.85} style={{
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
                <TouchableOpacity onPress={() => toggleSelect(item.id)} activeOpacity={0.7} style={{
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
                </TouchableOpacity>

                {/* Center Content Side */}
                <View className="flex-1 pr-2">
                  {/* Order ID Badge / Highlight */}
                  <View className="flex-row items-center">
                    <Text className="text-[11px] font-semibold text-slate-700 tracking-wider">
                      {activeTab === 'returns' ? orderIdText : `#${orderIdText}`}
                    </Text>
                  </View>

                  {/* Route Visual Section (Horizontal) */}
                  <View className="flex-row items-center mt-2.5 pr-2">
                    <Text className="text-[13px] font-bold text-[#073318] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{source}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#94A3B8" style={{ marginHorizontal: 6 }} />
                    <Text className="text-[12.5px] font-bold text-[#073318] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{destination}</Text>
                  </View>

                  {/* View Address Button */}
                  <TouchableOpacity 
                    onPress={() => setSelectedAddressOrder(item)} 
                    activeOpacity={0.7}
                    className="mt-2 mb-1 self-start flex-row items-center px-2 py-0.5 rounded-[6px] border border-[#22C55E]/40 bg-[#F0FDF4]"
                  >
                    <Ionicons name="location-outline" size={10} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text className="text-[10px] font-bold text-[#16A34A] tracking-wide">
                      {t("view_address") || "View Address"}
                    </Text>
                  </TouchableOpacity>

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
                        {isOrderRescheduled ? orderReschedule.date : ((item as any).date || info.date)}
                      </Text>
                    </View>

                    <Text className="text-slate-300 text-[10px] font-bold">•</Text>

                    {/* Time Badge */}
                    <View className="flex-row items-center">
                      <Feather name="clock" size={9} color="#64748B" />
                      <Text className="text-[10px] font-medium text-slate-600 ml-1">
                        {isOrderRescheduled ? orderReschedule.time : ((item as any).time || info.time)}
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

                {/* Right Side - Vehicle Suggestion Panel */}
                {showSuggestionPanel && (
                  <View className="w-[120px] bg-[#F0FDF4] rounded-[14px] border border-[#DCFCE7] p-2.5 ml-1 flex-col justify-between" style={{ alignSelf: 'stretch' }}>
                    <View>
                      <View className="flex-row justify-between items-start mb-1.5">
                        <Text className="text-[#16A34A] font-bold text-[10px]" numberOfLines={1}>Vehicle Suggestion</Text>
                        {item.recommendedVehicle?.icon && (
                          <Ionicons name={getIconName(item.recommendedVehicle.icon)} size={14} color="#15803D" />
                        )}
                      </View>
                      <Text className="text-slate-500 text-[9px] font-medium">Parcel Weight</Text>
                      <Text className="text-[#166534] font-black text-[13px] mb-2">{item.parcelWeight} kg</Text>
                      <Text className="text-slate-500 text-[9px] font-medium">Suggested Vehicle</Text>
                      <Text className="text-[#15803D] font-bold text-[11px]" numberOfLines={2}>{item.recommendedVehicle?.name}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => {
                        if (isNavigating.current) return;
                        isNavigating.current = true;
                        navigation.navigate('VehicleSuggestionDetails', { order: item });
                        setTimeout(() => { isNavigating.current = false; }, 1000);
                      }}
                      activeOpacity={0.7}
                      className="mt-2 bg-white border border-[#22C55E] rounded-lg py-1.5 items-center justify-center shadow-sm"
                    >
                      <Text className="text-[#16A34A] font-bold text-[10px]">View Options</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </TouchableOpacity>
            </HighlightCardWrapper>
          );
        }}
        ListFooterComponent={<>
        {(activeTab === 'new' ? incomingOrders.length : incomingReturnOrders.length) > 0 && (
          <ViewMoreButton 
            totalCount={activeTab === 'new' ? incomingOrders.length : incomingReturnOrders.length}
            visibleCount={activeTab === 'new' ? visibleCount : visibleReturnCount}
            onPress={() => activeTab === 'new' ? setVisibleCount(prev => prev + PAGE_SIZE) : setVisibleReturnCount(prev => prev + PAGE_SIZE)}
          />
        )}

        <View className="h-28" />
        </>}
      />

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
            <Text className="text-white font-extrabold text-[14px] tracking-wide ml-2">{t("su_reject_408")}{currentSelectedIds.length})
            </Text>
          </TouchableOpacity>

          {/* Accept Button */}
          {modalConfig.visible ? (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={handleAcceptSelected} activeOpacity={0.8} className="w-full flex-row items-center justify-center bg-[#073318] py-3.5 rounded-[22px] shadow-md" style={{
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
                <Text className="text-white font-extrabold text-[14px] tracking-wide ml-2">{t("su_accept_409")}{currentSelectedIds.length})</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WalkthroughElement
              stepId="accept_selected_button"
              autoAdvance={false}
              style={{ flex: 1 }}
              isFocused={isScreenFocused}
            >
              <TouchableOpacity onPress={handleAcceptSelected} activeOpacity={0.8} className="w-full flex-row items-center justify-center bg-[#073318] py-3.5 rounded-[22px] shadow-md" style={{
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
                <Text className="text-white font-extrabold text-[14px] tracking-wide ml-2">{t("su_accept_409")}{currentSelectedIds.length})</Text>
              </TouchableOpacity>
            </WalkthroughElement>
          )}
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
              setRescheduledCount(selectedIds.length);
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

      <ConfirmModal isLoading={isProcessing} loadingText={t("su_processing") || "Processing..."} visible={modalConfig.visible} title={modalConfig.title} message={modalConfig.message} isDestructive={modalConfig.isDestructive} confirmText={modalConfig.confirmText} isInfoOnly={modalConfig.isInfoOnly} onCancel={() => setModalConfig({
      ...modalConfig,
      visible: false
    })} onConfirm={() => {
      modalConfig.onConfirm();
    }} />

      {/* Reject Reason Modal */}
      <RejectReasonModal visible={rejectModalVisible} order={ordersToRejectBatch[currentRejectIndex] || null} onClose={() => {
      setRejectModalVisible(false);
      setSelectedIds([]);
    }} onSubmit={handleRejectModalSubmit} />
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

    </SafeAreaView>;
};
export default IncomingOrdersScreen;