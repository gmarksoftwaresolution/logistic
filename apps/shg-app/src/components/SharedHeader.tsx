import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SharedHeaderProps {
  title: string;
  subtitle: string;
  navigation?: any;
}

export const SharedHeader: React.FC<SharedHeaderProps> = ({ title, subtitle, navigation }) => {
  return (
    <View className="flex-row items-center px-4 mt-4 mb-2 bg-transparent">
      {/* Back Button */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => navigation?.goBack()}
        className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border border-white/80 mr-3"
        style={{
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
        }}
      >
        <Ionicons name="chevron-back" size={22} color="#111827" />
      </TouchableOpacity>

      {/* Header Box */}
      <LinearGradient 
        colors={['#FFFFFF', '#E8F5EC']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 0 }}
        className="flex-1 h-[68px] border border-[#D5EFE0] flex-row justify-between items-center px-5" 
        style={{ 
          borderRadius: 30,
          overflow: 'hidden',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        <View className="justify-center flex-1 pr-2">
          <Text className="text-[18px] font-extrabold text-[#111827]" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[12px] font-semibold text-[#297C11] mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity 
          activeOpacity={0.7}
          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm border border-[#E2F0E7]"
        >
          <Ionicons name="help-circle-outline" size={22} color="#073318" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};
