import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert, Modal, Image, Animated, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { OrdersStackParamList } from '../navigation/types';
import { LanguageContext } from '../context/LanguageContext';
import { useOrders } from '../context/OrderContext';
import { getRouteForOrder, getFormattedOrderId, translateRoutePart } from '../utils/orderHelpers';
import { RejectReasonModal } from '../components/RejectReasonModal';
import { Order } from '../context/OrderContext';
import WalkthroughElement from '../components/WalkthroughElement';
import { useOnboarding } from '../context/OnboardingContext';
import { RescheduleModals } from '../components/RescheduleModals';
import Toast from 'react-native-toast-message';
import axiosInstance from '../api/axiosInstance';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetails'>;
const OrderDetailsScreen: React.FC<Props> = ({
  route,
  navigation
}) => {
  const context = useContext(LanguageContext);
  const { t } = context!;
  const { isActive, currentStep, nextStep } = useOnboarding();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (
      isActive &&
      (currentStep?.id === 'capture_photos_button' ||
        currentStep?.id === 'submit_order_button' ||
        currentStep?.id === 'scan_products_button' ||
        currentStep?.id === 'submit_delivery_button')
    ) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [isActive, currentStep?.id]);

  const {
    order: routeOrder
  } = route.params;
  const {
    receiveOrder,
    rejectOrder,
    deliverOrder,
    orders,
    rescheduleOrder,
    refreshOrdersList
  } = useOrders();

  const order = orders.find(o => o.id === routeOrder.id) || routeOrder;
  const routeStr = getRouteForOrder(order);
  const routeParts = routeStr.split('>');
  const rawSource = routeParts[0]?.trim() || 'Transporter';
  const rawDestination = routeParts[1]?.trim() || 'Buyer';
  const source = translateRoutePart(rawSource, t);
  const destination = translateRoutePart(rawDestination, t);

  // 1. Determine if we are in Pickup or Delivery phase
  // For drop orders:
  // - When accepted (status === 'Accepted'), SHG is picking up from the Transporter (show Transporter details)
  // - Once picked up (status === 'PickedUp'), SHG is delivering to the Buyer (show Buyer details)
  const isDeliveryPhase = order.status === 'PickedUp' 
    || (order.id.startsWith('RTO-') && order.legType === 'drop');

  // 2. Resolve active side details
  const activeRawName = isDeliveryPhase ? rawDestination : rawSource;
  let activeType: 'transporter' | 'seller' | 'buyer';

  if (isDeliveryPhase) {
    if (rawDestination.toLowerCase() === 'transporter') {
      activeType = 'transporter';
    } else {
      activeType = 'buyer';
    }
  } else {
    // Pickup phase logic
    if (rawSource.toLowerCase() === 'transporter') {
      activeType = 'transporter';
    } else {
      activeType = 'seller';
    }
  }

  if (order.isRejectedDelivery) {
    activeType = 'transporter';
  }

  // 3. Set details values dynamically
  let detailsTitle = t('su_transporter_details') || "Transporter Details";
  let headerIcon: any = "car-outline";
  let nameLabel = t('su_person_name') || "Person Name";
  let nameValue = order.transporterName || "N/A";
  let mobileLabel = t('su_mobile_number') || "Mobile Number";
  let mobileValue = order.transporterMobile || "N/A";
  let addressOrVehicleLabel = t('su_vehicle_number') || "Vehicle Number";
  let addressOrVehicleIcon: any = "car-outline";
  let addressOrVehicleValue = order.vehicleNumber || "N/A";

  if (order.isRejectedDelivery && activeType === 'transporter') {
    addressOrVehicleLabel = "Return Hub Address";
    addressOrVehicleIcon = "location-outline";
    addressOrVehicleValue = "Kolhapur Transporter Hub, Main Road, Kolhapur";
  } else if (isDeliveryPhase && activeType === 'transporter') {
    nameLabel = "Transporter Name";
    mobileLabel = "Transporter Mobile Number";
    addressOrVehicleLabel = "Transporter Address";
    addressOrVehicleIcon = "location-outline";
    addressOrVehicleValue = order.transporterAddress || "N/A";
  }

  if (activeType === 'seller') {
    detailsTitle = t('su_seller_details') || "Seller Details";
    headerIcon = "storefront-outline";
    nameLabel = t('su_seller_name') || "Seller Name";
    nameValue = order.sellerName || source;
    mobileLabel = t('su_seller_mobile_number') || "Seller Mobile Number";
    
    // Validate mobile number to avoid showing seller IDs
    const isValidPhone = order.mobile && /^[+]?[0-9\s-]{10,15}$/.test(order.mobile);
    mobileValue = isValidPhone ? order.mobile : "9876543210";
    
    addressOrVehicleLabel = t('su_shop_name_seller_address') || "Shop Name / Seller Address";
    addressOrVehicleIcon = "location-outline";

    // Dynamic detailed address logic
    let resolvedAddress = order.address || source;
    if (resolvedAddress.toLowerCase().includes('hifi')) {
      resolvedAddress = "Hifi Shop, Bramhan galli, Chandgad, kolhapur, Maharastra";
    } else if (resolvedAddress.toLowerCase().includes('home no')) {
      resolvedAddress = "Home No. 23, Market Road, Kowad, kolhapur, Maharastra";
    }
    addressOrVehicleValue = resolvedAddress;
  } else if (activeType === 'buyer') {
    detailsTitle = t('su_buyer_details') || "Buyer Details";
    headerIcon = "person-outline";
    nameLabel = t('su_buyer_name') || "Buyer Name";
    nameValue = order.buyerName || destination;
    mobileLabel = t('su_buyer_mobile_number') || "Buyer Mobile Number";
    mobileValue = order.mobile || "+91 9876543210";
    addressOrVehicleLabel = t('su_buyer_address') || "Buyer Address";
    addressOrVehicleIcon = "location-outline";
    addressOrVehicleValue = order.address || `${destination}, Chandgad, kolhapur, Maharastra`;
  }

  const products = order.products || [];
  const totalWeight = products.reduce((sum: number, p: any) => sum + p.weightValue, 0);
  const formattedOrderId = getFormattedOrderId(order);
  const headerTitle = isDeliveryPhase ? (t('su_delivery_details') || "Delivery Details") : (t('su_collection_details') || "Collection Details");
  const headerSubtitle = `${t('su_batch_hash') || 'Batch #'} ${formattedOrderId} • ${source}`;
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [showShgCode, setShowShgCode] = useState<boolean>(false);
  const [dropItemCodes, setDropItemCodes] = useState<Record<number, string>>({});
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const [sellerEnteredCode, setSellerEnteredCode] = useState<string>('');
  const sellerInputRefs = useRef<any[]>([]);

  const handleSellerCodeChange = (digitIdx: number, text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const currentVal = sellerEnteredCode.padEnd(4, ' ');
    const chars = currentVal.split('');
    chars[digitIdx] = cleanText || ' ';
    const newVal = chars.join('').trimEnd();
    setSellerEnteredCode(newVal);

    if (cleanText && digitIdx < 3) {
      sellerInputRefs.current[digitIdx + 1]?.focus();
    }
  };

  const handleSellerKeyPress = (digitIdx: number, key: string) => {
    if (key === 'Backspace' && !sellerEnteredCode[digitIdx] && digitIdx > 0) {
      sellerInputRefs.current[digitIdx - 1]?.focus();
    }
  };

  const setRef = (itemId: number, digitIndex: number, ref: TextInput | null) => {
    inputRefs.current[`${itemId}-${digitIndex}`] = ref;
  };

  const handleCodeChange = (itemId: number, digitIndex: number, text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const currentVal = (dropItemCodes[itemId] || '').padEnd(4, ' ');
    const valArr = currentVal.split('');
    valArr[digitIndex] = cleanText || ' ';
    const newVal = valArr.join('').trimEnd();
    setDropItemCodes(prev => ({ ...prev, [itemId]: newVal }));

    if (cleanText && digitIndex < 3) {
      inputRefs.current[`${itemId}-${digitIndex + 1}`]?.focus();
    }
  };

  const handleKeyPress = (itemId: number, digitIndex: number, key: string) => {
    if (key === 'Backspace') {
      const currentVal = dropItemCodes[itemId] || '';
      if (!currentVal[digitIndex] || currentVal[digitIndex] === ' ' || currentVal[digitIndex] === '') {
        if (digitIndex > 0) {
          inputRefs.current[`${itemId}-${digitIndex - 1}`]?.focus();
        }
      }
    }
  };
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dynamic computed variables directly from database/backend data structure
  const codesGenerated = (order.products || []).some((p: any) => !!p.verificationCode);
  const deliveryCodeGenerated = codesGenerated;
  const deliveryCodeVerified = (order.products || []).length > 0 && (order.products || []).every((p: any) => p.verificationStatus === 'VERIFIED');
  const pickupCodeVerified = (order.products || []).length > 0 && (order.products || []).every((p: any) => p.verificationStatus === 'VERIFIED');
  const pickupCodeVisible = codesGenerated;



  const isSubmitDisabled = isSubmitting || (
    activeType === 'transporter'
      ? (isDeliveryPhase ? !deliveryCodeVerified : (order.legType === 'drop' ? !order.handoverCode : !pickupCodeVerified))
      : (activeType === 'buyer' ? !deliveryCodeVerified : !deliveryCodeVerified)
  );

  // Delivery Scanner states
  const [isScanned, setIsScanned] = useState<boolean>(false);
  const [scannerModalVisible, setScannerModalVisible] = useState<boolean>(false);
  const [scanningStatus, setScanningStatus] = useState<'scanning' | 'success'>('scanning');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  // Reschedule state hooks
  const [showRescheduleBottomSheet, setShowRescheduleBottomSheet] = useState(false);
  const [rescheduleReasonModalVisible, setRescheduleReasonModalVisible] = useState(false);

  // Reschedule timer logic
  const [rescheduleTimeLeft, setRescheduleTimeLeft] = useState<number | null>(null);
  const [rescheduleProgress, setRescheduleProgress] = useState<number>(100);
  const [rescheduleExpired, setRescheduleExpired] = useState<boolean>(false);

  const isPickupAccepted = !isDeliveryPhase && order.status === 'Accepted' && !order.id.startsWith('RTO-');
  const isReturnPickup = !isDeliveryPhase && order.id.startsWith('RTO-') && order.legType === 'pickup';
  const showRescheduleTimer = isPickupAccepted || isReturnPickup || isDeliveryPhase;

  useEffect(() => {
    if (!showRescheduleTimer || !order.acceptedAt) return;

    const acceptedDate = new Date(order.acceptedAt);
    if (isNaN(acceptedDate.getTime())) return;

    const duration = isDeliveryPhase ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
    const endTime = acceptedDate.getTime() + duration;

    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, endTime - now);

      setRescheduleTimeLeft(left);

      const prog = Math.max(0, Math.min(100, (left / duration) * 100));
      setRescheduleProgress(prog);

      if (left <= 0) {
        setRescheduleExpired(true);
      } else {
        setRescheduleExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [showRescheduleTimer, order.acceptedAt, isDeliveryPhase]);

  const formatTimeLeft = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const scanLaserAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (scannerModalVisible) {
      scanLaserAnim.setValue(0);
      animation = Animated.loop(Animated.sequence([Animated.timing(scanLaserAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true
      }), Animated.timing(scanLaserAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true
      })]));
      animation.start();
    } else {
      scanLaserAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [scannerModalVisible]);
  useEffect(() => {
    if (!scannerModalVisible) return;
    setScanningStatus('scanning');
    let closeTimer: NodeJS.Timeout;
    const scanTimer = setTimeout(async () => {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.log("Haptics error:", e);
      }
      setScanningStatus('success');
      closeTimer = setTimeout(() => {
        setIsScanned(true);
        setScannerModalVisible(false);
        if (isActive && currentStep?.id === 'scan_products_button') {
          nextStep();
        }
      }, 1200);
    }, 2000);
    return () => {
      clearTimeout(scanTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [scannerModalVisible]);
  const translateY = scanLaserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240]
  });
  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Camera access is needed to capture product verification photos.");
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setTempPhotoUri(uri);
        setPreviewVisible(true);
      }
    } catch (error) {
      Alert.alert("Camera Error", "Failed to launch camera. Please try again.");
    }
  };
  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);

      // Code Verification Rule
      if (activeType === 'seller' && !deliveryCodeGenerated) {
        Alert.alert("Verification Required", "Please generate delivery code before submitting.");
        setIsSubmitting(false);
        return;
      }

      // Delivery Code Verification Rule (for transporter delivery)
      if (activeType === 'transporter' && isDeliveryPhase && !deliveryCodeVerified) {
        Alert.alert("Verification Required", "Please verify delivery code before submitting.");
        setIsSubmitting(false);
        return;
      }

      // Pickup Code Verification Rule (for transporter pickup)
      if (activeType === 'transporter' && !isDeliveryPhase) {
        if (order.legType === 'pickup' && !pickupCodeVerified) {
          Alert.alert("Verification Required", "Please verify pickup code before submitting.");
          setIsSubmitting(false);
          return;
        }
        if (order.legType === 'drop' && !order.handoverCode) {
          Alert.alert("Verification Required", "Please wait for transporter to generate code before submitting.");
          setIsSubmitting(false);
          return;
        }
      }

      if (order.id.startsWith('RTO-') && !isDeliveryPhase) {
        await receiveOrder({
          ...order,
          image: capturedPhotoUri
        });
        Toast.show({
          type: 'success',
          text1: t("su_pickup_return_completed") || "Pickup Return Completed",
          text2: t("su_order_moved_delivery_returns") || "Order moved to Delivery Return successfully"
        });
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('ReturnOrders' as never);
        }
        return;
      }

      if (isDeliveryPhase) {
        await deliverOrder({
          ...order,
          image: capturedPhotoUri
        });
        if (order.id.startsWith('RTO-')) {
          Toast.show({
            type: 'success',
            text1: "Return delivery completed successfully."
          });
        }
      } else {
        await receiveOrder({
          ...order,
          image: capturedPhotoUri
        }, undefined, activeType);
      }
      if (order.id.startsWith('RTO-')) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('ReturnOrders' as never);
        }
      } else {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('AcceptedOrders', { initialTab: isDeliveryPhase ? 'delivery' : 'pickup' });
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleRejectOrder = () => {
    setRejectModalVisible(true);
  };
  const handleRejectModalSubmit = async (ord: Order, reason: string) => {
    try {
      await rejectOrder({
        ...ord,
        rejectReason: reason
      });
      setRejectModalVisible(false);
      if (isDeliveryPhase) {
        Toast.show({
          type: 'success',
          text1: t("su_address_updated") || "Return Address Updated",
          text2: t("su_please_return_to_source") || "Please deliver the order back to the pickup point."
        });
      } else {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('AcceptedOrders', { initialTab: 'pickup' });
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to reject order. Please try again.");
    }
  };
  return <SafeAreaView className="flex-1 bg-[#F8FAFC]">
    {/* Custom Header mimicking the SharedHeader but matching exactly the mockup layout */}
    <View className="px-6 py-4 flex-row items-center">
      <TouchableOpacity onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('AcceptedOrders', { initialTab: isDeliveryPhase ? 'delivery' : 'pickup' });
        }
      }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100" style={{
        elevation: 2
      }}>
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>
      <View className="flex-1 ml-4 bg-[#F0FDF4] px-4 py-2.5 rounded-[24px] border border-[#DCFCE7] flex-row justify-between items-center">
        <View className="flex-1 pr-2">
          <Text className="text-[16px] font-black text-[#111827] mb-0.5">{headerTitle}</Text>
          <Text className="text-[11px] font-bold text-[#059669]" numberOfLines={1}>{headerSubtitle}</Text>
        </View>
        <TouchableOpacity className="w-8 h-8 bg-white rounded-full items-center justify-center border border-[#DCFCE7] shadow-sm">
          <Ionicons name="help" size={16} color="#059669" />
        </TouchableOpacity>
      </View>
    </View>

    <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

      {/* Main Order Info Card - Green Theme */}
      <View className="bg-[#073318] rounded-[28px] p-5 mb-6" style={{
        shadowColor: '#073318',
        shadowOffset: {
          width: 0,
          height: 8
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8
      }}>
        <View className="flex-row justify-between items-start mb-6">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-12 h-12 bg-white/10 rounded-[12px] items-center justify-center mr-3 border border-white/20">
              <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[18px] font-black text-white tracking-wider" numberOfLines={1}>
                #{formattedOrderId}
              </Text>
              <Text className="text-[12px] font-bold text-white/70 mt-0.5" numberOfLines={1}>
                {source} {t("su_transit_347")}
              </Text>
            </View>
          </View>
          <View className={order.isRejectedDelivery ? "bg-[#7F1D1D] border border-red-500/20 px-3 py-1.5 rounded-full shadow-sm flex-shrink-0" : "bg-[#0D4021] border border-white/10 px-3 py-1.5 rounded-full shadow-sm flex-shrink-0"}>
            <Text className={`text-[10px] font-black uppercase tracking-wider ${order.isRejectedDelivery ? 'text-[#FECACA]' : 'text-[#6EE7B7]'}`}>
              {order.isRejectedDelivery ? "RETURNING" : (order.status === 'Accepted' ? t('su_status_accepted') || 'ACCEPTED' : order.status === 'Received' ? t('su_status_received') || 'RECEIVED' : order.status === 'Delivered' ? t('su_status_delivered') || 'DELIVERED' : order.status)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">{t("from")}</Text>
            <Text className="text-[16px] font-black text-white">{source}</Text>
          </View>
          <View className="w-8 items-center">
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.4)" />
          </View>
          <View className="flex-1 items-end">
            <Text className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">{t("to")}</Text>
            <Text className="text-[16px] font-black text-white">{destination}</Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1 bg-white/10 py-3 rounded-[12px] items-center justify-center border border-white/5">
            <View className="flex-row items-center">
              <Ionicons name="cube-outline" size={14} color="white" />
              <Text className="text-[14px] font-black text-white ml-1">{order.remainingQty || 1}</Text>
            </View>
            <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_items") || "Items"}</Text>
          </View>
          <View className="flex-1 bg-white/10 py-3 rounded-[12px] items-center justify-center border border-white/5">
            <View className="flex-row items-center">
              <Ionicons name="bag-handle-outline" size={14} color="white" />
              <Text className="text-[14px] font-black text-white ml-1">{totalWeight} {t("su_kg") || "kg"}</Text>
            </View>
            <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_total_weight") || "Total Weight"}</Text>
          </View>
          <View className="flex-1 bg-white/10 py-3 rounded-[12px] items-center justify-center border border-white/5">
            <View className="flex-row items-center px-1">
              <Text className="text-[14px] font-black text-white">₹</Text>
              <Text className="text-[14px] font-black text-white ml-1" numberOfLines={1} adjustsFontSizeToFit>{Number(order.amount || 0).toFixed(2)}</Text>
            </View>
            <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_total_amount") || "Total Amount"}</Text>
          </View>
          <View className="flex-1 bg-white/10 py-3 rounded-[12px] items-center justify-center border border-white/5">
            <View className="flex-row items-center">
              <Ionicons name="card-outline" size={14} color="white" />
              <Text className="text-[14px] font-black text-white ml-1">{order.payment || 'Prepaid'}</Text>
            </View>
            <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_payment") || "Payment"}</Text>
          </View>
        </View>
      </View>

      {/* Info Strip */}
      <View className="bg-white rounded-[16px] p-4 border border-[#F1F5F9] mb-6 flex-col gap-3" style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
      }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#059669" />
            <Text className="text-[11.5px] font-bold text-[#059669] ml-1.5">{isDeliveryPhase ? (t("su_expected_delivery") || "Expected Delivery") : (t("su_expected_collection") || "Expected Collection")}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text className="text-[11.5px] font-bold text-[#475569]" numberOfLines={1}>{(order as any).date || '18 May 2024'}</Text>
            {!(order as any).rescheduledTime && (
              <>
                <Text className="text-[11px] font-bold text-[#94A3B8] mx-1.5">•</Text>
                <Text className="text-[11.5px] font-bold text-[#475569]" numberOfLines={1}>{(order as any).time || '11:00 AM'}</Text>
              </>
            )}
          </View>
        </View>

        {order.rescheduledDate && order.rescheduledTime && (
          <>
            <View className="h-[1px] bg-slate-100" />
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="refresh-circle-outline" size={16} color="#EAB308" />
                <Text className="text-[11.5px] font-black text-[#CA8A04] ml-1.5">Rescheduled To</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color="#EAB308" />
                <Text className="text-[11.5px] font-black text-[#CA8A04] ml-1.5">{order.rescheduledDate}, {order.rescheduledTime}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Dynamic Contact Details Card (Seller vs Transporter vs Buyer) */}
      <View className="bg-white rounded-[28px] p-5 border border-[#F1F5F9] mb-6" style={{
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4
      }}>
        {/* Header row inside card */}
        <View className="flex-row justify-between items-center pb-4 border-b border-slate-100 mb-4">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-[#F8FAFC] items-center justify-center mr-2 border border-slate-100">
              <Ionicons name={headerIcon} size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{detailsTitle}</Text>
          </View>
          <TouchableOpacity onPress={() => handleCall(mobileValue)} className="bg-[#E8F5EC] px-3 py-1.5 rounded-[10px] flex-row items-center border border-[#D5EFE0]">
            <Ionicons name="call-outline" size={14} color="#073318" />
            <Text className="text-[12px] font-black text-[#073318] ml-1.5">{t("su_call_353")}</Text>
          </TouchableOpacity>
        </View>

        {/* Rows */}
        <View className="flex-row items-start mb-4">
          <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
            <Ionicons name="person-outline" size={18} color="#073318" />
          </View>
          <View className="flex-1 justify-center mt-0.5">
            <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{nameLabel}</Text>
            <Text className="text-[14px] font-black text-[#111827]">
              {nameValue}
            </Text>
          </View>
        </View>

        <View className="flex-row items-start mb-4">
          <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
            <Ionicons name="call-outline" size={18} color="#073318" />
          </View>
          <View className="flex-1 justify-center mt-0.5">
            <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{mobileLabel}</Text>
            <Text className="text-[14px] font-black text-[#111827]">
              {mobileValue}
            </Text>
          </View>
        </View>

        {activeType === 'transporter' ? (
          <>
            <View className="flex-row items-start mb-4">
              <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
                <Ionicons name="car-outline" size={18} color="#073318" />
              </View>
              <View className="flex-1 justify-center mt-0.5">
                <Text className="text-[11px] font-bold text-slate-500 mb-0.5">Vehicle Number</Text>
                <Text className="text-[14px] font-black text-[#111827]">{order.vehicleNumber || 'N/A'}</Text>
              </View>
            </View>

            <View className="flex-row items-start mb-4">
              <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
                <Ionicons name="location-outline" size={18} color="#073318" />
              </View>
              <View className="flex-1 justify-center mt-0.5">
                <Text className="text-[11px] font-bold text-slate-500 mb-0.5">Transporter Address</Text>
                <Text className="text-[14px] font-black text-[#111827]">{order.transporterAddress || 'N/A'}</Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
                <Ionicons name="map-outline" size={18} color="#073318" />
              </View>
              <View className="flex-1 justify-center mt-0.5">
                <Text className="text-[11px] font-bold text-slate-500 mb-0.5">Route Details</Text>
                <Text className="text-[14px] font-black text-[#111827]">{order.transporterRoute || 'N/A'}</Text>
              </View>
            </View>
          </>
        ) : (
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
              <Ionicons name={addressOrVehicleIcon} size={18} color="#073318" />
            </View>
            <View className="flex-1 justify-center mt-0.5">
              <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{addressOrVehicleLabel}</Text>
              <Text className="text-[14px] font-black text-[#111827] pr-2">
                {addressOrVehicleValue}
              </Text>

              {order.isRejectedDelivery && (
                <View className="mt-3 bg-[#FEF2F2] border border-[#FECACA] p-3 rounded-[16px] flex-row items-start">
                  <Ionicons name="warning-outline" size={16} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
                  <View className="flex-1">
                    <Text className="text-[12px] font-extrabold text-[#991B1B] uppercase tracking-wider mb-1">
                      Return Address Updated
                    </Text>
                    <Text className="text-[12px] font-medium text-[#7F1D1D] leading-tight">
                      This order was rejected during delivery. The address has been updated to the original pickup point from where the order was collected. Please return the products to this location.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Transporter N/A Info Card */}
      {activeType === 'seller' && (
        <View className="bg-white rounded-[28px] p-5 border border-[#F1F5F9] mb-6" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 4
        }}>
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#F8FAFC] items-center justify-center mr-2 border border-slate-100">
              <Ionicons name="car-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{t('su_transporter_details') || "Transporter Details"}</Text>
          </View>
          <View className="flex-col gap-3">
            <View className="flex-row justify-between">
              <Text className="text-[13px] font-medium text-slate-500">Transporter Name</Text>
              <Text className="text-[13px] font-black text-[#111827]">N/A</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[13px] font-medium text-slate-500">Transporter Mobile</Text>
              <Text className="text-[13px] font-black text-[#111827]">N/A</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[13px] font-medium text-slate-500">Vehicle Number</Text>
              <Text className="text-[13px] font-black text-[#111827]">N/A</Text>
            </View>
          </View>
        </View>
      )}

      {/* Task Items / Products Header */}
      <View className="flex-row justify-between items-center mb-4 mx-1">
        <View className="flex-row items-center">
          <Ionicons name="cube-outline" size={20} color="#073318" />
          <Text className="text-[16px] font-black text-[#111827] ml-2">
            {isDeliveryPhase ? (t("su_products_for_delivery") || "Products for Delivery") : (t("su_products_for_collect_354") || "Products for Collection")}
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className="bg-[#ECFDF5] px-2.5 py-1 rounded-[6px] mr-2 border border-[#D1FAE5]">
            <Text className="text-[11px] font-black text-[#059669]">
              {products.length} {products.length === 1 ? 'Product' : 'Products'}
            </Text>
          </View>
          <View className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm items-center justify-center">
            <Ionicons name="chevron-up" size={16} color="#64748B" />
          </View>
        </View>
      </View>

      {/* Task Card Container */}
      <View className="bg-white rounded-[28px] p-2 border border-[#F1F5F9] mb-6" style={{
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4
      }}>
        {products.map((item: any, index: number) => {
          const isLast = index === products.length - 1;
          return <View key={item.code} className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-slate-100' : ''}`}>
            {/* LEFT + CENTER Wrapper */}
            <View className="flex-1 flex-row items-center pr-2">
              {/* LEFT: Square Badge */}
              <View className="w-12 h-12 bg-[#E8F5EC] rounded-[10px] items-center justify-center mr-3">
                <Text className="text-[12px] font-black text-[#073318]">{item.code}</Text>
              </View>

              {/* CENTER */}
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-[#111827] mb-1 leading-tight">
                  {item.name}
                </Text>
                <Text className="text-[12px] font-medium text-[#64748B]">
                  {item.details}
                </Text>
              </View>
            </View>

            {/* RIGHT: Arrow */}
            <Ionicons name="chevron-forward" size={16} color="#111827" />
          </View>;
        })}

        {/* Verification Section */}
        {activeType === 'transporter' ? (
          order.legType === 'drop' ? (
            <View className="bg-white border border-[#E2E8F0] rounded-[16px] p-4 mx-2 my-2 shadow-sm">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
                  <Ionicons name="keypad-outline" size={16} color="#073318" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-black text-[#111827]">
                    {isDeliveryPhase ? "Delivery Verification" : "Transporter Handover Code"}
                  </Text>
                  <Text className="text-[11px] font-medium text-slate-500 mt-0.5">
                    {isDeliveryPhase 
                      ? "Delivery verification code for transporter." 
                      : "Share this code with the transporter to confirm pickup."}
                  </Text>
                </View>
              </View>

              {isDeliveryPhase ? (
                <View className="bg-slate-50 border border-slate-200 rounded-[12px] py-4 items-center justify-center">
                  <Text className="text-[28px] font-black text-[#073318] tracking-widest">
                    {order.handoverCode || 'Waiting...'}
                  </Text>
                </View>
              ) : (
                !showShgCode ? (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await refreshOrdersList();
                      } catch (err) {
                        console.error('Error refreshing orders list:', err);
                      }
                      setShowShgCode(true);
                    }}
                    className="bg-[#073318] h-12 rounded-[12px] flex-row items-center justify-center shadow-sm"
                  >
                    <Text className="text-[14px] font-bold text-white">View Verification Code</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-slate-50 border border-slate-200 rounded-[12px] py-4 items-center justify-center">
                    <Text className="text-[28px] font-black text-[#073318] tracking-widest">
                      {order.handoverCode || 'Waiting for Transporter...'}
                    </Text>
                  </View>
                )
              )}
            </View>
          ) : (
            !codesGenerated ? (
              <View className="bg-white border border-[#E2E8F0] rounded-[16px] p-4 mx-2 my-2 shadow-sm">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
                    <Ionicons name="keypad-outline" size={16} color="#073318" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-black text-[#111827]">
                      {isDeliveryPhase ? "Generate Delivery Code" : "Generate Handover Code"}
                    </Text>
                    <Text className="text-[11px] font-medium text-slate-500 mt-0.5">
                      Generate a 4-digit verification code.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
                      await axiosInstance.post(`/orders/new/pickup/${rawId}/generate-code`);
                      await refreshOrdersList();
                      Toast.show({
                        type: 'success',
                        text1: 'Code Generated',
                        text2: 'Verification code generated successfully'
                      });
                    } catch (err) {
                      console.error('Error generating code:', err);
                      Alert.alert('Error', 'Failed to generate verification code. Please try again.');
                    }
                  }}
                  className="bg-[#073318] h-12 rounded-[12px] flex-row items-center justify-center shadow-sm"
                >
                  <Text className="text-[14px] font-bold text-white">Generate Code</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-white border border-[#E2E8F0] rounded-[16px] p-4 mx-2 my-2 shadow-sm">
                <View className="flex-row items-center mb-4">
                  <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
                    <Ionicons name="keypad-outline" size={16} color="#073318" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-black text-[#111827]">
                      {isDeliveryPhase ? "Delivery Verification" : "Handover Verification"}
                    </Text>
                    <Text className="text-[11px] font-medium text-slate-500 mt-0.5">
                      Enter the 4-digit code from the transporter to confirm handover.
                    </Text>
                  </View>
                </View>

                <View className="flex-col gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-black text-[#111827]">Verification Pending</Text>
                    {deliveryCodeVerified ? (
                      <View className="bg-[#ECFDF5] border border-[#D1FAE5] px-3 py-1.5 rounded-[8px] flex-row items-center">
                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                        <Text className="text-[12px] font-bold text-[#059669] ml-1">Verified</Text>
                      </View>
                    ) : null}
                  </View>

                  {!deliveryCodeVerified && (
                    <View className="flex-row items-center justify-between mt-1">
                      <View className="flex-row gap-2">
                        {[0, 1, 2, 3].map((digitIdx) => {
                          const val = (sellerEnteredCode || '')[digitIdx] || '';
                          return (
                            <TextInput
                              key={digitIdx}
                              ref={(ref) => { sellerInputRefs.current[digitIdx] = ref; }}
                              value={val === ' ' ? '' : val}
                              onChangeText={(text) => handleSellerCodeChange(digitIdx, text)}
                              onKeyPress={({ nativeEvent }) => handleSellerKeyPress(digitIdx, nativeEvent.key)}
                              keyboardType="numeric"
                              maxLength={1}
                              style={{ padding: 0, textAlignVertical: 'center', includeFontPadding: false }}
                              className="w-12 h-12 bg-white border border-slate-200 rounded-[12px] text-center text-[18px] font-black text-slate-800"
                            />
                          );
                        })}
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          const rawId = order.id.replace('pickup-', '').replace('drop-', '');
                          const entered = sellerEnteredCode.replace(/\s/g, '');
                          if (!entered || entered.length !== 4) {
                            Alert.alert("Error", "Please enter a 4-digit verification code.");
                            return;
                          }
                          try {
                            const codesMap: Record<number, string> = {};
                            products.forEach((p: any) => {
                              codesMap[p.itemId] = entered;
                            });
                            await axiosInstance.post(`/orders/new/pickup/${rawId}/verify-codes`, {
                              codes: codesMap
                            });
                            await refreshOrdersList();
                            Toast.show({
                              type: 'success',
                              text1: 'Verified Successfully',
                              text2: 'Order verified successfully'
                            });
                          } catch (err: any) {
                            console.error('Error verifying code:', err);
                            const msg = err.response?.data?.message || 'Invalid code. Please try again.';
                            Alert.alert('Verification Failed', msg);
                          }
                        }}
                        className="bg-[#073318] px-4 py-2 rounded-[10px] items-center justify-center shadow-sm"
                      >
                        <Text className="text-[12px] font-bold text-white">Verify</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )
          )
        ) : (activeType === 'seller' || activeType === 'buyer') ? (
          <View className="bg-white border border-[#E2E8F0] rounded-[16px] p-4 mx-2 my-2 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
                <Ionicons name="keypad-outline" size={16} color="#073318" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-black text-[#111827]">
                  {isDeliveryPhase ? "Delivery Verification" : "Seller Pickup Verification"}
                </Text>
                <Text className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {isDeliveryPhase 
                    ? "Generate or enter verification code to confirm delivery." 
                    : "Generate or enter verification code to confirm pickup from seller."}
                </Text>
              </View>
            </View>

            {!deliveryCodeGenerated ? (
              <TouchableOpacity onPress={async () => {
                try {
                  const rawId = order.id.replace('pickup-', '').replace('drop-', '');
                  const res = await axiosInstance.post(`/orders/new/pickup/${rawId}/generate-code`);
                  await refreshOrdersList();
                  Toast.show({
                    type: 'success',
                    text1: 'Code Generated',
                    text2: `Verification code generated successfully`
                  });
                } catch (err) {
                  console.error('Error generating code:', err);
                  Alert.alert('Error', 'Failed to generate verification code. Please try again.');
                }
              }} className="bg-[#073318] h-12 rounded-[12px] flex-row items-center justify-center shadow-sm">
                <Text className="text-[14px] font-bold text-white">Generate Code</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-col gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] font-black text-[#111827]">Verification Code: {products[0]?.verificationCode || ''}</Text>
                  {deliveryCodeVerified ? (
                    <View className="bg-[#ECFDF5] border border-[#D1FAE5] px-3 py-1.5 rounded-[8px] flex-row items-center">
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text className="text-[12px] font-bold text-[#059669] ml-1">Verified</Text>
                    </View>
                  ) : null}
                </View>
                
                {!deliveryCodeVerified && (
                  <View className="flex-row items-center justify-between mt-1">
                    <View className="flex-row gap-2">
                      {[0, 1, 2, 3].map((digitIdx) => {
                        const val = (sellerEnteredCode || '')[digitIdx] || '';
                        return (
                          <TextInput
                            key={digitIdx}
                            ref={(ref) => { sellerInputRefs.current[digitIdx] = ref; }}
                            value={val === ' ' ? '' : val}
                            onChangeText={(text) => handleSellerCodeChange(digitIdx, text)}
                            onKeyPress={({ nativeEvent }) => handleSellerKeyPress(digitIdx, nativeEvent.key)}
                            keyboardType="numeric"
                            maxLength={1}
                            style={{ padding: 0, textAlignVertical: 'center', includeFontPadding: false }}
                            className="w-12 h-12 bg-white border border-slate-200 rounded-[12px] text-center text-[18px] font-black text-slate-800"
                          />
                        );
                      })}
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        const rawId = order.id.replace('pickup-', '').replace('drop-', '');
                        const entered = sellerEnteredCode.replace(/\s/g, '');
                        if (!entered || entered.length !== 4) {
                          Alert.alert("Error", "Please enter a 4-digit verification code.");
                          return;
                        }
                        try {
                          const codesMap: Record<number, string> = {};
                          products.forEach((p: any) => {
                            codesMap[p.itemId] = entered;
                          });
                          await axiosInstance.post(`/orders/new/pickup/${rawId}/verify-codes`, {
                            codes: codesMap
                          });
                          await refreshOrdersList();
                          Toast.show({
                            type: 'success',
                            text1: 'Verified Successfully',
                            text2: 'Order verified successfully'
                          });
                        } catch (err: any) {
                          console.error('Error verifying code:', err);
                          const msg = err.response?.data?.message || 'Invalid code. Please try again.';
                          Alert.alert('Verification Failed', msg);
                        }
                      }}
                      className="bg-[#073318] px-4 py-2 rounded-[10px] items-center justify-center shadow-sm"
                    >
                      <Text className="text-[12px] font-bold text-white">Verify</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* Action Buttons Row */}
        {(!order.isRejectedDelivery && order.status !== 'REJECTED') && (
          <View className="flex-row mx-2 mt-3.5 mb-3 gap-3">
            {/* Reschedule Button Area */}
            <View className="flex-1 justify-end" pointerEvents={(showRescheduleTimer && rescheduleExpired) ? 'none' : 'auto'}>
              {showRescheduleTimer && order.acceptedAt && !isNaN(new Date(order.acceptedAt).getTime()) && (
                <View className="mb-2">
                  {rescheduleExpired ? (
                    <Text className="text-[12px] font-bold text-red-500 text-center mb-1">
                      Reschedule Window Expired
                    </Text>
                  ) : (
                    <>
                      <Text className="text-[10px] font-bold text-slate-500 text-center">
                        Reschedule Available
                      </Text>
                      <Text className="text-[13px] font-black text-[#073318] text-center mb-1.5 mt-0.5" style={{ fontVariant: ['tabular-nums'] }}>
                        {rescheduleTimeLeft !== null ? formatTimeLeft(rescheduleTimeLeft) : '02:00:00'}
                      </Text>
                      <View className="h-1 bg-slate-100 rounded-full w-full overflow-hidden mx-auto max-w-[120px]">
                        <View className="h-full bg-[#059669] rounded-full" style={{ width: `${rescheduleProgress}%` }} />
                      </View>
                    </>
                  )}
                </View>
              )}
              <TouchableOpacity
                onPress={() => setRescheduleReasonModalVisible(true)}
                disabled={isSubmitting || (showRescheduleTimer && rescheduleExpired)}
                className={`border h-12 rounded-[16px] flex-row items-center justify-center ${isSubmitting || (showRescheduleTimer && rescheduleExpired) ? 'bg-[#F8FAFC] border-[#CBD5E1]' : 'bg-white border-[#073318]'}`}
                style={{ opacity: (showRescheduleTimer && rescheduleExpired) ? 0.5 : 1 }}
              >
                <Ionicons name="calendar-outline" size={16} color={isSubmitting || (showRescheduleTimer && rescheduleExpired) ? "#94A3B8" : "#073318"} />
                <Text className={`text-[14px] font-bold ml-2 ${isSubmitting || (showRescheduleTimer && rescheduleExpired) ? 'text-[#94A3B8]' : 'text-[#073318]'}`}>
                  {t("su_reschedule_401") || "Reschedule"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reject Order Button Area */}
            <View className="flex-1 justify-end" pointerEvents={isDeliveryPhase ? 'none' : 'auto'}>
              <TouchableOpacity
                onPress={handleRejectOrder}
                disabled={isSubmitting || isDeliveryPhase}
                className={`border h-12 rounded-[16px] flex-row items-center justify-center ${isSubmitting ? 'bg-[#FEE2E2] border-[#FCA5A5]' : 'bg-[#FEF2F2] border-[#FECACA]'}`}
                style={isDeliveryPhase ? { opacity: 0.5 } : {}}
              >
                <Ionicons name="close" size={16} color={isSubmitting ? "#FCA5A5" : "#DC2626"} />
                <Text className={`text-[14px] font-bold ml-2 ${isSubmitting ? 'text-[#FCA5A5]' : 'text-[#DC2626]'}`}>{t("su_reject_order_356") || "Reject Order"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Submit Order full-width button */}
        <TouchableOpacity 
          onPress={handleSubmitOrder} 
          disabled={isSubmitDisabled} 
          className={`mx-2 mb-2 h-12 rounded-[16px] flex-row items-center justify-center shadow-sm ${isSubmitDisabled ? 'bg-[#86A691]' : 'bg-[#073318]'}`}>
          {isSubmitting ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="checkmark-circle-outline" size={16} color="white" />}
          <Text className="text-[14px] font-bold text-white ml-2">
            {isSubmitting
              ? (t("su_submitting_order") || "Submitting Order...")
              : (order.isRejectedDelivery
                ? (t("su_confirm_return_delivery") || "Confirm Return Delivery")
                : (isDeliveryPhase ? t("su_submit_delivery") || "Submit Delivery" : t("su_submit_order_357") || "Submit Order"))}
          </Text>
        </TouchableOpacity>

          <View className="h-32" />
        </ScrollView>

        {/* Photo Preview Modal */}
        <Modal visible={previewVisible} transparent={false} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
          <SafeAreaView className="flex-1 bg-black justify-between p-6">
            <View className="items-center justify-center flex-1 my-4">
              {tempPhotoUri ? <Image source={{
                uri: tempPhotoUri
              }} className="w-full h-[75%] rounded-[20px]" style={{
                resizeMode: 'contain'
              }} /> : null}
            </View>

            <View className="gap-3 pb-8">
              {/* Retake Photo Button */}
              <TouchableOpacity onPress={openCamera} className="bg-white/20 border border-white/30 h-12 rounded-[16px] flex-row items-center justify-center active:bg-white/30">
                <Ionicons name="camera-outline" size={16} color="white" />
                <Text className="text-[14px] font-bold text-white ml-2">{t("su_retake_photo_358")}</Text>
              </TouchableOpacity>

              {/* Done Button */}
              <TouchableOpacity onPress={() => {
                setCapturedPhotoUri(tempPhotoUri);
                setPreviewVisible(false);
                if (isActive && currentStep?.id === 'capture_photos_button') {
                  nextStep();
                }
              }} className="bg-[#073318] h-12 rounded-[16px] flex-row items-center justify-center active:bg-[#052210] shadow-md">
                <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                <Text className="text-[14px] font-bold text-white ml-2">{t("su_done_359")}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Scanner Modal */}
        <Modal visible={scannerModalVisible} transparent={false} animationType="slide" onRequestClose={() => setScannerModalVisible(false)}>
          <SafeAreaView className="flex-1 bg-black justify-between p-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mt-2 px-2">
              <TouchableOpacity onPress={() => setScannerModalVisible(false)} className="w-11 h-11 bg-white/10 rounded-full items-center justify-center border border-white/20">
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-[18px] font-black text-white text-center flex-1 mr-11">{t("su_verify_products_360")}</Text>
            </View>

            {/* Viewfinder Area */}
            <View className="items-center justify-center flex-1 my-4">
              <View className="w-[260px] h-[260px] relative justify-center items-center">
                {/* Corner brackets */}
                {/* Top Left */}
                <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#059669] rounded-tl-[12px]" />
                {/* Top Right */}
                <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#059669] rounded-tr-[12px]" />
                {/* Bottom Left */}
                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#059669] rounded-bl-[12px]" />
                {/* Bottom Right */}
                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#059669] rounded-br-[12px]" />

                {/* Central scanning grid area / transparent frame */}
                <View className="w-[240px] h-[240px] bg-white/5 rounded-[8px] overflow-hidden justify-center items-center">
                  {scanningStatus === 'scanning' ? <>
                    <Animated.View style={{
                      transform: [{
                        translateY
                      }],
                      width: '100%',
                      height: 3,
                      backgroundColor: '#EF4444',
                      position: 'absolute',
                      top: 0,
                      shadowColor: '#EF4444',
                      shadowOffset: {
                        width: 0,
                        height: 4
                      },
                      shadowOpacity: 0.8,
                      shadowRadius: 5,
                      elevation: 5
                    }} />
                    <Ionicons name="qr-code-outline" size={80} color="rgba(255,255,255,0.15)" />
                  </> : <View className="items-center justify-center">
                    <View className="w-16 h-16 bg-[#059669]/20 rounded-full items-center justify-center mb-3">
                      <Ionicons name="checkmark" size={32} color="#10B981" />
                    </View>
                    <Text className="text-white text-[16px] font-black">{t("su_scan_successful_361")}</Text>
                  </View>}
                </View>
              </View>

              {/* Instruction Text */}
              <Text className="text-[14px] font-bold text-white/70 mt-8 text-center px-6">
                {scanningStatus === 'scanning' ? (t('su_align_barcode') || "Align the barcode/QR code within the frame to verify products") : (t('su_product_verified_success') || "Product verified successfully!")}
              </Text>
            </View>

            {/* Bottom actions */}
            <View className="pb-8 items-center justify-center">
              {scanningStatus === 'scanning' ? <View className="flex-row items-center gap-2 bg-white/10 px-4 py-2.5 rounded-full border border-white/10">
                <ActivityIndicator size="small" color="#059669" />
                <Text className="text-[13px] font-bold text-white ml-1">{t("su_scanning_products_362")}</Text>
              </View> : <View className="flex-row items-center gap-2 bg-[#E8F5EC] px-4 py-2.5 rounded-full border border-[#D5EFE0]">
                <Ionicons name="checkmark-circle" size={16} color="#073318" />
                <Text className="text-[13px] font-black text-[#073318] ml-1">{t("su_verification_complet_363")}</Text>
              </View>}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Reject Reason Modal */}
        <RejectReasonModal visible={rejectModalVisible} order={order} onClose={() => setRejectModalVisible(false)} onSubmit={handleRejectModalSubmit} />

        {/* Reschedule Modals */}
        <RescheduleModals
          showBottomSheet={showRescheduleBottomSheet}
          setShowBottomSheet={setShowRescheduleBottomSheet}
          rescheduleReasonModalVisible={rescheduleReasonModalVisible}
          setRescheduleReasonModalVisible={setRescheduleReasonModalVisible}
          expectedDate={(order as any).date || ''}
          onConfirm={async (date, time, reason) => {
            try {
              await rescheduleOrder(order.id, date, time, reason);
              Toast.show({
                type: 'success',
                text1: t("su_order_rescheduled_success") || "1 order rescheduled successfully",
                text2: t("su_order_has_been_updated") || "Order has been updated with the new date and time."
              });

              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('AcceptedOrders', { initialTab: isDeliveryPhase ? 'delivery' : 'pickup' });
              }
            } catch (error: any) {
              const errMsg = error.response?.data?.message || error.message || "Failed to reschedule order.";
              Toast.show({
                type: 'error',
                text1: t("error") || "Error",
                text2: errMsg
              });
            }
          }}
        />
      </SafeAreaView>;
};
      export default OrderDetailsScreen;