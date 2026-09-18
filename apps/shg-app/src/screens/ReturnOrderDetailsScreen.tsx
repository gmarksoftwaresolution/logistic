import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';
import { useOrders } from '../context/OrderContext';
import { ReturnOtpModal } from '../components/ReturnOtpModal';
import { SellerDeliveryOtpModal } from '../components/SellerDeliveryOtpModal';
import { TrackingHistoryModal } from '../components/TrackingHistoryModal';
import { ConfirmModal } from '../components/ConfirmModal';
import Toast from 'react-native-toast-message';

export const ReturnOrderDetailsScreen = ({ route, navigation }: any) => {
  const { order } = route.params || {};
  const context = useContext(LanguageContext);
  const { receiveOrder, deliverOrder } = useOrders();
  const { t } = context || { t: (s: string) => s };

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [sellerOtpModalVisible, setSellerOtpModalVisible] = useState(false);

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center p-6">
        <Text className="text-slate-500 font-bold text-base">Order details not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 px-4 py-2 bg-[#073318] rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const cleanOrderId = (order.orderId || order.id || '').replace(/^ORD-/, '').replace(/^pickup-/, '').replace(/^drop-/, '');
  const formattedOrderId = `#ORD-${cleanOrderId}`;
  const seller = order.seller || {};
  const buyer = order.buyer || {};
  const items = order.items || order.parcels || order.products || [];

  const buyerName = buyer.buyerName || order.buyerName || 'Pooja More';
  const buyerMobile = buyer.mobileNumber || buyer.phoneNumber || order.mobile || order.buyerMobile || '9988700002';
  const buyerVillage = buyer.village || order.buyerVillage || 'Gadhinglaj';
  const buyerAddress = buyer.addressLine1 || buyer.fullAddress || order.buyerAddress || 'Gadhinglaj Main Road';

  const sellerName = seller.sellerName || seller.name || order.sellerName || 'Seller';
  const sellerMobile = seller.mobileNumber || seller.phoneNumber || order.sellerMobile || 'N/A';
  const sellerVillage = seller.village || order.sellerVillage || 'Seller Village';
  const sellerAddress = seller.addressLine1 || seller.fullAddress || order.sellerAddress || 'Seller Address';

  // Return leg classification based on actual status
  const isSecondLegReturnDrop = ['DISPATCHED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG'].includes(order.mainStatus || order.status || '');
  const isFirstLegPostPickup = !isSecondLegReturnDrop && (['RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB'].includes(order.mainStatus) || order.pickupShgStatus === 'PICKED');
  const isSecondLegAtDropShg = order.mainStatus === 'PARCEL_AT_DROP_SHG' || (isSecondLegReturnDrop && (order.dropShgStatus === 'PICKED' || order.status === 'PickedUp'));
  const isSecondLegPrePickup = isSecondLegReturnDrop && !isSecondLegAtDropShg;
  const isFirstLegPrePickup = !isSecondLegReturnDrop && !isFirstLegPostPickup;

  const handleCall = (phoneNumber: string) => {
    if (phoneNumber && phoneNumber !== 'N/A') {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    try {
      await receiveOrder(order, otp);
      Toast.show({
        type: 'success',
        text1: 'Pickup Verified Successfully',
        text2: 'Order parcel received from Buyer and moved to Drop (Return).',
      });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ReturnedOrders');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'OTP Verification failed';
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: Array.isArray(msg) ? msg[0] : msg,
      });
    }
  };

  const handleConfirmDropPickup = async () => {
    try {
      await receiveOrder(order);
      setConfirmModalVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Pickup Confirmed',
        text2: 'Parcel received from Transporter and moved to Drop (Return).',
      });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ReturnedOrders');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to complete pickup';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: Array.isArray(msg) ? msg[0] : msg,
      });
    }
  };

  const handleVerifySellerDeliveryOtp = async (otp: string) => {
    await deliverOrder(order, otp);
    setSellerOtpModalVisible(false);
    Toast.show({
      type: 'success',
      text1: 'Return Delivered',
      text2: 'Return order delivered to seller and moved to Completed section.',
    });
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('ReturnedOrders');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Capsule Header matching OrderDetailsScreen style */}
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('ReturnedOrders');
            }
          }}
          className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100"
          style={{ elevation: 2 }}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1 ml-4 bg-[#F0FDF4] px-4 py-2.5 rounded-[24px] border border-[#DCFCE7] flex-row justify-between items-center shadow-sm" style={{ elevation: 1 }}>
          <View className="flex-1 pr-2">
            <Text className="text-[16px] font-black text-[#111827] mb-0.5">Return Order Details</Text>
            <Text className="text-[11px] font-bold text-[#059669]" numberOfLines={1}>Batch {formattedOrderId}</Text>
          </View>
          <TouchableOpacity className="w-8 h-8 bg-white rounded-full items-center justify-center border border-[#DCFCE7] shadow-sm">
            <Ionicons name="help" size={16} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Vertically Scrollable Content */}
      <ScrollView
        className="flex-1 px-6 pt-3"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Main Return Order Banner Card - Green Theme */}
        <View
          className="bg-[#073318] rounded-[28px] p-5 mb-6"
          style={{
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-[12px] bg-white/10 border border-white/20 items-center justify-center mr-3">
                <Ionicons name="cube-outline" size={22} color="#B2D534" />
              </View>
              <Text className="text-[18px] font-black text-white tracking-wide">{formattedOrderId}</Text>
            </View>
            <View className="bg-[#B2D534]/20 px-3 py-1 rounded-full border border-[#B2D534]/40">
              <Text className="text-[10px] font-black text-[#B2D534] tracking-wider uppercase">
                {isSecondLegReturnDrop ? 'RETURN DELIVERY' : 'RETURN PICKUP'}
              </Text>
            </View>
          </View>

          {/* Route Section */}
          <View className="flex-row items-center justify-between py-3 border-t border-b border-white/10 my-2">
            <View className="flex-1 pr-2">
              <Text className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">
                {isSecondLegReturnDrop ? 'FROM (HUB)' : 'FROM (BUYER)'}
              </Text>
              <Text className="text-[14px] font-black text-white" numberOfLines={1}>
                {isSecondLegReturnDrop ? 'GMU Hub' : buyerName}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#B2D534" />
            <View className="flex-1 pl-2 items-end">
              <Text className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">
                {isSecondLegReturnDrop ? 'TO (SELLER)' : 'TO (HUB)'}
              </Text>
              <Text className="text-[14px] font-black text-white" numberOfLines={1}>
                {isSecondLegReturnDrop ? sellerName : 'GMU Hub'}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View className="flex-row gap-3 mt-2">
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
              <Text className="text-[14px] font-black text-white mt-1">{items.length || order.productCount || 1}</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5">Items</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
              <Text className="text-[14px] font-black text-white mt-1">{order.totalWeight || order.parcelWeight || order.weight || '0'} kg</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5">Total Weight</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Ionicons name="refresh-circle-outline" size={16} color="#B2D534" />
              <Text className="text-[13px] font-black text-[#B2D534] mt-1">Return</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5">Type</Text>
            </View>
          </View>
        </View>

        {/* Tracking History Accordion Button */}
        <TouchableOpacity
          onPress={() => setShowTrackingModal(true)}
          activeOpacity={0.8}
          className="bg-[#073318] p-4 rounded-[24px] flex-row justify-between items-center mb-6 border border-[#073318]"
          style={{
            shadowColor: '#073318',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-full bg-[#B2D534]/20 items-center justify-center mr-3 border border-[#B2D534]/30">
              <Ionicons name="location-sharp" size={20} color="#B2D534" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-black text-white tracking-wide">TRACKING HISTORY</Text>
              <Text className="text-[11px] font-medium text-white/70">View return audit logs & status progress</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#B2D534" />
        </TouchableOpacity>

        {/* Party Details Card (Buyer for Leg 1, Seller for Leg 2) */}
        <View
          className="bg-white rounded-[28px] p-5 mb-6 border border-[#F1F5F9]"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row justify-between items-center pb-4 border-b border-slate-100 mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-[#F8FAFC] items-center justify-center mr-2.5 border border-slate-100">
                <Ionicons name="person-circle-outline" size={18} color="#073318" />
              </View>
              <Text className="text-[15px] font-black text-[#111827]">
                {isSecondLegReturnDrop ? 'Seller Return Delivery Details' : 'Buyer Return Details'}
              </Text>
            </View>
            {(isSecondLegReturnDrop ? sellerMobile : buyerMobile) !== 'N/A' && (
              <TouchableOpacity
                onPress={() => handleCall(isSecondLegReturnDrop ? sellerMobile : buyerMobile)}
                className="bg-[#E8F5EC] px-3 py-1.5 rounded-[10px] flex-row items-center border border-[#D5EFE0]"
              >
                <Ionicons name="call-outline" size={14} color="#073318" />
                <Text className="text-[12px] font-black text-[#073318] ml-1.5">Call</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
              <Text className="text-[12px] font-semibold text-slate-500">
                {isSecondLegReturnDrop ? 'Seller Name' : 'Buyer Name'}
              </Text>
              <Text className="text-[13px] font-extrabold text-slate-800">
                {isSecondLegReturnDrop ? sellerName : buyerName}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
              <Text className="text-[12px] font-semibold text-slate-500">Mobile Number</Text>
              <Text className="text-[13px] font-extrabold text-slate-800">
                {isSecondLegReturnDrop ? sellerMobile : buyerMobile}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
              <Text className="text-[12px] font-semibold text-slate-500">Village</Text>
              <Text className="text-[13px] font-extrabold text-slate-800">
                {isSecondLegReturnDrop ? sellerVillage : buyerVillage}
              </Text>
            </View>

            <View className="flex-row justify-between items-start py-2">
              <Text className="text-[12px] font-semibold text-slate-500">Full Address</Text>
              <Text className="text-[13px] font-extrabold text-slate-800 flex-1 text-right ml-4 leading-snug">
                {isSecondLegReturnDrop ? sellerAddress : buyerAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Products for Collection Card */}
        <View
          className="bg-white rounded-[28px] p-5 mb-6 border border-[#F1F5F9]"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2.5 border border-[#D5EFE0]">
              <Ionicons name="cube-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">
              Products for {isSecondLegReturnDrop ? 'Delivery' : 'Collection'} ({items.length})
            </Text>
          </View>

          {items.length === 0 ? (
            <View className="py-4 items-center justify-center">
              <Text className="text-[12px] font-semibold text-slate-400">No product details available.</Text>
            </View>
          ) : (
            items.map((item: any, idx: number) => (
              <View
                key={idx}
                className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 my-1.5 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center mr-3 border border-amber-200">
                    <Feather name="package" size={16} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-black text-slate-800" numberOfLines={1}>
                      {item.productName || item.name || item.product?.name || order.parcelName || 'Return Item'}
                    </Text>
                    <Text className="text-[11px] font-medium text-slate-500">
                      Qty: {item.quantity || item.qty || 1} • {item.weight || order.weight || '1'} kg
                    </Text>
                  </View>
                </View>
                <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Text className="text-[10px] font-black text-emerald-700 uppercase">Return Ready</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Dynamic Action Buttons based on Leg and Status */}
        {isFirstLegPrePickup && (
          <TouchableOpacity
            onPress={() => setOtpModalVisible(true)}
            activeOpacity={0.85}
            className="w-full bg-[#073318] py-4 rounded-[22px] flex-row items-center justify-center shadow-lg border border-[#073318] mb-4"
            style={{
              shadowColor: '#073318',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-[15px] tracking-wide">Pickup (OTP) Verification</Text>
          </TouchableOpacity>
        )}

        {isFirstLegPostPickup && (
          <View className="bg-emerald-50 border border-emerald-200 rounded-[22px] p-4 items-center justify-center mb-4">
            <View className="flex-row items-center mb-1">
              <Ionicons name="checkmark-circle" size={18} color="#059669" style={{ marginRight: 6 }} />
              <Text className="text-[14px] font-black text-emerald-800">Parcel at SHG</Text>
            </View>
            <Text className="text-[12px] font-medium text-emerald-700 text-center">
              Parcel received from Buyer. Waiting for Transporter pickup to GMU Hub.
            </Text>
          </View>
        )}

        {isSecondLegPrePickup && (
          <TouchableOpacity
            onPress={() => setConfirmModalVisible(true)}
            activeOpacity={0.85}
            className="w-full bg-[#073318] py-4 rounded-[22px] flex-row items-center justify-center shadow-lg border border-[#073318] mb-4"
            style={{
              shadowColor: '#073318',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-[15px] tracking-wide">Confirm Pickup</Text>
          </TouchableOpacity>
        )}

        {isSecondLegAtDropShg && (
          <TouchableOpacity
            onPress={() => setSellerOtpModalVisible(true)}
            activeOpacity={0.85}
            className="w-full bg-[#059669] py-4 rounded-[22px] flex-row items-center justify-center shadow-lg border border-[#059669] mb-4"
            style={{
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons name="bicycle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-[15px] tracking-wide">Drop / Deliver to Seller</Text>
          </TouchableOpacity>
        )}

        {/* Bottom Spacer */}
        <View className="h-28" />
      </ScrollView>

      {/* Leg 1: Buyer Return OTP Modal */}
      <ReturnOtpModal
        visible={otpModalVisible}
        onClose={() => setOtpModalVisible(false)}
        onVerify={handleVerifyOtp}
        orderIdText={formattedOrderId}
        buyerMobile={buyerMobile}
      />

      {/* Leg 2: Transporter to SHG Confirm Modal */}
      <ConfirmModal
        visible={confirmModalVisible}
        title="Confirm Pickup"
        message="Are you sure you want to pickup?"
        confirmText="Submit"
        cancelText="Cancel"
        onCancel={() => setConfirmModalVisible(false)}
        onConfirm={handleConfirmDropPickup}
      />

      {/* Leg 2: Seller Delivery OTP Modal */}
      <SellerDeliveryOtpModal
        visible={sellerOtpModalVisible}
        onClose={() => setSellerOtpModalVisible(false)}
        onVerify={handleVerifySellerDeliveryOtp}
        orderIdText={formattedOrderId}
        sellerMobile={sellerMobile || order?.sellerMobile || order?.seller?.mobileNumber || order?.seller?.phoneNumber || ''}
      />

      {/* Tracking Modal */}
      <TrackingHistoryModal
        visible={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        order={order}
        role="SHG"
      />
    </SafeAreaView>
  );
};

export default ReturnOrderDetailsScreen;

