import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getOrderHistoryDetails } from '../modules/order-history/services/orderHistoryService';
import { HISTORY_STATUS_COLORS } from '../modules/order-history/constants/history.constants';
import { LanguageContext } from '../context/LanguageContext';
import { TrackingHistoryModal } from '../components/TrackingHistoryModal';
import { getRouteForOrder, getFormattedOrderId, getInfoForOrder, translateRoutePart } from '../utils/orderHelpers';

export default function OrderHistoryDetailsScreen({ route, navigation }: any) {
  const { order: initialOrder } = route.params;
  const [order, setOrder] = useState<any>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const context = useContext(LanguageContext);
  const t = context?.t || ((k: string) => k);

  useEffect(() => {
    if (initialOrder?.id) {
      fetchOrderDetails();
    }
  }, [initialOrder]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const details = await getOrderHistoryDetails(initialOrder.id);
      if (details) setOrder(details);
    } catch (error) {
      console.error('Failed to fetch order details', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order.tracking && !order.items) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]">
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100 bg-white">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-100 shadow-sm">
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-[17px] font-black text-[#0F172A]">{t('order_details') || 'Order Details'}</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#073318" />
        </View>
      </SafeAreaView>
    );
  }

  const routeStr = getRouteForOrder(order);
  const routeParts = routeStr.split('>');
  const rawSource = routeParts[0]?.trim() || 'Seller';
  const rawDestination = routeParts[1]?.trim() || 'Buyer';
  const source = translateRoutePart(rawSource, t);
  const destination = translateRoutePart(rawDestination, t);
  const isDelivery = rawSource.toLowerCase() === 'transporter';
  const formattedOrderId = getFormattedOrderId(order);
  const info = getInfoForOrder(order);

  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';

  let statusColor = HISTORY_STATUS_COLORS.DEFAULT.color;
  let statusBg = HISTORY_STATUS_COLORS.DEFAULT.bg;
  let statusText = t('in_progress') || 'In Progress';

  if (isCompleted) {
    statusColor = HISTORY_STATUS_COLORS.COMPLETED.color;
    statusBg = HISTORY_STATUS_COLORS.COMPLETED.bg;
    statusText = t('completed') || 'Completed';
  } else if (isCancelled) {
    statusColor = HISTORY_STATUS_COLORS.CANCELLED.color;
    statusBg = HISTORY_STATUS_COLORS.CANCELLED.bg;
    statusText = t('cancelled') || 'Cancelled';
  }

  // Dynamic Contact Details (Seller vs Buyer)
  const sellerNameVal =
    (order.sellerName && order.sellerName !== 'undefined' ? order.sellerName : null) ||
    order.seller?.sellerName ||
    order.seller?.fullName ||
    order.seller?.name ||
    'SHG Seller Partner';

  const sellerMobileVal =
    (order.sellerMobile && order.sellerMobile !== 'undefined' ? order.sellerMobile : null) ||
    order.seller?.mobileNumber ||
    order.seller?.phoneNumber ||
    order.seller?.mobile ||
    (order.mobile && order.mobile !== 'undefined' ? order.mobile : null) ||
    'N/A';

  const sellerVillageVal =
    (order.sellerVillage && order.sellerVillage !== 'undefined' ? order.sellerVillage : null) ||
    order.seller?.village ||
    order.seller?.address?.village ||
    order.seller?.address?.district ||
    (source && source !== 'undefined' ? source : 'N/A');

  const sellerAddressVal =
    (order.sellerAddress && order.sellerAddress.length > 3 && order.sellerAddress !== 'undefined' ? order.sellerAddress : null) ||
    order.seller?.fullAddress ||
    [
      order.seller?.addressLine1 || order.seller?.address?.houseNo,
      order.seller?.village || order.seller?.address?.village,
      order.seller?.taluka || order.seller?.address?.taluka,
      order.seller?.district || order.seller?.address?.district,
      (order.seller?.pincode || order.seller?.address?.pincode) ? `- ${order.seller?.pincode || order.seller?.address?.pincode}` : ''
    ].filter(Boolean).join(', ') ||
    sellerVillageVal;

  const buyerNameVal =
    (order.buyerName && order.buyerName !== 'undefined' ? order.buyerName : null) ||
    order.buyer?.buyerName ||
    order.buyer?.fullName ||
    order.buyer?.name ||
    'Buyer Customer';

  const buyerMobileVal =
    (order.buyerMobile && order.buyerMobile !== 'undefined' ? order.buyerMobile : null) ||
    order.buyer?.mobileNumber ||
    order.buyer?.phoneNumber ||
    order.buyer?.mobile ||
    'N/A';

  const buyerVillageVal =
    (order.buyerVillage && order.buyerVillage !== 'undefined' ? order.buyerVillage : null) ||
    order.buyer?.village ||
    order.buyer?.address?.village ||
    order.buyer?.address?.district ||
    (destination && destination !== 'undefined' ? destination : 'N/A');

  const buyerAddressVal =
    (order.buyerAddress && order.buyerAddress.length > 3 && order.buyerAddress !== 'undefined' ? order.buyerAddress : null) ||
    order.buyer?.fullAddress ||
    [
      order.buyer?.addressLine1 || order.buyer?.address?.houseNo,
      order.buyer?.village || order.buyer?.address?.village,
      order.buyer?.taluka || order.buyer?.address?.taluka,
      order.buyer?.district || order.buyer?.address?.district,
      (order.buyer?.pincode || order.buyer?.address?.pincode) ? `- ${order.buyer?.pincode || order.buyer?.address?.pincode}` : ''
    ].filter(Boolean).join(', ') ||
    buyerVillageVal;

  let detailsTitle = isDelivery ? (t('su_buyer_details') || "Buyer Details") : (t('su_seller_details') || "Seller Details");
  let headerIcon: any = isDelivery ? "person-outline" : "storefront-outline";
  let nameLabel = isDelivery ? (t('su_buyer_name') || "Buyer Name") : (t('su_seller_name') || "Seller Name");
  let nameValue = isDelivery ? buyerNameVal : sellerNameVal;
  let mobileLabel = isDelivery ? (t('su_buyer_mobile_number') || "Buyer Mobile Number") : (t('su_seller_mobile_number') || "Seller Mobile Number");
  let mobileValue = isDelivery ? buyerMobileVal : sellerMobileVal;
  let villageLabel = "Village";
  let villageValue = isDelivery ? buyerVillageVal : sellerVillageVal;
  let fullAddressLabel = "Full Address";
  let fullAddressValue = isDelivery ? buyerAddressVal : sellerAddressVal;

  const handleCall = (phoneNumber: string) => {
    if (phoneNumber && phoneNumber !== 'N/A') {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const qty = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || order.remainingQty || 1;
  const amount = order.masterOrder?.totalAmount || order.totalAmount || 550.0;
  const totalWeight = order.weight || '12';

  const productsList = order.items && order.items.length > 0 ? order.items.map((item: any, idx: number) => ({
    code: item.code || item.parcelId || `PCL-00${idx + 1}`,
    name: item.name || item.productName || `Product #${idx + 1}`,
    tag: item.category || 'INSPECTED',
    details: item.details || `Qty: ${item.quantity || 1} • Weight: ${item.weight || '1'}kg`
  })) : order.products || [
    { code: 'PCL-001', name: 'Fresh Organic Produce', tag: 'INSPECTED', details: 'Qty: 1 • Weight: 5kg' }
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-100 shadow-sm mr-4">
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text className="text-[17px] font-black text-[#0F172A]">{t('order_details') || 'Order Details'}</Text>
            <Text className="text-[12px] font-medium text-slate-500 mt-0.5">{t('su_view_past_order_info_365') || 'View past order information'}</Text>
          </View>
        </View>
        <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-100 shadow-sm">
          <Ionicons name="help" size={20} color="#073318" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Main Order Info Card - Green Theme */}
        <View className="bg-[#073318] rounded-[28px] p-5 mb-6" style={{
          shadowColor: '#073318',
          shadowOffset: { width: 0, height: 8 },
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
                  {source} {t("su_transit_347") || 'In Transit'}
                </Text>
              </View>
            </View>
            <View className="bg-[#0D4021] border border-white/10 px-3 py-1.5 rounded-full shadow-sm flex-row items-center flex-shrink-0">
              <Text className="text-[10px] font-black text-[#6EE7B7] uppercase tracking-wider">{statusText}</Text>
              <Ionicons name="checkmark-circle" size={12} color="#6EE7B7" style={{ marginLeft: 4 }} />
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">{t("from") || 'FROM'}</Text>
              <Text className="text-[16px] font-black text-white">{source}</Text>
            </View>
            <View className="w-8 items-center">
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.4)" />
            </View>
            <View className="flex-1 items-end">
              <Text className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">{t("to") || 'TO'}</Text>
              <Text className="text-[16px] font-black text-white">{destination}</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
              <Text className="text-[14px] font-black text-white mt-1">{qty}</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_items_350") || 'Items'}</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
              <Text className="text-[14px] font-black text-white mt-1">{totalWeight}{t("su_kg_351") || 'kg'}</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_total_weight_352") || 'Total Weight'}</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text className="text-[11px] font-black text-white mt-1" numberOfLines={1}>{info.date}</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5" numberOfLines={1}>{info.time}</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View className="bg-white rounded-[28px] p-5 border border-[#F1F5F9] mb-6" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 4
        }}>
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
              <Ionicons name="document-text-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{t("su_order_summary_373") || 'Order Summary'}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_order_id_374") || 'Order ID'}</Text>
            <Text className="text-[13px] font-black text-[#111827]">#{formattedOrderId}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_order_type_375") || 'Order Type'}</Text>
            <Text className="text-[13px] font-black text-[#1B7034]">{isDelivery ? (t('su_delivery_order') || 'Delivery Order') : (t('su_pickup_order') || 'Pickup Order')}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_completed_on_376") || 'Date & Time'}</Text>
            <Text className="text-[13px] font-black text-[#111827]">{info.date}, {info.time}</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_status_377") || 'Status'}</Text>
            <View className="bg-[#D1F2D9] px-2.5 py-1 rounded-full">
              <Text className="text-[11px] font-black text-[#1B7034]">{statusText}</Text>
            </View>
          </View>
        </View>

        {/* Tracking History Action Card */}
        <TouchableOpacity
          onPress={() => setShowTrackingModal(true)}
          className="bg-white rounded-[24px] p-4 mb-6 flex-row items-center justify-between border border-emerald-100 shadow-sm"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-[#E8F5EC] items-center justify-center border border-[#D5EFE0]">
              <Ionicons name="location" size={20} color="#16A34A" />
            </View>
            <View>
              <Text className="text-[14px] font-black text-slate-800 tracking-wide">Tracking History</Text>
              <Text className="text-[11px] font-bold text-emerald-600">View audit logs & status progress</Text>
            </View>
          </View>
          <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-100">
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </View>
        </TouchableOpacity>

        {/* Contact Details Card (Seller vs Buyer) */}
        <View className="bg-white rounded-[28px] p-5 border border-[#F1F5F9] mb-6" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 4
        }}>
          <View className="flex-row justify-between items-center pb-4 border-b border-slate-100 mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-[#F8FAFC] items-center justify-center mr-2 border border-slate-100">
                <Ionicons name={headerIcon} size={16} color="#073318" />
              </View>
              <Text className="text-[15px] font-black text-[#111827]">{detailsTitle}</Text>
            </View>
            {mobileValue !== 'N/A' && (
              <TouchableOpacity onPress={() => handleCall(mobileValue)} className="bg-[#E8F5EC] px-3 py-1.5 rounded-[10px] flex-row items-center border border-[#D5EFE0]">
                <Ionicons name="call-outline" size={14} color="#073318" />
                <Text className="text-[12px] font-black text-[#073318] ml-1.5">{t("su_call_353") || 'Call'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row items-start mb-4">
            <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
              <Ionicons name="person-outline" size={18} color="#073318" />
            </View>
            <View className="flex-1 justify-center mt-0.5">
              <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{nameLabel}</Text>
              <Text className="text-[14px] font-black text-[#111827]">{nameValue}</Text>
            </View>
          </View>

          <View className="flex-row items-start mb-4">
            <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
              <Ionicons name="call-outline" size={18} color="#073318" />
            </View>
            <View className="flex-1 justify-center mt-0.5">
              <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{mobileLabel}</Text>
              <Text className="text-[14px] font-black text-[#111827]">{mobileValue}</Text>
            </View>
          </View>

          <View className="flex-row items-start mb-4">
            <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
              <Ionicons name="map-outline" size={18} color="#073318" />
            </View>
            <View className="flex-1 justify-center mt-0.5">
              <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{villageLabel}</Text>
              <Text className="text-[14px] font-black text-[#111827]">{villageValue}</Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
              <Ionicons name="location-outline" size={18} color="#073318" />
            </View>
            <View className="flex-1 justify-center mt-0.5">
              <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{fullAddressLabel}</Text>
              <Text className="text-[13.5px] font-bold text-[#111827] leading-relaxed">{fullAddressValue}</Text>
            </View>
          </View>
        </View>

        {/* Products Delivered Section */}
        <View className="bg-white rounded-[28px] p-5 border border-[#F1F5F9] mb-6" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 4
        }}>
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
              <Ionicons name="cube-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{t("su_products_delivered_380") || 'Products Delivered'} ({productsList.length})</Text>
          </View>

          {productsList.map((product: any, idx: number) => (
            <View key={idx} className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 my-2 flex-row items-center justify-between shadow-sm">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <View className="bg-[#E0F2FE] px-2 py-0.5 rounded-[4px] mr-2">
                    <Text className="text-[9px] font-black text-[#0369A1] uppercase">{product.code}</Text>
                  </View>
                  <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-[4px]">
                    <Text className="text-[9px] font-black text-[#4F46E5] uppercase">{product.tag}</Text>
                  </View>
                </View>
                <Text className="text-[14px] font-black text-slate-800 mt-1.5">{product.name}</Text>
                <Text className="text-[12px] text-slate-500 font-medium mt-0.5">{product.details}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          ))}
        </View>

        {/* Payment Summary Section */}
        <View className="bg-white rounded-[28px] p-5 border border-[#F1F5F9] mb-6" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 4
        }}>
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
              <Ionicons name="cash-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{t("su_payment_summary_381") || 'Payment Summary'}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_total_amount_382") || 'Total Amount'}</Text>
            <Text className="text-[13px] font-black text-[#111827]">₹{amount.toFixed(2)}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_payment_method_383") || 'Payment Method'}</Text>
            <Text className="text-[13px] font-black text-[#1B7034]">{t("su_cash_384") || 'Cash'}</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_paid_amount_385") || 'Paid Amount'}</Text>
            <Text className="text-[13px] font-black text-[#1B7034]">₹{amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity activeOpacity={0.8} className="bg-white border border-[#E2E8F0] py-4 rounded-[22px] flex-row items-center justify-center mb-4 shadow-sm">
          <Ionicons name="download-outline" size={18} color="#073318" />
          <Text className="font-extrabold text-[15px] text-[#073318] ml-2">{t("su_download_invoice_386") || 'Download Invoice'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          className="w-full bg-[#073318] py-4 rounded-[22px] items-center justify-center shadow-sm mb-12"
        >
          <Text className="font-extrabold text-[15px] text-white">{t("su_back_to_completed_or_387") || 'Back'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <TrackingHistoryModal
        visible={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        order={order}
        role="SHG"
      />
    </SafeAreaView>
  );
}
