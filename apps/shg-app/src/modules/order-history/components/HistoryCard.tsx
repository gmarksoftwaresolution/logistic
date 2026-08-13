import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { HistoryItem } from '../types/history.types';
import { LanguageContext } from '../../../context/LanguageContext';
import { HISTORY_STATUS_COLORS } from '../constants/history.constants';
import { OrderDistance } from '../../../components/OrderDistance';

import { formatAddressString } from '../../../utils/orderHelpers';

interface Props {
  order: HistoryItem;
  onPress: (order: HistoryItem) => void;
  onViewAddress: (order: HistoryItem) => void;
  onTrackOrder?: (order: HistoryItem) => void;
}

export const HistoryCard: React.FC<Props> = ({ order, onPress, onViewAddress, onTrackOrder }) => {
  const context = useContext(LanguageContext);
  const t = context?.t || ((k: string) => k);

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

  const orderId = order.pickupOrderNumber || order.dropOrderNumber || order.masterOrder?.orderNumber || (order.id ? `ORD-${order.id}` : 'Order');
  const formattedOrderId = orderId.startsWith('#') ? orderId : `#${orderId}`;

  let source = 'Seller';
  let destination = 'Buyer';

  if (order.legType === 'pickup') {
    source = order.seller?.village || order.seller?.address?.addressLine1?.split(',')[0] || (order as any).sellerName || 'Seller';
    destination = 'Transporter';
  } else {
    source = 'Transporter';
    destination = order.buyer?.village || order.deliveryAddress?.split(',')[0] || order.buyer?.address?.addressLine1?.split(',')[0] || (order as any).buyerName || 'Buyer';
  }

  const qty = order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || (order as any).totalQty || 1;
  const weight = (order as any).weight || (order as any).totalWeight || 1;

  return (
    <View
      className="rounded-[24px] mb-4 overflow-hidden border border-white/60"
      style={{
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.85)'
      }}
    >
      <BlurView intensity={50} tint="light">
        <TouchableOpacity
          onPress={() => onPress(order)}
          activeOpacity={0.7}
          className="p-5 bg-white/70"
        >
          {/* Top Row: Order ID & Status Badge */}
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[14px] font-black text-[#073318] tracking-wide">{formattedOrderId}</Text>
            <View className="px-3.5 py-1.5 rounded-full border" style={{ backgroundColor: statusBg, borderColor: `${statusColor}40` }}>
              <Text className="text-[11px] font-bold" style={{ color: statusColor }}>{statusText}</Text>
            </View>
          </View>

          {/* Route Row: Source -> Destination */}
          <View className="flex-row items-center justify-between mb-2 mt-1">
            <View className="flex-1 flex-row items-center pr-2">
              <Text className="text-[13px] font-extrabold text-[#111827] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{source}</Text>
              <Ionicons name="arrow-forward" size={12} color="#94A3B8" style={{ marginHorizontal: 6 }} />
              <Text className="text-[13px] font-extrabold text-[#111827] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{destination}</Text>
            </View>
            <OrderDistance distance={(order as any).distance} />
          </View>

          {/* Action Buttons: View Address & Track Order */}
          <View className="flex-row items-center gap-2 mt-2 mb-4">
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onViewAddress(order);
              }}
              activeOpacity={0.7}
              className="flex-row items-center px-2.5 py-1 rounded-[8px] border border-[#22C55E]/40 bg-[#F0FDF4]"
            >
              <Ionicons name="location-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-bold text-[#16A34A]">
                {t("view_address") || "View Address"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onTrackOrder?.(order);
              }}
              activeOpacity={0.7}
              className="flex-row items-center px-2.5 py-1 rounded-[8px] border border-blue-200 bg-blue-50"
            >
              <Ionicons name="footsteps-outline" size={12} color="#2563EB" style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-bold text-[#2563EB]">
                {t("track_order") || "Track Order"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Footer: Products & Weight */}
          <View className="flex-row justify-between items-center pt-2 border-t border-slate-100/60">
            <Text className="text-[13px] text-[#8792A1] font-medium">
              {qty} {qty > 1 ? (t("su_products") || "products") : (t("su_product") || "product")} • {weight} {t("su_kg") || "kg"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </View>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};
