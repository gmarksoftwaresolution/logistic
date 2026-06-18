import React, { useContext } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { HistoryStats as StatsType } from '../types/history.types';
import { LanguageContext } from '../../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { HISTORY_STATUS_COLORS } from '../constants/history.constants';

export const HistoryStats = ({ stats }: { stats: StatsType | null }) => {
  const context = useContext(LanguageContext);
  const t = context?.t || ((k: string) => k);

  if (!stats) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }} className="mb-4">
      <View className="bg-white border border-slate-100 rounded-2xl p-3 mr-3 w-[130px] h-[64px] flex-row items-center shadow-sm" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
        <View className="w-8 h-8 rounded-full border items-center justify-center mr-3" style={{ borderColor: HISTORY_STATUS_COLORS.IN_PROGRESS.border + '4D', backgroundColor: HISTORY_STATUS_COLORS.IN_PROGRESS.bg }}>
          <Ionicons name="bag-handle-outline" size={13} color={HISTORY_STATUS_COLORS.IN_PROGRESS.color} />
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-[18px] font-black text-[#111827] leading-none" numberOfLines={1}>{stats.totalOrders}</Text>
          <Text className="text-[10px] font-bold text-slate-500 mt-1" numberOfLines={1}>{t('total_orders') || 'Total Orders'}</Text>
        </View>
      </View>
      
      <View className="bg-white border border-slate-100 rounded-2xl p-3 mr-3 w-[130px] h-[64px] flex-row items-center shadow-sm" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
        <View className="w-8 h-8 rounded-full border items-center justify-center mr-3" style={{ borderColor: HISTORY_STATUS_COLORS.COMPLETED.border + '4D', backgroundColor: HISTORY_STATUS_COLORS.COMPLETED.bg }}>
          <Ionicons name="checkmark-circle-outline" size={13} color={HISTORY_STATUS_COLORS.COMPLETED.color} />
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-[18px] font-black text-[#111827] leading-none" numberOfLines={1}>{stats.completedOrders}</Text>
          <Text className="text-[10px] font-bold text-slate-500 mt-1" numberOfLines={1}>{t('completed') || 'Completed'}</Text>
        </View>
      </View>

      <View className="bg-white border border-slate-100 rounded-2xl p-3 mr-3 w-[130px] h-[64px] flex-row items-center shadow-sm" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
        <View className="w-8 h-8 rounded-full border items-center justify-center mr-3" style={{ borderColor: HISTORY_STATUS_COLORS.REJECTED.border + '4D', backgroundColor: HISTORY_STATUS_COLORS.REJECTED.bg }}>
          <Ionicons name="close-circle-outline" size={13} color={HISTORY_STATUS_COLORS.REJECTED.color} />
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-[18px] font-black text-[#111827] leading-none" numberOfLines={1}>{stats.rejectedOrders}</Text>
          <Text className="text-[10px] font-bold text-slate-500 mt-1" numberOfLines={1}>{t('rejected') || 'Rejected'}</Text>
        </View>
      </View>
    </ScrollView>
  );
};
