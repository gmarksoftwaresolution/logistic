import React, { useContext, useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../../../context/LanguageContext';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress: () => void;
}

export const HistorySearch: React.FC<Props> = ({ value, onChangeText, onFilterPress }) => {
  const context = useContext(LanguageContext);
  const t = context?.t || ((k: string) => k);

  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChangeText(localValue);
    }, 500);
    return () => clearTimeout(timeout);
  }, [localValue]);

  return (
    <View className="px-5 mb-4 flex-row items-center">
      <View className="flex-1 flex-row items-center bg-white h-11 rounded-full px-4 border border-slate-200 shadow-sm mr-3" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        
        <View className="flex-1 ml-2 justify-center h-full">
          {localValue.length === 0 && (
            <Text 
              className="text-[13px] font-medium text-[#94A3B8] absolute"
              numberOfLines={1}
              style={{ top: '50%', transform: [{ translateY: -9.5 }] }}
              pointerEvents="none"
            >
              Search by Order ID, location, customer...
            </Text>
          )}

          <TextInput
            className="flex-1 text-[13px] font-medium text-slate-800 p-0 m-0 h-full"
            value={localValue}
            onChangeText={setLocalValue}
            placeholder=""
          />
        </View>

        {localValue.length > 0 && (
          <TouchableOpacity onPress={() => setLocalValue('')} className="ml-2">
            <Ionicons name="close-circle" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        onPress={onFilterPress}
        className="flex-row items-center px-4 h-11 rounded-full bg-white border border-slate-200 shadow-sm"
        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
      >
        <Ionicons name="filter-outline" size={16} color="#073318" style={{ marginRight: 6 }} />
        <Text className="text-[13px] font-bold text-[#073318]">{t('filter') || 'Filter'}</Text>
        <Ionicons name="chevron-down" size={14} color="#073318" style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </View>
  );
};
