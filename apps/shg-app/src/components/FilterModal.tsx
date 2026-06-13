import React, { useContext, useState, useEffect } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FilterState, FilterType } from '../utils/dateFilters';
interface Props {
  visible: boolean;
  currentFilter: FilterState;
  onClose: () => void;
  onApply: (filter: FilterState) => void;
}
export const FilterModal: React.FC<Props> = ({
  visible,
  currentFilter,
  onClose,
  onApply
}) => {
  const context = useContext(LanguageContext);
  const { t } = context!;

  const [tempFilter, setTempFilter] = useState<FilterState>(currentFilter);
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  // Sync state when opened
  useEffect(() => {
    if (visible) {
      setTempFilter(currentFilter);
    }
  }, [visible, currentFilter]);
  const filterOptions: FilterType[] = ['all', 'today', '1_week', '15_days', '1_month', 'custom_date_range'];
  const handleApply = () => {
    onApply(tempFilter);
    onClose();
  };
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    if (selectedDate) {
      if (showPicker === 'start') {
        setTempFilter({
          ...tempFilter,
          startDate: selectedDate
        });
      } else if (showPicker === 'end') {
        setTempFilter({
          ...tempFilter,
          endDate: selectedDate
        });
      }
    }
  };
  return <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center p-6">
        <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={onClose} />
        
        <View className="bg-white rounded-[24px] w-full max-w-[400px] p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-[20px] font-bold text-textPrimary">{t("su_filter_orders_472")}</Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
              <Ionicons name="close" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {filterOptions.map(option => {
            const isSelected = tempFilter.type === option;
            return <TouchableOpacity key={option} onPress={() => setTempFilter({
              ...tempFilter,
              type: option
            })} className={`flex-row items-center py-3 mb-2 rounded-[12px] px-4 border ${isSelected ? 'bg-[#F2FDF5] border-[#073318]' : 'bg-white border-slate-200'}`}>
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${isSelected ? 'border-[#073318]' : 'border-slate-300'}`}>
                    {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-[#073318]" />}
                  </View>
                  <Text className={`text-[15px] ${isSelected ? 'font-bold text-[#073318]' : 'font-medium text-textPrimary'}`}>
                    {t("filter_" + option)}
                  </Text>
                </TouchableOpacity>;
          })}

            {tempFilter.type === 'custom_date_range' && <View className="mt-4 p-4 border border-slate-200 rounded-[16px] bg-slate-50">
                <Text className="text-[13px] font-bold text-textPrimary mb-3">{t("su_select_date_range_473")}</Text>
                
                <View className="flex-row justify-between items-center">
                  <TouchableOpacity onPress={() => setShowPicker('start')} className="flex-1 bg-white border border-slate-200 p-3 rounded-[12px] mr-2">
                    <Text className="text-[11px] text-textSecondary font-bold mb-1">{t("su_start_date_474")}</Text>
                    <Text className="text-[14px] text-textPrimary font-semibold">
                      {tempFilter.startDate ? tempFilter.startDate.toLocaleDateString() : 'Select'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowPicker('end')} className="flex-1 bg-white border border-slate-200 p-3 rounded-[12px] ml-2">
                    <Text className="text-[11px] text-textSecondary font-bold mb-1">{t("su_end_date_475")}</Text>
                    <Text className="text-[14px] text-textPrimary font-semibold">
                      {tempFilter.endDate ? tempFilter.endDate.toLocaleDateString() : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>}
          </ScrollView>

          {showPicker && <DateTimePicker value={showPicker === 'start' ? tempFilter.startDate || new Date() : tempFilter.endDate || new Date()} mode="date" display="default" onChange={handleDateChange} />}

          <View className="flex-row mt-6">
            <TouchableOpacity onPress={onClose} activeOpacity={0.75} className="flex-1 h-[50px] bg-white border border-[#CBD5E1] rounded-[25px] items-center justify-center mr-2 shadow-sm">
              <Text className="text-[#4B5563] font-bold text-[14px]">{t("cancel")}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleApply} disabled={tempFilter.type === 'custom_date_range' && (!tempFilter.startDate || !tempFilter.endDate)} activeOpacity={0.75} className={`flex-1 h-[50px] rounded-[25px] items-center justify-center ml-2 shadow-md ${tempFilter.type === 'custom_date_range' && (!tempFilter.startDate || !tempFilter.endDate) ? 'bg-slate-300' : 'bg-[#073318]'}`}>
              <Text className="text-white font-black text-[14px]">{t("apply")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>;
};