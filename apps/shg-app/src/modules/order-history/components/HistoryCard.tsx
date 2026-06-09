import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HistoryItem } from '../types/history.types';
import { LanguageContext } from '../../../context/LanguageContext';
import { HISTORY_STATUS_COLORS } from '../constants/history.constants';

interface Props {
  order: HistoryItem;
  onPress: (order: HistoryItem) => void;
  onViewAddress: (order: HistoryItem) => void;
}

export const HistoryCard: React.FC<Props> = ({ order, onPress, onViewAddress }) => {
  const context = useContext(LanguageContext);
  const t = context?.t || ((k: string) => k);

  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';
  const isInProgress = !isCompleted && !isCancelled;

  let statusColor = HISTORY_STATUS_COLORS.DEFAULT.color;
  let statusBg = HISTORY_STATUS_COLORS.DEFAULT.bg;
  let statusIcon = 'time-outline';
  let statusText = t('in_progress') || 'In Progress';

  if (isCompleted) {
    statusColor = HISTORY_STATUS_COLORS.COMPLETED.color;
    statusBg = HISTORY_STATUS_COLORS.COMPLETED.bg;
    statusIcon = 'checkmark-circle-outline';
    statusText = t('completed') || 'Completed';
  } else if (order.status === 'REJECTED') {
    statusColor = HISTORY_STATUS_COLORS.REJECTED.color;
    statusBg = HISTORY_STATUS_COLORS.REJECTED.bg;
    statusIcon = 'close-circle-outline';
    statusText = t('rejected') || 'Rejected';
  } else if (order.status === 'CANCELLED') {
    statusColor = HISTORY_STATUS_COLORS.CANCELLED.color;
    statusBg = HISTORY_STATUS_COLORS.CANCELLED.bg;
    statusIcon = 'close-circle-outline';
    statusText = t('cancelled') || 'Cancelled';
  }

  const orderId = order.pickupOrderNumber || order.dropOrderNumber || order.masterOrder?.orderNumber || `ORD-${order.id}`;
  const amount = order.masterOrder?.totalAmount || 0;
  
  let source = 'Transporter';
  let destination = 'Buyer';

  if (order.legType === 'pickup') {
    source = order.seller?.address?.addressLine1?.split(',')[0] || 'Seller';
    destination = 'Transporter';
  } else {
    source = 'Transporter';
    destination = order.deliveryAddress?.split(',')[0] || order.buyer?.address?.addressLine1?.split(',')[0] || 'Buyer';
  }

  const qty = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1;
  const time = (order as any).pickupTime ? new Date((order as any).pickupTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => onPress(order)}
      className="bg-white rounded-[20px] p-4 mb-4 flex-row items-center border border-slate-100 shadow-sm"
      style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}
    >
      {/* Left Status Panel */}
      <View className="items-center mr-3 w-[56px]">
        <View className="w-[28px] h-[28px] rounded-full items-center justify-center mb-1.5 border" style={{ backgroundColor: statusBg, borderColor: `${statusColor}40` }}>
          <Ionicons name={statusIcon as any} size={14} color={statusColor} />
        </View>
        <Text className="text-[10px] font-bold text-center" style={{ color: statusColor }}>{statusText}</Text>
      </View>

      {/* Center & Right Content */}
      <View className="flex-1">
        {/* Row 1: Order ID & Time & Chevron */}
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center flex-1 pr-2">
            <Text className="text-[13px] font-black text-[#111827] tracking-wide flex-shrink" numberOfLines={1}>#{orderId}</Text>
            <TouchableOpacity className="ml-1.5 p-1">
              <Ionicons name="copy-outline" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center">
            <Text className="text-[11px] font-bold text-slate-500 mr-1">{time}</Text>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
        </View>

        {/* Row 2: Source -> Destination */}
        <View className="flex-row items-center mb-3 pr-2">
          <Text className="text-[13px] font-medium text-slate-600 flex-shrink" numberOfLines={1}>{source}</Text>
          <Ionicons name="arrow-forward" size={12} color="#CBD5E1" style={{ marginHorizontal: 8 }} />
          <Text className="text-[13px] font-medium text-slate-600 flex-shrink" numberOfLines={1}>{destination}</Text>
        </View>

        {/* Row 3: Buttons & Amount */}
        <View className="flex-row justify-between items-end">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => onViewAddress(order)}
              className="flex-row items-center px-2 py-1 rounded-[6px] border border-[#22C55E]/40 bg-[#F0FDF4] mr-2"
            >
              <Ionicons name="location-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-bold text-[#16A34A]">{t('view_address') || 'View Address'}</Text>
            </TouchableOpacity>
            
            <View className="flex-row items-center px-2 py-1 rounded-[6px] bg-[#F8FAFC] border border-slate-200">
              <Ionicons name="cube-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-bold text-slate-600">Qty: {qty}</Text>
            </View>
          </View>
          
          <View className="items-end">
            <Text className="text-[15px] font-black text-[#111827]">₹{amount.toFixed(2)}</Text>
            <Text className="text-[10px] text-slate-400 font-bold mt-0.5">{isCancelled ? 'Cancelled' : 'Cash'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
