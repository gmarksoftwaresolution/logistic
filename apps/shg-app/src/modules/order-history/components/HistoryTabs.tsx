import React, { useContext } from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { HistoryStatus } from '../types/history.types';
import { LanguageContext } from '../../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  selectedStatus: HistoryStatus;
  onSelect: (status: HistoryStatus) => void;
}

export const HistoryTabs: React.FC<Props> = ({ selectedStatus, onSelect }) => {
  const context = useContext(LanguageContext);
  const t = context?.t || ((k: string) => k);

  const tabs: { value: HistoryStatus, label: string, icon: any }[] = [
    { value: 'All Orders', label: 'All Orders', icon: 'list-outline' },
    { value: 'Completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { value: 'Rejected', label: 'Rejected', icon: 'close-circle-outline' },
  ];

  return (
    <View className="mb-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {tabs.map((tab) => {
          const isSelected = selectedStatus === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              activeOpacity={0.7}
              onPress={() => onSelect(tab.value)}
              className={`flex-row items-center px-4 h-10 rounded-full mr-3 border ${
                isSelected ? 'bg-[#073318] border-[#073318]' : 'bg-white border-slate-200'
              }`}
            >
              <Ionicons 
                name={tab.icon} 
                size={16} 
                color={isSelected ? '#FFFFFF' : '#475569'} 
                style={{ marginRight: 6 }} 
              />
              <Text className={`text-[13px] font-bold ${
                isSelected ? 'text-white' : 'text-slate-700'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
