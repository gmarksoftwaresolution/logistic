import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OrdersStackParamList } from '../navigation/types';
import { LanguageContext } from '../context/LanguageContext';
import { getRouteForOrder, getFormattedOrderId, getInfoForOrder, translateRoutePart } from '../utils/orderHelpers';
type Props = NativeStackScreenProps<OrdersStackParamList, 'CompletedOrderDetails'>;
const CompletedOrderDetailsScreen: React.FC<Props> = ({
  route,
  navigation
}) => {
  const {
    order
  } = route.params;
  const context = useContext(LanguageContext);
  if (!context) return null;
  const {
    t
  } = context;
  const routeStr = getRouteForOrder(order);
  const routeParts = routeStr.split('>');
  const rawSource = routeParts[0]?.trim() || 'Transporter';
  const rawDestination = routeParts[1]?.trim() || 'Buyer';
  const source = translateRoutePart(rawSource, t);
  const destination = translateRoutePart(rawDestination, t);
  const isDelivery = rawSource.toLowerCase() === 'transporter';
  const formattedOrderId = getFormattedOrderId(order);
  const info = getInfoForOrder(order);

  // Dynamic Contact Details Card (Seller vs Buyer)
  let detailsTitle = t('su_seller_details') || "Seller Details";
  let headerIcon: any = "storefront-outline";
  let nameLabel = t('su_seller_name') || "Seller Name";
  let nameValue = order.transporterName || "Sanjay Desai";
  let mobileLabel = t('su_seller_mobile_number') || "Seller Mobile Number";
  let mobileValue = order.transporterMobile || "9654782390";
  let addressOrVehicleLabel = t('su_shop_name_seller_address') || "Shop Name / Seller Address";
  let addressOrVehicleIcon: any = "location-outline";
  let addressOrVehicleValue = "";
  if (isDelivery) {
    detailsTitle = t('su_buyer_details') || "Buyer Details";
    headerIcon = "person-outline";
    nameLabel = t('su_buyer_name') || "Buyer Name";
    nameValue = destination;
    mobileLabel = t('su_buyer_mobile_number') || "Buyer Mobile Number";
    mobileValue = order.mobile || "+91 8484830180";
    addressOrVehicleLabel = t('su_buyer_address') || "Buyer Address";
    addressOrVehicleIcon = "location-outline";
    addressOrVehicleValue = `${destination}, Chandgad, kolhapur, Maharastra`;
  } else {
    // Seller details
    let resolvedAddress = source;
    if (rawSource.toLowerCase().includes('hifi')) {
      resolvedAddress = "Hifi Shop, Bramhan galli, Chandgad, kolhapur, Maharastra";
    } else if (rawSource.toLowerCase().includes('home no')) {
      resolvedAddress = "Home No. 23, Market Road, Kowad, kolhapur, Maharastra";
    } else {
      resolvedAddress = `${source}, Chandgad, kolhapur, Maharastra`;
    }
    addressOrVehicleValue = resolvedAddress;
  }
  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Dynamic products list matching the remainingQty length
  const productCount = order.remainingQty || 1;
  const AVAILABLE_PRODUCTS = [{
    code: '#P101',
    tag: t('su_pickup_order') || 'Pickup Order',
    name: 'Raw Organic Turmeric Packs',
    details: `2 ${t('su_items') || 'items'} • 10 ${t('su_kg') || 'kg'}`
  }, {
    code: '#P102',
    tag: t('su_pickup_order') || 'Pickup Order',
    name: 'Cold Pressed Groundnut Oil',
    details: `1 ${t('su_item') || 'item'} • 5 ${t('su_kg') || 'kg'}`
  }, {
    code: '#P103',
    tag: t('su_pickup_order') || 'Pickup Order',
    name: 'Premium Basmati Rice Bag',
    details: `3 ${t('su_items') || 'items'} • 25 ${t('su_kg') || 'kg'}`
  }, {
    code: '#P104',
    tag: t('su_pickup_order') || 'Pickup Order',
    name: 'Organic Jaggery Block',
    details: `2 ${t('su_items') || 'items'} • 2 ${t('su_kg') || 'kg'}`
  }, {
    code: '#P105',
    tag: t('su_pickup_order') || 'Pickup Order',
    name: 'Fresh Pure Desi Ghee',
    details: `1 ${t('su_item') || 'item'} • 1 ${t('su_kg') || 'kg'}`
  }, {
    code: '#P106',
    tag: t('su_pickup_order') || 'Pickup Order',
    name: 'Whole Wheat Atta Bag',
    details: `1 ${t('su_item') || 'item'} • 10 ${t('su_kg') || 'kg'}`
  }, {
    code: '#P107',
    tag: t('su_pickup_order') || 'Pickup Order',
    name: 'Natural Honey Bottle',
    details: `4 ${t('su_items') || 'items'} • 2 ${t('su_kg') || 'kg'}`
  }];
  const products = AVAILABLE_PRODUCTS.slice(0, productCount);
  return <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header mimicking the mockup layout */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-100 shadow-sm mr-4">
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text className="text-[17px] font-black text-[#0F172A]">{t("su_completed_order_deta_364")}</Text>
            <Text className="text-[12px] font-medium text-slate-500 mt-0.5">{t("su_view_past_order_info_365")}</Text>
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
            <View className="bg-[#0D4021] border border-white/10 px-3 py-1.5 rounded-full shadow-sm flex-row items-center flex-shrink-0">
              <Text className="text-[10px] font-black text-[#6EE7B7] uppercase tracking-wider">{t("su_completed_307")}</Text>
              <Ionicons name="checkmark-circle" size={12} color="#6EE7B7" style={{
              marginLeft: 4
            }} />
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
              <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
              <Text className="text-[14px] font-black text-white mt-1">{order.remainingQty || 1}</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_items_350")}</Text>
            </View>
            <View className="flex-1 bg-white/10 p-3 rounded-[16px] items-center justify-center border border-white/5">
              <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
              <Text className="text-[14px] font-black text-white mt-1">{order.weight || '12'}{t("su_kg_351")}</Text>
              <Text className="text-[9px] font-bold text-white/60 mt-0.5">{t("su_total_weight_352")}</Text>
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
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4
      }}>
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
              <Ionicons name="document-text-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{t("su_order_summary_373")}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_order_id_374")}</Text>
            <Text className="text-[13px] font-black text-[#111827]">#{formattedOrderId}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_order_type_375")}</Text>
            <Text className="text-[13px] font-black text-[#1B7034]">{isDelivery ? (t('su_delivery_order') || 'Delivery Order') : (t('su_pickup_order') || 'Pickup Order')}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_completed_on_376")}</Text>
            <Text className="text-[13px] font-black text-[#111827]">{info.date}, {info.time}</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_status_377")}</Text>
            <View className="bg-[#D1F2D9] px-2.5 py-1 rounded-full">
              <Text className="text-[11px] font-black text-[#1B7034]">{t("su_completed_307")}</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Contact Details Card (Seller vs Buyer) */}
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

          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-[#F8FAFC] items-center justify-center mr-3 border border-slate-100">
              <Ionicons name={addressOrVehicleIcon} size={18} color="#073318" />
            </View>
            <View className="flex-1 justify-center mt-0.5">
              <Text className="text-[11px] font-bold text-slate-500 mb-0.5">{addressOrVehicleLabel}</Text>
              <Text className="text-[14px] font-black text-[#111827]">{addressOrVehicleValue}</Text>
            </View>
          </View>
        </View>

        {/* Products delivered Section */}
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
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
              <Ionicons name="cube-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{t("su_products_delivered_380")}{products.length})</Text>
          </View>

          {products.map(product => <View key={product.code} className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 my-2 flex-row items-center justify-between shadow-sm">
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
            </View>)}
        </View>

        {/* Payment Summary Section */}
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
          <View className="flex-row items-center pb-4 border-b border-slate-100 mb-4">
            <View className="w-8 h-8 rounded-full bg-[#E8F5EC] items-center justify-center mr-2 border border-[#D5EFE0]">
              <Ionicons name="cash-outline" size={16} color="#073318" />
            </View>
            <Text className="text-[15px] font-black text-[#111827]">{t("su_payment_summary_381")}</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_total_amount_382")}</Text>
            <Text className="text-[13px] font-black text-[#111827]">₹550.00</Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_payment_method_383")}</Text>
            <Text className="text-[13px] font-black text-[#1B7034]">{t("su_cash_384")}</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-[13px] text-slate-500 font-bold">{t("su_paid_amount_385")}</Text>
            <Text className="text-[13px] font-black text-[#1B7034]">₹550.00</Text>
          </View>
        </View>

        {/* Bottom Buttons */}
        <TouchableOpacity activeOpacity={0.8} className="bg-white border border-[#E2E8F0] py-4 rounded-[22px] flex-row items-center justify-center mb-4 shadow-sm">
          <Ionicons name="download-outline" size={18} color="#073318" />
          <Text className="font-extrabold text-[15px] text-[#073318] ml-2">{t("su_download_invoice_386")}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} className="bg-[#073318] py-4 rounded-[22px] items-center justify-center mb-10 shadow-sm">
          <Text className="font-extrabold text-[15px] text-white">{t("su_back_to_completed_or_387")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>;
};
export default CompletedOrderDetailsScreen;