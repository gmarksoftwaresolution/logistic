import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/theme';
import { normalize } from '../utils/responsive';

interface ViewMoreButtonProps {
  onPress: () => void;
  totalCount: number;
  visibleCount: number;
}

export const ViewMoreButton: React.FC<ViewMoreButtonProps> = ({ onPress, totalCount, visibleCount }) => {
  if (visibleCount >= totalCount) return null;

  const remaining = totalCount - visibleCount;

  return (
    <View className="items-center justify-center py-4 mb-4">
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.75}
        className="flex-row items-center justify-center bg-[#F2FDF5] border border-[#073318] px-6 py-3 rounded-full shadow-sm"
        style={{
          shadowColor: '#073318',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2
        }}
      >
        <Text style={{
          fontFamily: Fonts.bold,
          fontSize: normalize(13),
          color: '#073318',
          marginRight: 6
        }}>
          View More ({remaining} Remaining)
        </Text>
        <Ionicons name="chevron-down" size={16} color="#073318" />
      </TouchableOpacity>
    </View>
  );
};
