import React, { useState, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { View, Text, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SharedHeader } from '../components/SharedHeader';
import { useUser } from '../context/UserContext';
type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;
export default function ProfileScreen({
  navigation
}: Props) {
  const context = useContext(LanguageContext);
  const { t } = context!;

  const {
    user,
    logout
  } = useUser();

  const [isOnline, setIsOnline] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthSelection' }],
      });
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };
  const ActionRow = ({
    icon,
    title,
    subtitle,
    onPress
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
  }) => <TouchableOpacity onPress={onPress} className="flex-row items-center bg-white py-3 px-4 mb-1">
      <View className="w-10 h-10 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-[#1E293B] text-sm">{title}</Text>
        {subtitle && <Text className="text-xs text-[#64748B] mt-0.5">{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>;
  return <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <SharedHeader title={t("profile")} subtitle={t("su_manage_your_account__302")} navigation={navigation} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Subtle curved background decoration behind the card */}
        <View 
          className="absolute top-0 left-0 right-0 h-48 bg-[#EEF5F0] rounded-b-[120px]" 
          style={{
            transform: [{ scaleX: 1.5 }],
            top: -20
          }} 
        />

        {/* Profile Card Section */}
        <View 
          className="bg-white mx-6 p-6 rounded-[32px] shadow-sm border border-slate-100/50 mt-6 mb-6"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <View className="items-center">
            <View className="relative">
              <View className="w-24 h-24 bg-white rounded-full items-center justify-center border-4 border-white shadow-md overflow-hidden">
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} className="w-full h-full" />
                ) : (
                  <Text className="text-[#073318] font-bold text-3xl">{user?.name?.charAt(0) || 'M'}</Text>
                )}
              </View>
              <TouchableOpacity className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-gray-100 items-center justify-center shadow-sm">
                <Feather name="camera" size={14} color="#073318" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mt-4">
              <Text className="text-xl font-bold text-[#1E293B]">{user?.name || 'Mahadev'}</Text>
              <View className="flex-row items-center bg-[#EEF5F0] px-2 py-0.5 rounded-full ml-2">
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text className="text-[10px] text-[#16A34A] font-bold ml-1">{t("su_verified_303")}</Text>
              </View>
            </View>
            
            <Text className="text-sm text-[#64748B] mt-1.5">+91 {user?.mobile || '7777777777'}</Text>
            <Text className="text-sm text-[#64748B] mt-0.5">{user?.name?.toLowerCase().replace(' ', '.') || 'mahadev'}{t("su_gmail_com_304")}</Text>

            <View className="bg-[#F8FAFC] w-full rounded-2xl p-4 mt-6 flex-row items-center border border-gray-100">
              <MaterialCommunityIcons name="moped-electric" size={24} color="#073318" />
              <Text className="flex-1 text-xs text-[#475569] font-medium leading-5 ml-3">{t("su_delivering_to_make_l_305")}</Text>
            </View>
          </View>
        </View>

        {/* Statistics Card */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-3xl p-5 flex-row justify-between shadow-sm border border-gray-50">
            <View className="items-center flex-1">
              <Ionicons name="bag-handle" size={24} color="#16A34A" />
              <Text className="text-xl font-bold text-[#1E293B] mt-2">128</Text>
              <Text className="text-xs text-[#64748B] text-center mt-1">{t("orders")}{'\n'}{t("su_completed_307")}</Text>
            </View>
            <View className="w-[1px] bg-gray-100 my-2" />
            <View className="items-center flex-1">
              <Ionicons name="star" size={24} color="#FBBF24" />
              <Text className="text-xl font-bold text-[#1E293B] mt-2">4.9</Text>
              <Text className="text-xs text-[#64748B] text-center mt-1">{t("su_rating_308")}</Text>
            </View>
            <View className="w-[1px] bg-gray-100 my-2" />
            <View className="items-center flex-1">
              <Ionicons name="time" size={24} color="#16A34A" />
              <Text className="text-xl font-bold text-[#1E293B] mt-2">98%</Text>
              <Text className="text-xs text-[#64748B] text-center mt-1">{t("su_on_time_309")}{'\n'}{t("su_delivery_310")}</Text>
            </View>
          </View>
        </View>

        {/* Quick Access */}
        <View className="px-6 mb-6">
          <Text className="text-sm font-bold text-[#1E293B] mb-3 ml-1">{t("su_quick_access_311")}</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 py-2">
            <ActionRow icon={<Ionicons name="bag-handle-outline" size={22} color="#16A34A" />} title={t("su_my_orders_312")} subtitle={t("su_view_your_past_deliv_313")} onPress={() => navigation.navigate("Orders")} />
            <ActionRow icon={<Ionicons name="location-outline" size={22} color="#16A34A" />} title={t("su_my_addresses_314")} subtitle={t("su_manage_saved_address_315")} onPress={() => navigation.navigate("Address")} />
            <ActionRow icon={<Ionicons name="card-outline" size={22} color="#16A34A" />} title={t("su_payment_methods_316")} subtitle={t("su_cards_wallets_317")} />
            <ActionRow icon={<Ionicons name="cash-outline" size={22} color="#16A34A" />} title={t("su_earnings_318")} subtitle={t("su_view_your_earnings_s_319")} />
            <ActionRow icon={<Ionicons name="gift-outline" size={22} color="#16A34A" />} title={t("su_refer_earn_320")} subtitle={t("su_invite_friends_and_e_321")} />
            <ActionRow icon={<Ionicons name="settings-outline" size={22} color="#16A34A" />} title={t("settings")} subtitle={t("su_manage_your_app_pref_323")} onPress={() => navigation.navigate("Settings")} />
          </View>
        </View>

        {/* Online Toggle */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex-row items-center">
            <View className="w-10 h-10 items-center justify-center mr-3">
              <MaterialCommunityIcons name="clock-check-outline" size={24} color="#16A34A" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-[#1E293B] text-sm">{t("su_go_online_324")}</Text>
              <Text className="text-xs text-[#64748B] mt-0.5">{t("su_start_receiving_deli_325")}</Text>
            </View>
            <Switch trackColor={{
            false: "#E2E8F0",
            true: "#16A34A"
          }} thumbColor={"#FFFFFF"} ios_backgroundColor="#E2E8F0" onValueChange={setIsOnline} value={isOnline} />
          </View>
        </View>

        {/* Additional Links */}
        <View className="px-6 mb-8">
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 py-2">
            <ActionRow icon={<Ionicons name="help-circle-outline" size={22} color="#16A34A" />} title={t("help_support")} subtitle={t("su_get_help_and_contact_327")} onPress={() => navigation.navigate("Help")} />
            <ActionRow icon={<Ionicons name="information-circle-outline" size={22} color="#16A34A" />} title={t("su_about_us_328")} subtitle={t("su_learn_more_about_our_329")} />
          </View>
        </View>

        {/* Logout */}
        <View className="px-6 mb-[110px]">
          <TouchableOpacity 
            onPress={handleLogout}
            className="bg-red-50 py-4 rounded-2xl flex-row justify-center items-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" className="mr-2" />
            <Text className="text-[#EF4444] font-bold text-base ml-2">{t("logout")}</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer to push content above floating navigation tab bar */}
        <View className="h-32" />

      </ScrollView>
    </SafeAreaView>;
}