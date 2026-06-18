import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../../../context/LanguageContext';

export const EmptyHistory = () => {
  const context = useContext(LanguageContext);
  const t = context?.t || ((k) => k);

  return (
    <View className="flex-1 items-center justify-center pt-16 px-6">
      <View 
        className="w-full items-center justify-center py-16 px-6 rounded-[24px] bg-white/60 border-2 border-[#CBD5E1]"
        style={{ borderStyle: 'dashed' }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-5 bg-white shadow-sm"
          style={{ borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}
        >
          <Ionicons name="documents-outline" size={32} color="#94A3B8" />
        </View>
        <Text className="text-[18px] font-black text-slate-800 text-center mb-2">
          {t('no_orders_found') || 'No orders found'}
        </Text>
        <Text className="text-[13px] font-medium text-slate-500 text-center">
          {t('no_orders_desc') || "You don't have any orders matching your current filters in the history."}
        </Text>
      </View>
    </View>
  );
};
