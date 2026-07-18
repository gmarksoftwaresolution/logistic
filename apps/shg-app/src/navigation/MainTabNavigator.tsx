import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, Animated, Modal, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalkthroughElement from '../components/WalkthroughElement';
import { StepId } from '../context/OnboardingContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import axiosInstance from '../api/axiosInstance';
import { useOrders } from '../context/OrderContext';

import { MainTabParamList, OrdersStackParamList } from './types';

// Screen Imports
import DashboardScreen from '../screens/DashboardScreen';
import OrderManagementScreen from '../screens/OrderManagementScreen';
import StockManagementScreen from '../screens/StockManagementScreen';
import CompletedOrdersScreen from '../screens/CompletedOrdersScreen';
import OrderHistoryScreen from '../modules/order-history/screens/OrderHistoryScreen';
import IncomingOrdersScreen from '../screens/IncomingOrdersScreen';
import AcceptedOrdersScreen from '../screens/AcceptedOrdersScreen';
import DeliveryScreen from '../screens/DeliveryScreen';
import RejectedOrdersScreen from '../screens/RejectedOrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import CompletedOrderDetailsScreen from '../screens/CompletedOrderDetailsScreen';
import VehicleSuggestionDetailsScreen from '../screens/VehicleSuggestionDetailsScreen';
import ReturnedOrdersScreen from '../screens/ReturnedOrdersScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator<MainTabParamList>();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const context = useContext(LanguageContext);
  if (!context) return null;
  const { t } = context;

  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (containerWidth > 0) {
      const tabWidth = containerWidth / 5;
      const targetValue = state.index * tabWidth;
      Animated.spring(translateX, {
        toValue: targetValue,
        stiffness: 120,
        damping: 18,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, containerWidth]);

  const indicatorWidth = 32;
  const tabWidth = containerWidth > 0 ? containerWidth / 5 : 0;
  // Center the horizontal pill indicator inside the first tab space initially
  const indicatorLeft = tabWidth > 0 ? (tabWidth / 2 - indicatorWidth / 2) : 0;

  return (
    <View 
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        setContainerWidth(width);
      }}
      className="absolute left-5 right-5 h-[72px] bg-white border border-[#E2F0E7] flex-row justify-around items-center rounded-[32px] shadow-lg"
      style={{
        bottom: Math.max(insets.bottom + 12, 24),
        elevation: 8,
        shadowColor: '#073318',
        shadowOffset: {
          width: 0,
          height: 6
        },
        shadowOpacity: 0.12,
        shadowRadius: 10
      }}
    >
      {containerWidth > 0 && (
        <Animated.View 
          style={{
            position: 'absolute',
            top: 0,
            width: indicatorWidth,
            height: 4,
            backgroundColor: '#073318',
            borderRadius: 2,
            left: indicatorLeft,
            transform: [{ translateX }],
          }}
        />
      )}

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: any;
        let displayLabel: string;
        let IconComponent: any = Ionicons;
        let stepId: StepId = 'dashboard_tab';

        if (route.name === 'Dashboard') {
          iconName = isFocused ? 'grid' : 'grid-outline';
          displayLabel = t('home') || 'Home';
          stepId = 'dashboard_tab';
        } else if (route.name === 'Orders') {
          IconComponent = MaterialCommunityIcons;
          iconName = isFocused ? 'truck' : 'truck-outline';
          displayLabel = t('title_order_management') || 'Order Management';
        } else if (route.name === 'OrderHistory') {
          IconComponent = Ionicons;
          iconName = isFocused ? 'document-text' : 'document-text-outline';
          displayLabel = t('order_history') || 'Order History';
        } else if (route.name === 'Earnings') {
          IconComponent = Ionicons;
          iconName = isFocused ? 'wallet' : 'wallet-outline';
          displayLabel = t('earning') || 'Earnings';
          stepId = 'earning_tab';
        } else {
          iconName = isFocused ? 'person' : 'person-outline';
          displayLabel = t('profile') || 'Profile';
          stepId = 'profile_tab';
        }

        return (
          <Pressable
            key={index}
            onPress={onPress}
            className="items-center justify-center flex-1 h-full relative"
          >
            <View className="items-center justify-center pt-2">
              <View className={`${isFocused && route.name === 'OrderHistory' ? 'bg-[#F0FDF4] w-[46px] h-[46px] rounded-full items-center justify-center mb-0.5' : 'mb-0.5'}`}>
                <IconComponent 
                  name={iconName} 
                  size={22} 
                  color={isFocused ? "#073318" : "#94A3B8"} 
                />
              </View>
              <Text 
                numberOfLines={1}
                className={`text-[10px] text-center tracking-tight ${
                  isFocused ? 'font-black text-[#073318]' : 'font-bold text-slate-400'
                }`}
              >
                {displayLabel}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const DeliveryRedirectScreen = ({ navigation }: any) => {
  useEffect(() => {
    navigation.replace('AcceptedOrders', { initialTab: 'delivery' });
  }, [navigation]);
  return null;
};

const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();

function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrderManagement" component={OrderManagementScreen} />
      <OrdersStack.Screen name="IncomingOrders" component={IncomingOrdersScreen} options={{ gestureEnabled: false }} />
      <OrdersStack.Screen name="AcceptedOrders" component={AcceptedOrdersScreen} options={{ animation: 'none', gestureEnabled: false }} />
      <OrdersStack.Screen name="RejectedOrders" component={RejectedOrdersScreen} />
      <OrdersStack.Screen name="Delivery" component={DeliveryRedirectScreen} options={{ animation: 'none', gestureEnabled: false }} />
      <OrdersStack.Screen name="CompletedOrders" component={CompletedOrdersScreen} />
      <OrdersStack.Screen name="ReturnedOrders" component={ReturnedOrdersScreen} />
      <OrdersStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <OrdersStack.Screen name="CompletedOrderDetails" component={CompletedOrderDetailsScreen} />
      <OrdersStack.Screen name="VehicleSuggestionDetails" component={VehicleSuggestionDetailsScreen} />
    </OrdersStack.Navigator>
  );
}

export default function MainTabNavigator() {
  const context = useContext(LanguageContext);
  const { t } = context!;
  const insets = useSafeAreaInsets();
  const { refreshOrdersList } = useOrders();

  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<'scanning' | 'success'>('scanning');
  const [permission, requestPermission] = useCameraPermissions();
  const isScanningRef = useRef(false);
  const scanLaserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (scannerModalVisible) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLaserAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLaserAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      scanLaserAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [scannerModalVisible]);

  useEffect(() => {
    if (scannerModalVisible) {
      setScanned(false);
      setScanningStatus('scanning');
      isScanningRef.current = false;
      if (!permission || !permission.granted) {
        requestPermission();
      }
    }
  }, [scannerModalVisible, permission]);

  const translateY = scanLaserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isScanningRef.current) return;
    isScanningRef.current = true;
    setScanned(true);
    setScanningStatus('success');

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log("Haptics error:", e);
    }

    try {
      let parcelId = "";
      let verificationToken = "";
      
      if (data.trim().startsWith("{")) {
        const parsed = JSON.parse(data.trim());
        parcelId = parsed.parcelId;
        verificationToken = parsed.verificationToken;
      } else {
        const parts = data.trim().split(/\s+/);
        if (parts.length >= 2) {
          parcelId = parts[0];
          verificationToken = parts[1];
        } else {
          parcelId = data.trim();
        }
      }

      if (!parcelId) {
        Alert.alert(
          "Invalid QR Code",
          "This QR code does not contain a valid parcel ID.",
          [
            {
              text: "OK",
              onPress: () => {
                setScanned(false);
                setScanningStatus('scanning');
                isScanningRef.current = false;
              }
            }
          ]
        );
        return;
      }

      const res = await axiosInstance.post('/qr/verify', {
        parcelId,
        verificationToken,
        userRole: 'SHG'
      });

      await refreshOrdersList();

      Toast.show({
        type: 'success',
        text1: 'Verification Successful',
        text2: res.data?.message || 'Product verified successfully via QR!'
      });

      setTimeout(() => {
        setScannerModalVisible(false);
        setScanned(false);
        isScanningRef.current = false;
      }, 1200);

    } catch (err: any) {
      console.error("Verification error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to verify QR code.";
      Alert.alert(
        "Verification Failed",
        msg,
        [
          {
            text: "OK",
            onPress: () => {
              setScanned(false);
              setScanningStatus('scanning');
              isScanningRef.current = false;
            }
          }
        ]
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Orders" component={OrdersStackNavigator} />
        <Tab.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Tab.Screen name="Earnings" component={EarningsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Global Floating Action Button */}
      <View
        style={{
          position: 'absolute',
          bottom: Math.max(insets.bottom + 84, 96),
          alignSelf: 'center',
          zIndex: 9999,
        }}
      >
        <TouchableOpacity
          onPress={() => setScannerModalVisible(true)}
          activeOpacity={0.85}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#B2D534',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 8,
            borderWidth: 4,
            borderColor: '#FFFFFF',
          }}
        >
          <Ionicons name="scan" size={26} color="#073318" />
        </TouchableOpacity>
      </View>

      {/* Global Scanner Modal */}
      <Modal visible={scannerModalVisible} transparent={false} animationType="slide" onRequestClose={() => setScannerModalVisible(false)}>
        <SafeAreaView className="flex-1 bg-black justify-between p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mt-2 px-2">
            <TouchableOpacity onPress={() => setScannerModalVisible(false)} className="w-11 h-11 bg-white/10 rounded-full items-center justify-center border border-white/20">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-[18px] font-black text-white text-center flex-1 mr-11">{t("su_verify_products_360") || "Verify Products"}</Text>
          </View>

          {/* Viewfinder Area */}
          <View className="items-center justify-center flex-1 my-4">
            <View className="w-[260px] h-[260px] relative justify-center items-center">
              {/* Corner brackets */}
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#059669] rounded-tl-[12px]" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#059669] rounded-tr-[12px]" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#059669] rounded-bl-[12px]" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#059669] rounded-br-[12px]" />

              {/* Central scanning grid area / transparent frame */}
              <View className="w-[240px] h-[240px] bg-white/5 rounded-[8px] overflow-hidden justify-center items-center relative">
                {scanningStatus === 'scanning' ? <>
                  {permission?.granted ? (
                    <CameraView
                      style={{ width: '100%', height: '100%', position: 'absolute' }}
                      facing="back"
                      onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                      barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                      }}
                    />
                  ) : (
                    <TouchableOpacity onPress={requestPermission} className="bg-[#059669] px-4 py-2 rounded-full absolute z-10">
                      <Text className="text-white font-bold text-[13px]">Request Camera</Text>
                    </TouchableOpacity>
                  )}
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
                </> : <View className="absolute inset-0 bg-[#059669]/90 items-center justify-center">
                  <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
                    <Ionicons name="checkmark" size={32} color="#FFFFFF" />
                  </View>
                  <Text className="text-white text-[16px] font-black">{t("su_scan_successful_361") || "Scan Successful"}</Text>
                </View>}
              </View>
            </View>

            {/* Instruction Text */}
            <Text className="text-[14px] font-bold text-white/70 mt-8 text-center px-6">
              {scanningStatus === 'scanning' 
                ? (t('su_align_barcode') || "Align the barcode/QR code within the frame to verify products") 
                : (t('su_product_verified_success') || "Product verified successfully!")}
            </Text>
          </View>

          {/* Bottom actions */}
          <View className="pb-8 items-center justify-center">
            {scanningStatus === 'scanning' ? <View className="flex-row items-center gap-2 bg-white/10 px-4 py-2.5 rounded-full border border-white/10">
              <ActivityIndicator size="small" color="#059669" />
              <Text className="text-[13px] font-bold text-white ml-1">{t("su_scanning_products_362") || "Scanning..."}</Text>
            </View> : <View className="flex-row items-center gap-2 bg-[#E8F5EC] px-4 py-2.5 rounded-full border border-[#D5EFE0]">
              <Ionicons name="checkmark-circle" size={16} color="#073318" />
              <Text className="text-[13px] font-black text-[#073318] ml-1">{t("su_verification_complet_363") || "Verification Complete"}</Text>
            </View>}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
