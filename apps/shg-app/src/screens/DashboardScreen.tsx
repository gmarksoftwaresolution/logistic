import { LanguageContext } from '../context/LanguageContext';
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, Animated } from 'react-native';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from "../navigation/types";
import { useUser } from '../context/UserContext';
import { useOrders } from '../context/OrderContext';
import axiosInstance from '../api/axiosInstance';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Dashboard'>, NativeStackScreenProps<RootStackParamList>>;

export default function DashboardScreen({
  navigation
}: Props) {
  const context = useContext(LanguageContext);
  const { t } = context!;
  const { incomingOrders = [], acceptedOrders = [], deliveredOrders = [], refreshOrdersList } = useOrders();

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

  const [earningsSummary, setEarningsSummary] = useState<any>({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    totalEarnings: 0,
    completedOrders: 0,
    perOrderRate: 15,
  });
  const [recentEarnings, setRecentEarnings] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'month' | 'today' | 'week'>('month');
  const [showEarnings, setShowEarnings] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarningsData = async () => {
    try {
      const response = await axiosInstance.get(`/earnings?filter=${selectedFilter}`);
      if (response.data?.success && response.data?.data) {
        setEarningsSummary(response.data.data.summary || {});
        setRecentEarnings(response.data.data.recentEarnings || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard earnings:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEarningsData();
      refreshOrdersList();
    }, [selectedFilter])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEarningsData(), refreshOrdersList()]);
    setRefreshing(false);
  }, [selectedFilter]);

  const { user } = useUser();
  if (!user) return null;

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const getDisplayedEarnings = () => {
    if (selectedFilter === 'today') return earningsSummary.todayEarnings || 0;
    if (selectedFilter === 'week') return earningsSummary.weekEarnings || 0;
    return earningsSummary.totalEarnings || earningsSummary.monthEarnings || 0;
  };

  const getFilterLabel = () => {
    if (selectedFilter === 'today') return "Today's";
    if (selectedFilter === 'week') return "This Week";
    return "This Month";
  };

  const pickupCount = incomingOrders.length + acceptedOrders.filter((o: any) => o.legType === 'pickup' || !o.legType).length;
  const deliveryCount = acceptedOrders.filter((o: any) => o.legType === 'drop').length;

  return (
    <LinearGradient colors={['#F9FAFB', '#F3F4F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="flex-1">
      <SafeAreaView className="flex-1">
        {/* Header Box */}
        <LinearGradient 
          colors={['#FFFFFF', '#E8F5EC']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }} 
          className="mx-4 mt-4 h-[68px] border border-[#D5EFE0] flex-row justify-between items-center px-5" 
          style={{
            borderRadius: 34,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3
          }}
        >
          <View className="flex-1 justify-center pr-2">
            <Text className="text-[18px] font-extrabold text-[#111827]" numberOfLines={1} ellipsizeMode="tail">
              {t("su_hello_421") || 'Hello, '}{user.name?.replace(/\s*\(.*\)\s*/g, '').trim() || 'Pooja Patil'}
            </Text>
            <Text className="text-[12px] font-semibold text-[#297C11] mt-0.5">
              {t("su_activity_for_today_422") || 'Activity for today'}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')} 
              activeOpacity={0.7} 
              className="w-10 h-10 rounded-full bg-white items-center justify-center border border-[#E2F0E7]"
              style={{ 
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}
            >
              <Ionicons name="person-outline" size={20} color="#073318" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView 
          className="flex-1 relative"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <SharedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >

          {/* Earnings Card */}
          <LinearGradient 
            colors={['#085D2C', '#064822']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            className="mx-4 mt-5 rounded-[16px] px-5 py-3 relative overflow-hidden"
            style={{
              elevation: 4,
              shadowColor: '#085D2C',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8
            }}
          >
            <View className="z-10">
              <Text className="text-white/90 text-[12px] font-medium tracking-wide">Total Earnings ({getFilterLabel()})</Text>
              <View className="flex-row items-center mt-1 mb-3">
                <Text className="text-white text-[28px] font-bold">
                  {showEarnings ? formatCurrency(getDisplayedEarnings()) : '₹ ••••••'}
                </Text>
                <TouchableOpacity className="ml-2" onPress={() => setShowEarnings(!showEarnings)}>
                  <Ionicons name={showEarnings ? "eye-outline" : "eye-off-outline"} size={18} color="#fff" style={{ opacity: 0.9 }} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                className="flex-row items-center bg-black/20 px-3 py-1.5 rounded-full align-self-start" 
                style={{ alignSelf: 'flex-start' }}
                onPress={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <Text className="text-white/90 text-[12px] font-medium">{getFilterLabel()}</Text>
                <Ionicons name="chevron-down" size={14} color="#fff" className="ml-1 opacity-90" />
              </TouchableOpacity>

              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <View className="mt-2 bg-white rounded-xl p-1 shadow-lg z-30" style={{ alignSelf: 'flex-start' }}>
                  <TouchableOpacity 
                    className={`px-3 py-1.5 rounded-lg ${selectedFilter === 'month' ? 'bg-[#EBF7EE]' : ''}`} 
                    onPress={() => { setSelectedFilter('month'); setShowFilterDropdown(false); }}
                  >
                    <Text className={`text-xs font-bold ${selectedFilter === 'month' ? 'text-[#297C11]' : 'text-slate-700'}`}>This Month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className={`px-3 py-1.5 rounded-lg ${selectedFilter === 'week' ? 'bg-[#EBF7EE]' : ''}`} 
                    onPress={() => { setSelectedFilter('week'); setShowFilterDropdown(false); }}
                  >
                    <Text className={`text-xs font-bold ${selectedFilter === 'week' ? 'text-[#297C11]' : 'text-slate-700'}`}>This Week</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className={`px-3 py-1.5 rounded-lg ${selectedFilter === 'today' ? 'bg-[#EBF7EE]' : ''}`} 
                    onPress={() => { setSelectedFilter('today'); setShowFilterDropdown(false); }}
                  >
                    <Text className={`text-xs font-bold ${selectedFilter === 'today' ? 'text-[#297C11]' : 'text-slate-700'}`}>Today</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View className="absolute right-[-10px] bottom-[-20px] opacity-10">
               <Text style={{ fontSize: 130, fontWeight: 'bold', color: '#000' }}>₹</Text>
            </View>
            <View className="absolute right-6 bottom-[14px]">
              <View className="relative w-[72px] h-[46px]">
                {/* Coins */}
                <View className="absolute -top-[16px] left-[6px] w-[30px] h-[30px] rounded-full bg-[#FCD34D] border-[2px] border-[#FDE68A] items-center justify-center z-10" style={{ transform: [{ rotate: '-15deg' }] }}>
                  <View className="w-[14px] h-[14px] rounded-full border-[1.5px] border-[#FDE68A]" />
                </View>
                <View className="absolute -top-[14px] left-[28px] w-[26px] h-[26px] rounded-full bg-[#FCD34D] border-[2px] border-[#FDE68A] items-center justify-center z-10" style={{ transform: [{ rotate: '25deg' }] }}>
                  <View className="w-[12px] h-[12px] rounded-full border-[1.5px] border-[#FDE68A]" />
                </View>
                <View className="absolute -top-[23px] left-[17px] w-[34px] h-[34px] rounded-full bg-[#FDE047] border-[2.5px] border-[#FEF08A] items-center justify-center z-20">
                  <View className="w-[16px] h-[16px] rounded-full border-[2px] border-[#FEF08A] items-center justify-center">
                    <Text className="text-[#FBBF24] text-[10px] font-bold">₹</Text>
                  </View>
                </View>
                
                {/* Wallet Body */}
                <View className="w-full h-full bg-[#10B981] rounded-[8px] z-30 shadow-sm" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 }}>
                  <View className="absolute right-0 top-[10px] w-[18px] h-[26px] bg-[#059669] rounded-l-[4px] rounded-r-[8px] items-center justify-center shadow-sm">
                    <View className="w-[8px] h-[8px] rounded-full bg-[#FCD34D]" style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2 }} />
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Action Grid */}
          <View className="mx-4 mt-5 flex-row justify-between">
            {/* Card 1: Today's Earnings */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('Earnings')}
              className="w-[23.5%] bg-white rounded-[16px] py-3 px-1 items-center justify-center border border-gray-50 shadow-sm" 
              style={{ elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 }}
            >
              <View className="w-10 h-10 rounded-full bg-[#EBF7EE] items-center justify-center mb-2">
                <Ionicons name="wallet" size={18} color="#297C11" />
              </View>
              <Text className="text-[9px] text-[#4B5563] font-medium text-center leading-[11px]" numberOfLines={2}>Today's{'\n'}Earnings</Text>
              <Text className="text-[12px] font-bold text-[#111827] mt-1" numberOfLines={1}>
                {formatCurrency(earningsSummary.todayEarnings || 0)}
              </Text>
              <Text className="text-[8px] text-[#9CA3AF] mt-0.5">₹15/order</Text>
            </TouchableOpacity>
            
            {/* Card 2: This Week */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('Earnings')}
              className="w-[23.5%] bg-white rounded-[16px] py-3 px-1 items-center justify-center border border-gray-50 shadow-sm" 
              style={{ elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 }}
            >
              <View className="w-10 h-10 rounded-full bg-[#F3E8FF] items-center justify-center mb-2">
                <Ionicons name="calendar" size={18} color="#9333EA" />
              </View>
              <Text className="text-[9px] text-[#4B5563] font-medium text-center leading-[11px]" numberOfLines={2}>This{'\n'}Week</Text>
              <Text className="text-[12px] font-bold text-[#111827] mt-1" numberOfLines={1}>
                {formatCurrency(earningsSummary.weekEarnings || 0)}
              </Text>
              <Text className="text-[8px] text-[#9CA3AF] mt-0.5">this week</Text>
            </TouchableOpacity>

            {/* Card 3: This Month */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('Earnings')}
              className="w-[23.5%] bg-white rounded-[16px] py-3 px-1 items-center justify-center border border-gray-50 shadow-sm" 
              style={{ elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 }}
            >
              <View className="w-10 h-10 rounded-full bg-[#FFEDD5] items-center justify-center mb-2">
                <Ionicons name="calendar-outline" size={18} color="#EA580C" />
              </View>
              <Text className="text-[9px] text-[#4B5563] font-medium text-center leading-[11px]" numberOfLines={2}>This{'\n'}Month</Text>
              <Text className="text-[12px] font-bold text-[#111827] mt-1" numberOfLines={1}>
                {formatCurrency(earningsSummary.monthEarnings || 0)}
              </Text>
              <Text className="text-[8px] text-[#9CA3AF] mt-0.5">this month</Text>
            </TouchableOpacity>

            {/* Card 4: Total Orders */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('OrderManagement')}
              className="w-[23.5%] bg-white rounded-[16px] py-3 px-1 items-center justify-center border border-gray-50 shadow-sm" 
              style={{ elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 }}
            >
              <View className="w-10 h-10 rounded-full bg-[#DBEAFE] items-center justify-center mb-2">
                <Ionicons name="cube-outline" size={18} color="#2563EB" />
              </View>
              <Text className="text-[9px] text-[#4B5563] font-medium text-center leading-[11px]" numberOfLines={2}>Completed{'\n'}Orders</Text>
              <Text className="text-[13px] font-bold text-[#111827] mt-1">
                {earningsSummary.completedOrders || 0}
              </Text>
              <Text className="text-[8px] text-[#9CA3AF] mt-0.5">Completed</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Activities */}
          <View className="mx-4 mt-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[15px] font-bold text-[#111827]">Upcoming Activities</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')}>
                <Text className="text-[12px] font-semibold text-[#297C11]">View All</Text>
              </TouchableOpacity>
            </View>
            
            <View className="bg-white rounded-[16px] px-4 py-1 border border-gray-50 shadow-sm" style={{ elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 }}>
              {/* Row 1: Pickup Orders */}
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => navigation.navigate('OrderManagement')}
                className="flex-row items-center justify-between py-3 border-b border-[#F3F4F6]"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-11 h-11 rounded-[10px] bg-[#EBF7EE] items-center justify-center mr-3 border border-[#D5EFE0]">
                    <Ionicons name="calendar-outline" size={20} color="#297C11" />
                  </View>
                  <View>
                    <Text className="text-[14px] font-bold text-[#111827]">{pickupCount} {pickupCount === 1 ? 'Order' : 'Orders'}</Text>
                    <Text className="text-[12px] text-[#6B7280] mt-0.5">Scheduled for Pickup</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Row 2: Delivery Orders */}
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => navigation.navigate('OrderManagement')}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-11 h-11 rounded-[10px] bg-[#FFEDD5] items-center justify-center mr-3 border border-[#FDE68A]">
                    <Ionicons name="calendar-outline" size={20} color="#EA580C" />
                  </View>
                  <View>
                    <Text className="text-[14px] font-bold text-[#111827]">{deliveryCount} {deliveryCount === 1 ? 'Order' : 'Orders'}</Text>
                    <Text className="text-[12px] text-[#6B7280] mt-0.5">Scheduled for Delivery</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Completed Orders / Earnings */}
          <View className="mx-4 mt-6 mb-8">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[15px] font-bold text-[#111827]">Recent Completed Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
                <Text className="text-[12px] font-semibold text-[#297C11]">View All</Text>
              </TouchableOpacity>
            </View>
            
            <View className="bg-white rounded-[16px] px-4 py-1 border border-gray-50 shadow-sm" style={{ elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 }}>
              {recentEarnings.length > 0 ? (
                recentEarnings.slice(0, 4).map((item: any, index: number) => {
                  const orderNum = item.orderNumber || item.orderId || 'ORD';
                  const isRedirectedItem = item.earningType === 'REDIRECTED' || Number(item.amount) === 5;
                  const labelText = isRedirectedItem ? 'Redirected Completed' : 'Completed Order';
                  return (
                    <TouchableOpacity 
                      key={item.id || index}
                      activeOpacity={0.7} 
                      onPress={() => navigation.navigate('Earnings')}
                      className={`flex-row items-center justify-between py-3 ${index < recentEarnings.slice(0, 4).length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
                    >
                      <View className="flex-row items-center flex-1">
                        <View className={`w-11 h-11 rounded-[10px] ${isRedirectedItem ? 'bg-[#F3E8FF] border-[#E9D5FF]' : 'bg-[#EBF7EE] border-[#D5EFE0]'} items-center justify-center mr-3 border`}>
                          <Ionicons name={isRedirectedItem ? "swap-horizontal" : "cube-outline"} size={20} color={isRedirectedItem ? "#9333EA" : "#297C11"} />
                        </View>
                        <View className="flex-1 pr-1">
                          <Text className="text-[14px] font-bold text-[#111827]" numberOfLines={1}>{orderNum}</Text>
                          <Text className="text-[11px] text-[#6B7280] mt-0.5" numberOfLines={1}>{labelText}</Text>
                        </View>
                      </View>
                      <View className="items-end pl-1 justify-center">
                        <View className={`px-2 py-0.5 rounded-full mb-1 border ${isRedirectedItem ? 'bg-[#F3E8FF] border-[#E9D5FF]' : 'bg-[#EBF7EE] border-[#D5EFE0]'}`}>
                          <Text className={`text-[9px] font-bold ${isRedirectedItem ? 'text-[#9333EA]' : 'text-[#297C11]'}`}>{isRedirectedItem ? 'Redirected' : 'Completed'}</Text>
                        </View>
                        <Text className="text-[12px] font-bold text-[#297C11]">+{formatCurrency(item.amount || (isRedirectedItem ? 5 : 15))}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" className="ml-2" />
                    </TouchableOpacity>
                  );
                })
              ) : deliveredOrders.length > 0 ? (
                deliveredOrders.slice(0, 4).map((item: any, index: number) => {
                  const isRedirectedItem = !!(item.isRedirected || item.isPickupRedirected);
                  return (
                    <TouchableOpacity 
                      key={item.id || index}
                      activeOpacity={0.7} 
                      onPress={() => navigation.navigate('OrderManagement')}
                      className={`flex-row items-center justify-between py-3 ${index < deliveredOrders.slice(0, 4).length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
                    >
                      <View className="flex-row items-center flex-1">
                        <View className={`w-11 h-11 rounded-[10px] ${isRedirectedItem ? 'bg-[#F3E8FF] border-[#E9D5FF]' : 'bg-[#EBF7EE] border-[#D5EFE0]'} items-center justify-center mr-3 border`}>
                          <Ionicons name={isRedirectedItem ? "swap-horizontal" : "cube-outline"} size={20} color={isRedirectedItem ? "#9333EA" : "#297C11"} />
                        </View>
                        <View className="flex-1 pr-1">
                          <Text className="text-[14px] font-bold text-[#111827]" numberOfLines={1}>{item.orderId || item.id || 'ORD'}</Text>
                          <Text className="text-[11px] text-[#6B7280] mt-0.5" numberOfLines={1}>{isRedirectedItem ? 'Redirected Completed' : 'Completed'}</Text>
                        </View>
                      </View>
                      <View className="items-end pl-1 justify-center">
                        <View className={`px-2 py-0.5 rounded-full mb-1 border ${isRedirectedItem ? 'bg-[#F3E8FF] border-[#E9D5FF]' : 'bg-[#EBF7EE] border-[#D5EFE0]'}`}>
                          <Text className={`text-[9px] font-bold ${isRedirectedItem ? 'text-[#9333EA]' : 'text-[#297C11]'}`}>{isRedirectedItem ? 'Redirected' : 'Completed'}</Text>
                        </View>
                        <Text className="text-[12px] font-bold text-[#297C11]">+{isRedirectedItem ? '₹5' : '₹15'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" className="ml-2" />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="py-6 items-center justify-center">
                  <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
                  <Text className="text-[12px] font-semibold text-slate-400 mt-1">No completed orders yet</Text>
                </View>
              )}
            </View>
          </View>

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
              className="absolute z-50 left-6 right-6 top-[68px] bg-white border border-[#D5EFE0] rounded-[28px] overflow-hidden"
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

                {/* Clear All Option */}
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

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}