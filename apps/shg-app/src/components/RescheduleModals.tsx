import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../context/LanguageContext';

interface RescheduleModalsProps {
  showBottomSheet: boolean;
  setShowBottomSheet: (show: boolean) => void;
  rescheduleReasonModalVisible: boolean;
  setRescheduleReasonModalVisible: (show: boolean) => void;
  onConfirm: (date: string, time: string, reason: string) => void;
  expectedDate?: string;
}

export const RescheduleModals: React.FC<RescheduleModalsProps> = ({
  showBottomSheet,
  setShowBottomSheet,
  rescheduleReasonModalVisible,
  setRescheduleReasonModalVisible,
  onConfirm,
  expectedDate,
}) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;

  // Extract day from expectedDate (e.g., "18 May 2024" -> 18). Default to 18 if not provided.
  const expectedDay = expectedDate ? parseInt(expectedDate.split(' ')[0], 10) : 18;

  const [tempSelectedDay, setTempSelectedDay] = useState(expectedDay);
  const [tempSelectedTime, setTempSelectedTime] = useState('11:00 AM');
  const [selectedRescheduleReason, setSelectedRescheduleReason] = useState<string | null>(null);
  const [customRescheduleReason, setCustomRescheduleReason] = useState('');

  const rescheduleReasons = [
    { key: 'orders_vehicle_issue', default: 'Vehicle Issue' },
    { key: 'orders_driver_not_available', default: 'Driver Not Available' },
    { key: 'orders_traffic_problem', default: 'Traffic Problem' },
    { key: 'orders_customer_requested_later', default: 'Customer Requested Later' },
    { key: 'orders_weather_issue', default: 'Weather Issue' },
    { key: 'orders_route_problem', default: 'Route Problem' },
    { key: 'orders_other', default: 'Other' }
  ];

  return (
    <>
      {/* Centered Modal for Rescheduling Date/Time */}
      <Modal visible={showBottomSheet} transparent={true} animationType="fade" onRequestClose={() => setShowBottomSheet(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          {/* Backdrop Touch to dismiss */}
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setShowBottomSheet(false)} />

          <View className="bg-white rounded-[24px] w-full max-w-[400px] p-6 shadow-2xl">
            {/* Header */}
            <Text className="text-[20px] font-bold text-[#111827] text-center mb-2">{t("su_reschedule_date_time_410") || "Reschedule Date & Time"}</Text>
            <Text className="text-[#64748B] text-[14px] text-center mb-6">{t("su_select_new_date_and__411") || "Select a new date and time for pickup/delivery"}</Text>

            {/* Calendar Picker Section */}
            <Text className="text-[#111827] font-bold text-[14px] mb-3">{t("su_select_date_412") || "Select Date"}</Text>

            <View className="border border-slate-100 rounded-2xl p-4 mb-6">
              {/* Month Header */}
              <View className="flex-row justify-between items-center mb-4 px-2">
                <TouchableOpacity className="p-1">
                  <Ionicons name="chevron-back" size={18} color="#6B7280" />
                </TouchableOpacity>
                <Text className="font-bold text-[15px] text-[#111827]">{expectedDate ? expectedDate.substring(expectedDate.indexOf(' ') + 1) : (t("su_may_2024_413") || "May 2024")}</Text>
                <TouchableOpacity className="p-1">
                  <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Day Headers */}
              <View className="flex-row mb-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                  <View key={d} style={{ width: '14.28%', alignItems: 'center' }}>
                    <Text className="text-gray-400 text-[10px] font-bold text-center">{d}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View className="flex-row flex-wrap">
                {[28, 29, 30].map(day => (
                  <View key={`prev-${day}`} style={{ width: '14.28%', alignItems: 'center' }}>
                    <View className="w-9 h-9 items-center justify-center mb-1" />
                  </View>
                ))}
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const isDaySelected = tempSelectedDay === day;
                  // Only expectedDay and expectedDay + 1 are allowed
                  const isAllowed = day === expectedDay || day === expectedDay + 1;
                  
                  return (
                    <View key={`may-${day}`} style={{ width: '14.28%', alignItems: 'center' }}>
                      <TouchableOpacity 
                        onPress={() => { if (isAllowed) setTempSelectedDay(day); }} 
                        activeOpacity={!isAllowed ? 1 : 0.7} 
                        className={`w-9 h-9 items-center justify-center rounded-full mb-1 ${isDaySelected ? 'bg-[#073318]' : ''}`}
                      >
                        <Text className={`text-[13px] ${isDaySelected ? 'font-semibold text-white' : !isAllowed ? 'font-medium text-gray-300' : 'font-semibold text-[#111827]'}`}>{day}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <View style={{ width: '14.28%', alignItems: 'center' }}>
                  <View className="w-9 h-9 items-center justify-center mb-1" />
                </View>
              </View>
            </View>

            {/* Time Selector Section */}
            <Text className="text-[#111827] font-bold text-[14px] mb-3">{t("su_select_time_414") || "Select Time"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
              {['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map(time => {
                const isTimeSelected = tempSelectedTime === time;
                return (
                  <TouchableOpacity 
                    key={time} 
                    onPress={() => setTempSelectedTime(time)} 
                    className={`flex-row items-center px-4 py-2.5 rounded-[12px] border ${isTimeSelected ? 'bg-[#073318] border-[#073318]' : 'bg-white border-slate-200'} mr-2`}
                  >
                    {isTimeSelected && <Ionicons name="checkmark" size={14} color="white" style={{ marginRight: 4 }} />}
                    <Text className={`text-[13px] font-bold ${isTimeSelected ? 'text-white' : 'text-[#64748B]'}`}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Bottom Button Actions */}
            <View className="flex-row mt-2">
              <TouchableOpacity 
                onPress={() => {
                  setShowBottomSheet(false);
                  setTimeout(() => setRescheduleReasonModalVisible(true), 150);
                }} 
                activeOpacity={0.75} 
                className="flex-1 h-[50px] bg-white border border-[#CBD5E1] rounded-[25px] items-center justify-center mr-2 shadow-sm"
              >
                <Text className="text-[#4B5563] font-bold text-[14px]">{t("su_back_415") || "Back"}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  const finalReason = selectedRescheduleReason === 'Other' ? customRescheduleReason : selectedRescheduleReason;
                  const monthYear = expectedDate ? expectedDate.substring(expectedDate.indexOf(' ') + 1) : "May 2024";
                  onConfirm(`${tempSelectedDay} ${monthYear}`, tempSelectedTime, finalReason || '');
                  setShowBottomSheet(false);
                  setRescheduleReasonModalVisible(false);
                }} 
                activeOpacity={0.75} 
                className="flex-1 h-[50px] bg-[#073318] rounded-[25px] items-center justify-center ml-2 shadow-md"
              >
                <Text className="text-white font-black text-[14px]">{t("su_confirm_416") || "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Reason Modal */}
      <Modal visible={rescheduleReasonModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRescheduleReasonModalVisible(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setRescheduleReasonModalVisible(false)} />

          <View className="bg-white rounded-[24px] w-full max-w-[400px] p-6 shadow-2xl">
            <Text className="text-[20px] font-bold text-[#111827] text-center mb-6">{t("su_select_reschedule_re_417") || "Select Reschedule Reason"}</Text>

            <ScrollView className="max-h-[300px] mb-4" showsVerticalScrollIndicator={false}>
              {rescheduleReasons.map(reason => (
                <TouchableOpacity
                  key={reason.key}
                  onPress={() => setSelectedRescheduleReason(reason.default)}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    selectedRescheduleReason === reason.default ? 'border-[#073318] bg-[#F2FDF5]' : 'border-slate-200 bg-white'
                  } mb-3`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                    selectedRescheduleReason === reason.default ? 'border-[#073318]' : 'border-slate-300'
                  }`}>
                    {selectedRescheduleReason === reason.default && <View className="w-2.5 h-2.5 rounded-full bg-[#073318]" />}
                  </View>
                  <Text className={`text-[15px] ${
                    selectedRescheduleReason === reason.default ? 'text-[#073318] font-bold' : 'text-slate-700 font-medium'
                  }`}>
                    {t(reason.key) || reason.default}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedRescheduleReason === 'Other' && (
              <TextInput 
                value={customRescheduleReason} 
                onChangeText={setCustomRescheduleReason} 
                placeholder={t("su_enter_custom_reason_418") || "Enter custom reason"} 
                placeholderTextColor="#94A3B8" 
                className="border border-slate-200 rounded-[16px] p-4 text-[15px] text-[#111827] mb-4 bg-slate-50" 
                multiline 
              />
            )}

            <View className="flex-row mt-2">
              <TouchableOpacity 
                onPress={() => setRescheduleReasonModalVisible(false)} 
                activeOpacity={0.75} 
                className="flex-1 h-[50px] bg-white border border-[#CBD5E1] rounded-[25px] items-center justify-center mr-2 shadow-sm"
              >
                <Text className="text-[#4B5563] font-bold text-[14px]">{t("cancel") || "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setRescheduleReasonModalVisible(false);
                  setTimeout(() => setShowBottomSheet(true), 150);
                }} 
                disabled={!selectedRescheduleReason || (selectedRescheduleReason === 'Other' && !customRescheduleReason.trim())} 
                activeOpacity={0.75} 
                className={`flex-1 h-[50px] rounded-[25px] items-center justify-center ml-2 shadow-md ${(!selectedRescheduleReason || (selectedRescheduleReason === 'Other' && !customRescheduleReason.trim())) ? 'bg-slate-300' : 'bg-[#073318]'}`}
              >
                <Text className="text-white font-black text-[14px]">{t("su_next_420") || "Next"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
