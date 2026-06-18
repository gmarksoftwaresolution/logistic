import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getOrderHistoryDetails } from '../modules/order-history/services/orderHistoryService';
import { HISTORY_STATUS_COLORS } from '../modules/order-history/constants/history.constants';
import { LanguageContext } from '../context/LanguageContext';
import { SharedHeader } from '../components/SharedHeader';

export default function OrderHistoryDetailsScreen({ route, navigation }: any) {
  const { order: initialOrder } = route.params;
  const [order, setOrder] = useState<any>(initialOrder);
  const [loading, setLoading] = useState(false);
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

  if (loading && !order.tracking) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]">
        <SharedHeader title={t('order_details') || 'Order Details'} subtitle="" navigation={navigation} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#073318" />
        </View>
      </SafeAreaView>
    );
  }

  const orderId = order.pickupOrderNumber || order.dropOrderNumber || order.masterOrder?.orderNumber || `ORD-${order.id}`;
  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';
  
  let statusColor = HISTORY_STATUS_COLORS.DEFAULT.color;
  let statusBg = HISTORY_STATUS_COLORS.DEFAULT.bg;
  let statusText = t('in_progress') || 'In Progress';

  if (isCompleted) {
    statusColor = HISTORY_STATUS_COLORS.COMPLETED.color;
    statusBg = HISTORY_STATUS_COLORS.COMPLETED.bg;
    statusText = t('completed') || 'Completed';
  } else if (order.status === 'REJECTED') {
    statusColor = HISTORY_STATUS_COLORS.REJECTED.color;
    statusBg = HISTORY_STATUS_COLORS.REJECTED.bg;
    statusText = t('rejected') || 'Rejected';
  } else if (order.status === 'CANCELLED') {
    statusColor = HISTORY_STATUS_COLORS.CANCELLED.color;
    statusBg = HISTORY_STATUS_COLORS.CANCELLED.bg;
    statusText = t('cancelled') || 'Cancelled';
  }

  let source = 'Transporter';
  let destination = 'Buyer';

  if (order.legType === 'pickup' || order.pickupOrderNumber) {
    source = order.seller?.address?.addressLine1 || 'Seller';
    destination = 'Transporter';
  } else {
    source = 'Transporter';
    destination = order.deliveryAddress || order.buyer?.address?.addressLine1 || 'Buyer';
  }

  const qty = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1;
  const amount = order.masterOrder?.totalAmount || 0;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <SharedHeader title={t('order_details') || 'Order Details'} subtitle="" navigation={navigation} />
      
      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View className="bg-white rounded-[20px] p-5 mb-5 border border-slate-100 shadow-sm" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-black text-[#073318]">#{orderId}</Text>
            <View className="px-3 py-1 rounded-full border" style={{ backgroundColor: statusBg, borderColor: `${statusColor}40` }}>
              <Text className="text-[11px] font-bold" style={{ color: statusColor }}>{statusText}</Text>
            </View>
          </View>
          
          <View className="bg-[#F8FAFC] rounded-xl p-4 flex-row justify-between items-center mb-4 border border-slate-200">
            <View className="items-center">
              <Text className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t('amount') || 'Amount'}</Text>
              <Text className="text-[16px] font-black text-[#073318]">₹{amount.toFixed(2)}</Text>
            </View>
            <View className="w-[1px] h-8 bg-slate-200" />
            <View className="items-center">
              <Text className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t('qty') || 'Quantity'}</Text>
              <Text className="text-[16px] font-black text-[#073318]">{qty} {t('items') || 'Items'}</Text>
            </View>
            <View className="w-[1px] h-8 bg-slate-200" />
            <View className="items-center">
              <Text className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t('payment') || 'Payment'}</Text>
              <Text className="text-[16px] font-black text-[#073318]">{isCancelled ? 'N/A' : 'Cash'}</Text>
            </View>
          </View>

          {/* Addresses */}
          <View className="pl-2 border-l-2 border-dashed border-slate-200 mb-2 py-1 ml-3 relative">
            <View className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-[#E2F0E7] items-center justify-center border-2 border-white">
              <View className="w-2 h-2 rounded-full bg-[#16A34A]" />
            </View>
            <Text className="text-[10px] text-slate-500 font-bold uppercase ml-4">{t('pickup_from') || 'Pickup From'}</Text>
            <Text className="text-[13px] font-medium text-slate-800 ml-4 mt-1">{source}</Text>
          </View>

          <View className="pl-2 py-1 ml-3 relative mt-3">
            <View className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-[#EFF6FF] items-center justify-center border-2 border-white">
              <View className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            </View>
            <Text className="text-[10px] text-slate-500 font-bold uppercase ml-4">{t('deliver_to') || 'Deliver To'}</Text>
            <Text className="text-[13px] font-medium text-slate-800 ml-4 mt-1">{destination}</Text>
          </View>
        </View>

        {/* Timeline */}
        <Text className="text-[14px] font-bold text-[#073318] mb-4 pl-1">{t('timeline') || 'Order Timeline'}</Text>
        <View className="bg-white rounded-[20px] p-5 mb-10 border border-slate-100 shadow-sm" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
          {order.tracking && order.tracking.length > 0 ? (
            order.tracking.map((track: any, index: number) => {
              const isLast = index === order.tracking.length - 1;
              const date = new Date(track.createdAt);
              return (
                <View key={track.id} className="flex-row">
                  <View className="w-16 items-end pr-3 pt-0.5">
                    <Text className="text-[11px] font-bold text-slate-700">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                    <Text className="text-[9px] font-medium text-slate-400">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <View className="items-center">
                    <View className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-[#16A34A] border-2 border-[#D1FAE5]' : 'bg-slate-300'}`} />
                    {!isLast && <View className="w-[1px] h-10 bg-slate-200 my-1" />}
                  </View>
                  <View className="flex-1 pl-4 pb-4 pt-0.5">
                    <Text className={`text-[13px] font-bold ${index === 0 ? 'text-[#073318]' : 'text-slate-600'}`}>{track.status}</Text>
                    {track.remarks && <Text className="text-[11px] font-medium text-slate-500 mt-1">{track.remarks}</Text>}
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-center text-slate-500 text-[13px]">{t('no_timeline') || 'No tracking information available.'}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
