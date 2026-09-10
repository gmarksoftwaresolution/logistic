import React, { useState, useContext, useEffect, useCallback } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SharedHeader } from '../components/SharedHeader';
import { useUser } from '../context/UserContext';
import { useOrders } from '../context/OrderContext';
import { useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../api/axiosInstance';

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

  const { deliveredOrders = [], refreshOrdersList } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  const fetchProfileStats = async () => {
    try {
      if (refreshOrdersList) await refreshOrdersList().catch(() => {});
      const response = await axiosInstance.get('/earnings?filter=today');
      if (response.data?.success && response.data.data?.summary) {
        const summary = response.data.data.summary;
        const count = typeof summary.completedOrders === 'number' ? summary.completedOrders : 0;
        const earnings = typeof summary.totalEarnings === 'number' ? summary.totalEarnings : count * 15;
        setCompletedOrdersCount(count);
        setTotalEarnings(earnings);
      }
    } catch (e) {
      console.log('Failed to fetch profile stats:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileStats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileStats();
    setRefreshing(false);
  };

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

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={<SharedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Subtle curved background decoration behind the card */}
        <View 
          className="absolute top-0 left-0 right-0 h-48 bg-[#EEF5F0] rounded-b-[120px]" 
          style={{
            transform: [{ scaleX: 1.5 }],
            top: -20
          }} 
        />

        {/* Profile Card Section - Increased height (+40%) */}
        <View className="bg-[#F4FBF7] mx-5 py-8 px-6 rounded-[28px] border border-[#D1FAE5] mt-3 mb-4 relative overflow-hidden flex-row items-center">
          {/* Left: Avatar with green dot */}
          <View className="relative mr-4 items-center justify-center">
            <View className="w-20 h-20 bg-[#D1FAE5] rounded-full items-center justify-center border-2 border-[#A7F3D0] shadow-sm">
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} className="w-full h-full rounded-full" />
              ) : (
                <Text className="text-[#065F46] font-extrabold text-3xl">{(user?.name?.replace(/\s*\(.*\)\s*/g, '').trim().charAt(0)) || 'A'}</Text>
              )}
            </View>
            <View className="absolute bottom-0.5 right-0.5 w-4.5 h-4.5 bg-[#10B981] rounded-full border-2 border-white" />
          </View>

          {/* Middle: Details */}
          <View className="flex-1 pr-10 justify-center">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-[#1E293B]">{user?.name?.replace(/\s*\(.*\)\s*/g, '').trim() || 'Anita Patil'}</Text>
              <View className="flex-row items-center bg-[#D1FAE5] px-2.5 py-0.5 rounded-full ml-2">
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text className="text-[10px] text-[#059669] font-bold ml-0.5">{t("su_verified_303") || "Verified"}</Text>
              </View>
            </View>

            <View className="flex-row items-center mt-2">
              <Ionicons name="call" size={13} color="#059669" />
              <Text className="text-xs text-[#64748B] font-medium ml-2">+91 {user?.mobile || '9000000005'}</Text>
            </View>

            <View className="flex-row items-center mt-1">
              <Ionicons name="mail" size={13} color="#059669" />
              <Text className="text-xs text-[#64748B] font-medium ml-2">{user?.name?.replace(/\s*\(.*\)\s*/g, '').trim().toLowerCase().replace(' ', '.') || 'anita.patil'}{t("su_gmail_com_304") || "@gmail.com"}</Text>
            </View>

            <Text className="text-xs text-[#64748B] font-medium mt-2 leading-4.5" numberOfLines={2}>
              {t("su_delivering_to_make_l_305") || "Delivering to make life easier,\none order at a time."}
            </Text>
          </View>

          {/* Right: Delivery Rider Illustration */}
          <View 
            className="absolute right-4 opacity-90 justify-center items-center"
            style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}
            pointerEvents="none"
          >
            <MaterialCommunityIcons name="moped-electric" size={64} color="#34D399" />
          </View>
        </View>

        {/* Statistics Cards - Compact height dashboard style (-28% height) */}
        <View className="px-5 mb-4 flex-row gap-3">
          {/* Card 1: Total Completed Orders */}
          <View className="flex-1 bg-[#F4FBF7] border border-[#D1FAE5] rounded-[18px] px-3 py-2.5 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 bg-[#A7F3D0] rounded-full items-center justify-center mr-2.5">
                <Ionicons name="bag-handle" size={15} color="#047857" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-[#047857] leading-3" numberOfLines={1}>
                  Completed Orders
                </Text>
                <Text className="text-xl font-extrabold text-[#064E3B] mt-0.5">{completedOrdersCount}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chart-bar" size={16} color="#34D399" />
          </View>

          {/* Card 2: Total Earnings */}
          <View className="flex-1 bg-[#F4FBF7] border border-[#D1FAE5] rounded-[18px] px-3 py-2.5 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 bg-[#A7F3D0] rounded-full items-center justify-center mr-2.5">
                <MaterialCommunityIcons name="cash-multiple" size={15} color="#047857" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-[#047857] leading-3" numberOfLines={1}>
                  Total Earnings
                </Text>
                <Text className="text-xl font-extrabold text-[#064E3B] mt-0.5">₹{totalEarnings}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chart-bar" size={16} color="#34D399" />
          </View>
        </View>

        {/* Quick Access */}
        <View className="px-6 mb-6">
          <Text className="text-sm font-bold text-[#1E293B] mb-3 ml-1">{t("su_quick_access_311")}</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 py-2">
            <ActionRow icon={<Ionicons name="person-outline" size={22} color="#16A34A" />} title={t("personal_details") || "Personal Details"} subtitle={t("su_update_your_personal_429") || "Update your personal info"} onPress={() => navigation.navigate("PersonalDetails")} />
            <ActionRow icon={<Ionicons name="bag-handle-outline" size={22} color="#16A34A" />} title={t("su_my_orders_312")} subtitle={t("su_view_your_past_deliv_313")} onPress={() => (navigation as any).navigate("Main", { screen: "Orders" })} />
            <ActionRow icon={<Ionicons name="location-outline" size={22} color="#16A34A" />} title={t("su_my_addresses_314")} subtitle={t("su_manage_saved_address_315")} onPress={() => navigation.navigate("Address")} />
            <ActionRow icon={<Ionicons name="card-outline" size={22} color="#16A34A" />} title={t("su_bank_details_231") || "Bank Details"} subtitle={t("su_where_should_we_send_232") || "View payout account details"} onPress={() => navigation.navigate("BankDetails")} />
            <ActionRow icon={<Ionicons name="cash-outline" size={22} color="#16A34A" />} title={t("su_earnings_318")} subtitle={t("su_view_your_earnings_s_319")} onPress={() => (navigation as any).navigate("Main", { screen: "Earnings" })} />
            <ActionRow icon={<Ionicons name="settings-outline" size={22} color="#16A34A" />} title={t("settings")} subtitle={t("su_manage_your_app_pref_323")} onPress={() => navigation.navigate("Settings")} />
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