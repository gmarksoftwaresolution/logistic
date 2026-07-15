import { LanguageContext } from '../context/LanguageContext';
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Order Assigned',
      desc: 'New delivery order has been assigned to you. Please confirm shipment details.',
      time: '10m ago',
      type: 'order',
      unread: true,
    },
    {
      id: 2,
      title: 'KYC Completed',
      desc: 'Your profile address and vehicle documents have been verified successfully.',
      time: '2h ago',
      type: 'kyc',
      unread: false,
    },
    {
      id: 3,
      title: 'Payout Alert',
      desc: 'Weekly delivery incentives have been successfully credited to your wallet.',
      time: '1d ago',
      type: 'payout',
      unread: false,
    },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate API reload for now
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

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
        <ScrollView 
          className="flex-1 relative"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#073318']} />
          }
        >
          
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
            <View className="flex-1 justify-center pr-2">
              <Text className="text-[18px] font-extrabold text-[#111827]" numberOfLines={1} ellipsizeMode="tail">{t("su_hello_421")}{user.name?.replace(/\s*\(.*\)\s*/g, '').trim() || 'ABC'}</Text>
              <Text className="text-[12px] font-semibold text-[#297C11] mt-0.5">{t("su_activity_for_today_422")}</Text>
            </View>
            
            <View className="flex-row items-center">
              {/* Notification Symbol - opacity:0 when open to let the duplicate active overlay bell button show through */}
              <TouchableOpacity 
                onPress={() => setShowNotifications(true)} 
                activeOpacity={0.7} 
                className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm border border-[#E2F0E7]"
                style={{ opacity: showNotifications ? 0 : 1 }}
              >
                <Ionicons name="notifications-outline" size={20} color="#073318" />
                {notifications.some(n => n.unread) && (
                  <View className="absolute top-2 right-2.5 w-2 h-2 bg-[#B42318] rounded-full" />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Blur Background Backdrop when popup opens */}
          {showNotifications && (
            <>
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => setShowNotifications(false)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 40,
                }}
              >
                <BlurView 
                  intensity={45} 
                  tint="dark" 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
              </TouchableOpacity>

              {/* Floating Unblurred Highlighted Notification Symbol above Backdrop when open */}
              <TouchableOpacity 
                onPress={() => setShowNotifications(false)} 
                activeOpacity={0.7} 
                className="absolute z-[60] right-[36px] top-[34px] w-10 h-10 rounded-full items-center justify-center bg-[#073318] shadow-sm border border-[#073318]"
              >
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
                {notifications.some(n => n.unread) && (
                  <View className="absolute top-2 right-2.5 w-2 h-2 bg-[#B42318] rounded-full" />
                )}
              </TouchableOpacity>
            </>
          )}

        {/* Large Notification Popup */}
        {showNotifications && (
          <View 
            className="absolute z-50 left-6 right-6 top-[76px] bg-white border border-[#D5EFE0] rounded-[28px] overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 15 },
              shadowOpacity: 0.2,
              shadowRadius: 25,
              elevation: 15,
            }}
          >
            {/* Popup Content */}
            <View className="p-6">
              {/* Header */}
              <View className="flex-row justify-between items-center pb-4 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Ionicons name="notifications" size={20} color="#073318" className="mr-2" />
                  <Text className="text-lg font-black text-[#111827]">{t('notifications') || 'Notifications'}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowNotifications(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <Ionicons name="close" size={18} color="#4B5563" />
                </TouchableOpacity>
              </View>

              {/* Notification list */}
              <View className="mt-4 space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <View 
                      key={notif.id} 
                      className={`flex-row items-start p-4 rounded-[16px] border mb-3 ${
                        notif.unread 
                          ? 'bg-[#EBF7EE] border-[#D5EFE0]' 
                          : 'bg-[#F9FAFB] border-gray-50'
                      }`}
                    >
                      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 border ${
                        notif.type === 'order' 
                          ? 'bg-green-50 border-green-100' 
                          : notif.type === 'kyc' 
                            ? 'bg-blue-50 border-blue-100' 
                            : 'bg-amber-50 border-amber-100'
                      }`}>
                        <Ionicons 
                          name={
                            notif.type === 'order' 
                              ? 'cube-outline' 
                              : notif.type === 'kyc' 
                                ? 'shield-checkmark-outline' 
                                : 'alert-circle-outline'
                          } 
                          size={20} 
                          color={
                            notif.type === 'order' 
                              ? '#297C11' 
                              : notif.type === 'kyc' 
                                ? '#0265AD' 
                                : '#D97706'
                          } 
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row justify-between items-center">
                          <View className="flex-row items-center">
                            <Text className="text-sm font-bold text-[#111827]">{notif.title}</Text>
                            {notif.unread && (
                              <View className="w-1.5 h-1.5 rounded-full bg-[#B42318] ml-1.5" />
                            )}
                          </View>
                          <Text className="text-[10px] text-gray-400 font-semibold">{notif.time}</Text>
                        </View>
                        <Text className="text-[12px] text-[#6B7280] mt-1 leading-5">{notif.desc}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View className="items-center py-8">
                    <Ionicons name="notifications-off-outline" size={36} color="#9CA3AF" />
                    <Text className="text-sm font-bold text-gray-400 mt-2">No new notifications</Text>
                  </View>
                )}
              </View>

              {/* Clear All Option in Bottom Corner */}
              {notifications.length > 0 && (
                <View className="flex-row justify-end items-center pt-3 mt-4 border-t border-gray-100">
                  <TouchableOpacity onPress={() => setNotifications([])}>
                    <Text className="text-xs font-black text-[#B42318] uppercase tracking-wider">{t('clear_all') || 'Clear All'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

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

        </ScrollView>
      </SafeAreaView>
  </LinearGradient>;
}