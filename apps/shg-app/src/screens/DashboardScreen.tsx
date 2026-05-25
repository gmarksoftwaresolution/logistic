import { LanguageContext } from '../context/LanguageContext';
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from "../navigation/types";
import { useUser } from '../context/UserContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Dashboard'>, NativeStackScreenProps<RootStackParamList>>;
export default function DashboardScreen({
  navigation
}: Props) {
  const context = useContext(LanguageContext);
  const { t } = context!;

  const {
    user
  } = useUser();
  if (!user) return null;
  return <LinearGradient colors={['#F9FAFB', '#F3F4F6']} start={{
    x: 0,
    y: 0
  }} end={{
    x: 1,
    y: 1
  }} className="flex-1">
      <SafeAreaView className="flex-1">
        
        {/* Header Box */}
        <LinearGradient colors={['#FFFFFF', '#E8F5EC']} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 0
      }} className="mx-4 mt-4 h-[76px] border border-[#D5EFE0] flex-row justify-between items-center px-5" style={{
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4
      }}>
          <View className="justify-center">
            <Text className="text-[18px] font-extrabold text-[#111827]">{t("su_hello_421")}{user.name || 'ABC'}</Text>
            <Text className="text-[12px] font-semibold text-[#297C11] mt-0.5">{t("su_activity_for_today_422")}</Text>
          </View>
          
          <View className="flex-row items-center">
            {/* Notification Symbol */}
            <TouchableOpacity activeOpacity={0.7} className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 shadow-sm border border-[#E2F0E7]">
              <Ionicons name="notifications-outline" size={20} color="#073318" />
              <View className="absolute top-2 right-2.5 w-2 h-2 bg-[#B42318] rounded-full" />
            </TouchableOpacity>

            {/* Profile Symbol */}
            <TouchableOpacity activeOpacity={0.7} className="w-10 h-10 rounded-full bg-[#073318] items-center justify-center relative shadow-sm">
              <Ionicons name="person-outline" size={18} color="#FFFFFF" />
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-[#2BD768] rounded-full border-2 border-white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Center Content */}
        <View className="flex-1 justify-center items-center px-8 pb-10">
          <View className="w-28 h-28 bg-white rounded-full items-center justify-center shadow-md mb-8 border border-gray-100" style={{
          elevation: 3
        }}>
            <MaterialIcons name="construction" size={48} color="#073318" />
          </View>
          
          <Text className="text-[22px] font-extrabold text-[#111827] text-center mb-4 leading-8">{t("su_home_screen_is_under_423")}{'\n'}{t("su_development_424")}</Text>
          
          <Text className="text-[15px] font-medium text-[#6B7280] text-center leading-6">{t("su_we_re_building_somet_425")}</Text>
        </View>

      </SafeAreaView>
    </LinearGradient>;
}