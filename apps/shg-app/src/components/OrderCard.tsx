import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { OrderDistance } from './OrderDistance';
interface OrderCardProps {
  orderIdText: string;
  source: string;
  destination: string;
  qty: string | number;
  date: string;
  time: string;
  onPressCard?: () => void;
  showScanner?: boolean;
  onScan?: () => void;
  distance?: string | number;
}
export const OrderCard: React.FC<OrderCardProps> = ({
  orderIdText,
  source,
  destination,
  qty,
  date,
  time,
  onPressCard,
  showScanner = false,
  onScan,
  distance
}) => {
  const context = useContext(LanguageContext);
  const { t } = context!;
  return <TouchableOpacity onPress={onPressCard} activeOpacity={0.85} style={{
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4
  },
  shadowOpacity: 0.03,
  shadowRadius: 8,
  elevation: 2,
  padding: 14,
  marginBottom: 12,
  borderRadius: 20,
  borderColor: '#F1F5F9',
  borderWidth: 1.5,
  backgroundColor: 'white'
}} className="flex-row items-center justify-between">
    {/* Left Content Side */}
    <View className="flex-1 pr-2">
      {/* Order ID Badge / Highlight */}
      <View className="flex-row items-center">
        <Text className="text-[11px] font-semibold text-slate-700 tracking-wider">
          #{orderIdText}
        </Text>
      </View>

      {/* Route Visual Section (Horizontal) */}
      <View className="flex-row items-center mt-2.5 mb-1 pr-2">
        <Text className="text-[13px] font-bold text-[#073318] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{source}</Text>
        <Ionicons name="arrow-forward" size={12} color="#94A3B8" style={{
        marginHorizontal: 6
      }} />
        <Text className="text-[12.5px] font-bold text-[#073318] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{destination}</Text>
      </View>

      {/* Bottom Info Badges Row (All in one line) */}
      <View className="flex-row items-center mt-2 flex-wrap">
        {/* Qty Badge */}
        <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-[6px] flex-row items-center mr-1.5">
          <Feather name="package" size={9} color="#4F46E5" />
          <Text className="text-[10px] font-black text-[#4F46E5] ml-1">{t("su_qty_405")}{qty}
          </Text>
        </View>

        <Text className="text-slate-300 text-[10px] font-bold mr-1.5">•</Text>

        {/* Date Badge */}
        <View className="flex-row items-center mr-1.5">
          <Feather name="calendar" size={9} color="#64748B" />
          <Text className="text-[10px] font-medium text-slate-600 ml-1">
            {date}
          </Text>
        </View>

        <Text className="text-slate-300 text-[10px] font-bold mr-1.5">•</Text>

        {/* Time Badge */}
        <View className="flex-row items-center">
          <Feather name="clock" size={9} color="#64748B" />
          <Text className="text-[10px] font-medium text-slate-600 ml-1">
            {time}
          </Text>
        </View>
      </View>
    </View>

    {/* Right Icon and Distance */}
    <View className="flex-row items-center">
      <OrderDistance distance={distance} />
      
      {/* Right Icon - Circular Outline Style */}
      <View style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        backgroundColor: 'white'
      }} className="items-center justify-center ml-2">
        <Ionicons name="eye" size={24} color="#073318" />
      </View>
    </View>
  </TouchableOpacity>;
};