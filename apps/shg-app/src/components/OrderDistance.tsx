import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OrderDistanceProps {
  distance?: string | number;
}

export const OrderDistance: React.FC<OrderDistanceProps> = ({ distance }) => {
  if (!distance) return null;

  return (
    <View className="items-center justify-center mr-3">
      <Ionicons name="location-outline" size={16} color="#073318" />
      <Text className="text-[11px] font-semibold text-slate-700 mt-0.5">
        {distance} km
      </Text>
    </View>
  );
};
