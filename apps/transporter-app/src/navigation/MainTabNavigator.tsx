import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated, Modal, SafeAreaView, ActivityIndicator, Alert, Vibration } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import DashboardScreen from '../screens/DashboardScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CustomTabBar from '../components/CustomTabBar';
import OrderManagementStackNavigator from './OrderManagementStackNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useOrderManagement } from '../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { Fonts } from '../constants/Colors';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refreshBatchesList } = useOrderManagement();

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
      Vibration.vibrate(100);
    } catch (e) {
      console.log("Vibration error:", e);
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
          t('common.error') || "Error",
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

      const res = await api.post('/qr/verify', {
        parcelId,
        verificationToken,
        userRole: 'TRANSPORTER'
      });

      await refreshBatchesList();

      Alert.alert(
        "Verification Successful",
        res.data?.message || 'Product verified successfully via QR!',
        [
          {
            text: "OK",
            onPress: () => {
              setScannerModalVisible(false);
              setScanned(false);
              isScanningRef.current = false;
            }
          }
        ]
      );

    } catch (err: any) {
      console.error("Verification error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to verify QR code.";
      Alert.alert(
        t('common.error') || "Verification Failed",
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
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={DashboardScreen}
          options={{
            tabBarLabel: t('tabs.home')
          }}
        />

        <Tab.Screen 
          name="Order Management" 
          component={OrderManagementStackNavigator}
          options={{
            tabBarLabel: t('tabs.orderMgmt')
          }}
        />
        <Tab.Screen 
          name="Order History" 
          component={OrderHistoryScreen}
          options={{
            tabBarLabel: t('tabs.history')
          }}
        />
      </Tab.Navigator>

      {/* Global Floating Action Button */}
      <View
        style={{
          position: 'absolute',
          bottom: Math.max(insets.bottom + verticalScale(84), verticalScale(96)),
          alignSelf: 'center',
          zIndex: 9999,
        }}
      >
        <TouchableOpacity
          onPress={() => setScannerModalVisible(true)}
          activeOpacity={0.85}
          style={{
            width: scale(60),
            height: scale(60),
            borderRadius: scale(30),
            backgroundColor: '#B2D534',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: verticalScale(4) },
            shadowOpacity: 0.3,
            shadowRadius: scale(5),
            elevation: moderateScale(8),
            borderWidth: 4,
            borderColor: '#FFFFFF',
          }}
        >
          <Ionicons name="scan" size={scale(26)} color="#073318" />
        </TouchableOpacity>
      </View>

      {/* Global Scanner Modal */}
      <Modal visible={scannerModalVisible} transparent={false} animationType="slide" onRequestClose={() => setScannerModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'space-between', padding: scale(24) }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: verticalScale(8) }}>
            <TouchableOpacity onPress={() => setScannerModalVisible(false)} style={{ width: scale(44), height: scale(44), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: scale(22), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name="close" size={scale(24)} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ fontFamily: Fonts.bold, fontSize: moderateScale(18), color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: scale(44) }}>Verify Products</Text>
          </View>

          {/* Viewfinder Area */}
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, marginVertical: verticalScale(16) }}>
            <View style={{ width: scale(260), height: scale(260), position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
              {/* Corner brackets */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: scale(32), height: scale(32), borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#059669', borderTopLeftRadius: scale(12) }} />
              <View style={{ position: 'absolute', top: 0, right: 0, width: scale(32), height: scale(32), borderTopWidth: 4, borderRightWidth: 4, borderColor: '#059669', borderTopRightRadius: scale(12) }} />
              <View style={{ position: 'absolute', bottom: 0, left: 0, width: scale(32), height: scale(32), borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#059669', borderBottomLeftRadius: scale(12) }} />
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: scale(32), height: scale(32), borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#059669', borderBottomRightRadius: scale(12) }} />

              {/* Central scanning grid area / transparent frame */}
              <View style={{ width: scale(240), height: scale(240), backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: scale(8), overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                {scanningStatus === 'scanning' ? <>
                  {permission?.granted ? (
                    <CameraView
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      facing="back"
                      onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                      barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                      }}
                    />
                  ) : (
                    <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#059669', paddingHorizontal: scale(12), paddingVertical: verticalScale(6), borderRadius: scale(8) }}>
                      <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: moderateScale(11) }}>Grant Permission</Text>
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
                </> : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,150,105,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: scale(64), height: scale(64), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: scale(32), alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(12) }}>
                    <Ionicons name="checkmark" size={scale(32)} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: moderateScale(16), fontFamily: Fonts.bold }}>Scan Successful</Text>
                </View>}
              </View>
            </View>

            {/* Instruction Text */}
            <Text style={{ fontFamily: Fonts.bold, fontSize: moderateScale(14), color: 'rgba(255,255,255,0.7)', marginTop: verticalScale(32), textAlign: 'center', paddingHorizontal: scale(24) }}>
              {scanningStatus === 'scanning' 
                ? "Align the barcode/QR code within the frame to verify products" 
                : "Product verified successfully!"}
            </Text>
          </View>

          {/* Bottom actions */}
          <View style={{ pb: verticalScale(32), alignItems: 'center', justifyContent: 'center' }}>
            {scanningStatus === 'scanning' ? <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(20), borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={{ fontFamily: Fonts.bold, fontSize: moderateScale(13), color: '#FFFFFF', marginLeft: scale(8) }}>Scanning...</Text>
            </View> : <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5EC', paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(20), borderWidth: 1, borderColor: '#D5EFE0' }}>
              <Ionicons name="checkmark-circle" size={scale(16)} color="#073318" />
              <Text style={{ fontFamily: Fonts.bold, fontSize: moderateScale(13), color: '#073318', marginLeft: scale(8) }}>Verification Complete</Text>
            </View>}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default MainTabNavigator;
