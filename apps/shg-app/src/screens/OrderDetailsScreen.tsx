import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert, Modal, Image, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { OrdersStackParamList } from '../navigation/types';
import { LanguageContext } from '../context/LanguageContext';
import { useOrders } from '../context/OrderContext';
import { getRouteForOrder, getFormattedOrderId } from '../utils/orderHelpers';
import { RejectReasonModal } from '../components/RejectReasonModal';
import { Order } from '../context/OrderContext';
type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetails'>;
const OrderDetailsScreen: React.FC<Props> = ({
  route,
  navigation
}) => {
  const context = useContext(LanguageContext);
  const { t } = context!;

  const {
    order
  } = route.params;
  const {
    receiveOrder,
    rejectOrder,
    deliverOrder
  } = useOrders();
  const routeStr = getRouteForOrder(order);
  const routeParts = routeStr.split('>');
  const source = routeParts[0]?.trim() || 'Transporter';
  const destination = routeParts[1]?.trim() || 'Buyer';

  // 1. Determine if we are in Pickup or Delivery phase
  const isDeliveryPhase = order.status === 'Received';

  // 2. Helper to get entity type
  const getEntityType = (name: string): 'transporter' | 'seller' | 'buyer' => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('transporter')) {
      return 'transporter';
    }
    if (lowerName.includes('bank') || lowerName.includes('bekari') || lowerName.includes('buyer') || lowerName.includes('destination')) {
      return 'buyer';
    }
    return 'seller';
  };

  // 3. Resolve active side details
  const activeSideName = isDeliveryPhase ? destination : source;
  const activeType = getEntityType(activeSideName);

  // 4. Set details values dynamically
  let detailsTitle = "Transporter Details";
  let headerIcon: any = "car-outline";
  let nameLabel = "Person Name";
  let nameValue = order.transporterName || "Rahul Patil";
  let mobileLabel = "Mobile Number";
  let mobileValue = order.transporterMobile || "+91 9123456789";
  let addressOrVehicleLabel = "Vehicle Number";
  let addressOrVehicleIcon: any = "car-outline";
  let addressOrVehicleValue = order.vehicleNumber || "MH-09-AB-1234";
  if (activeType === 'seller') {
    detailsTitle = "Seller Details";
    headerIcon = "storefront-outline";
    nameLabel = "Seller Name";
    nameValue = order.transporterName || "Sanjay Desai";
    mobileLabel = "Seller Mobile Number";
    mobileValue = order.transporterMobile || "9654782390";
    addressOrVehicleLabel = "Shop Name / Seller Address";
    addressOrVehicleIcon = "location-outline";

    // Dynamic detailed address logic
    let resolvedAddress = source;
    if (source.toLowerCase().includes('hifi')) {
      resolvedAddress = "Hifi Shop, Bramhan galli, Chandgad, kolhapur, Maharastra";
    } else if (source.toLowerCase().includes('home no')) {
      resolvedAddress = "Home No. 23, Market Road, Kowad, kolhapur, Maharastra";
    } else {
      resolvedAddress = `${source}, Chandgad, kolhapur, Maharastra`;
    }
    addressOrVehicleValue = resolvedAddress;
  } else if (activeType === 'buyer') {
    detailsTitle = "Buyer Details";
    headerIcon = "person-outline";
    nameLabel = "Buyer Name";
    nameValue = destination;
    mobileLabel = "Buyer Mobile Number";
    mobileValue = order.mobile || "+91 9876543210";
    addressOrVehicleLabel = "Buyer Address";
    addressOrVehicleIcon = "location-outline";
    addressOrVehicleValue = `${destination}, Chandgad, kolhapur, Maharastra`;
  }

  // Dynamic products list matching the remainingQty length
  const productCount = order.remainingQty || 1;
  const AVAILABLE_PRODUCTS = [{
    code: '#P101',
    tag: 'Pickup Order',
    name: 'Raw Organic Turmeric Packs',
    details: '2 items • 10 kg'
  }, {
    code: '#P102',
    tag: 'Pickup Order',
    name: 'Cold Pressed Groundnut Oil',
    details: '1 item • 5 kg'
  }, {
    code: '#P103',
    tag: 'Pickup Order',
    name: 'Premium Basmati Rice Bag',
    details: '3 items • 25 kg'
  }, {
    code: '#P104',
    tag: 'Pickup Order',
    name: 'Organic Jaggery Block',
    details: '2 items • 2 kg'
  }, {
    code: '#P105',
    tag: 'Pickup Order',
    name: 'Fresh Pure Desi Ghee',
    details: '1 item • 1 kg'
  }, {
    code: '#P106',
    tag: 'Pickup Order',
    name: 'Whole Wheat Atta Bag',
    details: '1 item • 10 kg'
  }, {
    code: '#P107',
    tag: 'Pickup Order',
    name: 'Natural Honey Bottle',
    details: '4 items • 2 kg'
  }];
  const products = AVAILABLE_PRODUCTS.slice(0, productCount);
  const formattedOrderId = getFormattedOrderId(order);
  const headerTitle = isDeliveryPhase ? "Delivery Details" : "Collection Details";
  const headerSubtitle = `Batch #${formattedOrderId} • ${source}`;
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);

  // Delivery Scanner states
  const [isScanned, setIsScanned] = useState<boolean>(false);
  const [scannerModalVisible, setScannerModalVisible] = useState<boolean>(false);
  const [scanningStatus, setScanningStatus] = useState<'scanning' | 'success'>('scanning');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
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
  const handleSubmitOrder = () => {
    if (isDeliveryPhase) {
      if (!isScanned) {
        Alert.alert("Scan Required", "Please scan all products for verification first.");
        return;
      }
      deliverOrder({
        ...order,
        scanned: true
      });
    } else {
      if (!capturedPhotoUri) {
        Alert.alert("Photo Required", "Please capture product photos first.");
        return;
      }
      receiveOrder({
        ...order,
        image: capturedPhotoUri
      });
    }
    navigation.goBack();
  };
  const handleRejectOrder = () => {
    setRejectModalVisible(true);
  };
  const handleRejectModalSubmit = (ord: Order, reason: string) => {
    setRejectModalVisible(false);
    rejectOrder({
      ...ord,
      rejectReason: reason
    });
    navigation.goBack();
  };
  return <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Custom Header mimicking the SharedHeader but matching exactly the mockup layout */}
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100" style={{
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
      
      <ScrollView className="flex-1 px-6 pt-2 pb-10" showsVerticalScrollIndicator={false}>
        
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
                  {source}{t("su_transit_347")}</Text>
              </View>
            </View>
            <View className="bg-[#0D4021] border border-white/10 px-3 py-1.5 rounded-full shadow-sm flex-shrink-0">
              <Text className="text-[10px] font-black text-[#6EE7B7] uppercase tracking-wider">{order.status}</Text>
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

          <View className="flex-row gap-3">
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Text className="text-[18px] font-black text-white">{order.remainingQty || 1}</Text>
              <Text className="text-[11px] font-bold text-white/60 mt-1">{t("su_items_350")}</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Text className="text-[18px] font-black text-white">{order.weight || '10'}{t("su_kg_351")}</Text>
              <Text className="text-[11px] font-bold text-white/60 mt-1">{t("su_total_weight_352")}</Text>
            </View>
          </View>
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
          
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
              <Ionicons name={addressOrVehicleIcon} size={18} color="#073318" />
            </View>
            <View className="flex-1 justify-center mt-0.5">
              <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{addressOrVehicleLabel}</Text>
              <Text className="text-[14px] font-black text-[#111827] pr-2">
                {addressOrVehicleValue}
              </Text>
            </View>
          </View>
        </View>

        {/* Task Items / Products Header */}
        <View className="flex-row justify-between items-center mb-4 mx-1">
          <View className="flex-row items-center">
            <Ionicons name="cube-outline" size={20} color="#073318" />
            <Text className="text-[16px] font-black text-[#111827] ml-2">{t("su_products_for_collect_354")}</Text>
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
          {products.map((item, index) => {
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
                    <View className="flex-row items-center mb-1">
                      <View className="bg-[#EFF6FF] px-2 py-0.5 rounded-[4px] mr-2">
                        <Text className="text-[9px] font-bold text-[#2563EB]">{item.tag}</Text>
                      </View>
                      <Text className="text-[10px] font-bold text-[#94A3B8]">{t("su_pending_355")}</Text>
                    </View>
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

          {/* Conditional Verification Section: Scanner for Delivery flow, Capture Photos for Pickup flow */}
          {isDeliveryPhase ? (/* Scanner Section Row */
        <TouchableOpacity onPress={() => setScannerModalVisible(true)} className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 mx-2 my-2 flex-row items-center justify-between shadow-sm">
              <View className="flex-row items-center flex-1 pr-2">
                {isScanned ? <View className="w-10 h-10 rounded-full bg-[#E8F5EC] items-center justify-center mr-3">
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  </View> : <View className="w-10 h-10 rounded-full bg-[#E8F5EC] items-center justify-center mr-3">
                    <Ionicons name="scan-outline" size={18} color="#073318" />
                  </View>}
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-[#111827]">
                    {isScanned ? "Products Scanned" : "Scan Products"}
                  </Text>
                  <Text className="text-[11px] font-medium text-slate-500 mt-0.5">
                    {isScanned ? "All products verified successfully" : "Scan all products for verification"}
                  </Text>
                </View>
              </View>
              {isScanned ? <Ionicons name="checkmark-circle" size={20} color="#059669" /> : null}
            </TouchableOpacity>) : (/* Capture Photos Section Row (Pickup) */
        <TouchableOpacity onPress={openCamera} className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 mx-2 my-2 flex-row items-center justify-between shadow-sm">
              <View className="flex-row items-center flex-1 pr-2">
                {capturedPhotoUri ? <Image source={{
              uri: capturedPhotoUri
            }} className="w-10 h-10 rounded-[8px] mr-3 border border-slate-200" /> : <View className="w-10 h-10 rounded-full bg-[#E8F5EC] items-center justify-center mr-3">
                    <Ionicons name="camera-outline" size={18} color="#073318" />
                  </View>}
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-[#111827]">
                    {capturedPhotoUri ? "Photos Captured" : "Capture Photos"}
                  </Text>
                  <Text className="text-[11px] font-medium text-slate-500 mt-0.5">
                    {capturedPhotoUri ? "Photos successfully saved for verification" : "Take photos of all products for verification"}
                  </Text>
                </View>
              </View>
              {capturedPhotoUri ? <Ionicons name="checkmark-circle" size={20} color="#059669" /> : null}
            </TouchableOpacity>)}

          {/* Reject Order full-width button */}
          <TouchableOpacity onPress={handleRejectOrder} className="mx-2 mt-3.5 mb-3 bg-[#FEF2F2] border border-[#FECACA] h-12 rounded-[16px] flex-row items-center justify-center">
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text className="text-[14px] font-bold text-[#DC2626] ml-2">{t("su_reject_order_356")}</Text>
          </TouchableOpacity>

          {/* Submit Order full-width button */}
          <TouchableOpacity onPress={handleSubmitOrder} className="mx-2 mb-2 bg-[#073318] h-12 rounded-[16px] flex-row items-center justify-center shadow-sm">
            <Ionicons name="checkmark-circle-outline" size={16} color="white" />
            <Text className="text-[14px] font-bold text-white ml-2">{t("su_submit_order_357")}</Text>
          </TouchableOpacity>
        </View>
        
        <View className="h-10" />
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
              {scanningStatus === 'scanning' ? "Align the barcode/QR code within the frame to verify products" : "Product verified successfully!"}
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
    </SafeAreaView>;
};
export default OrderDetailsScreen;