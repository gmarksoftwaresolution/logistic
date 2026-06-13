import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { useOrders } from '../context/OrderContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SharedHeader } from '../components/SharedHeader';
import { getRouteForOrder, getFormattedOrderId, translateRoutePart } from '../utils/orderHelpers';
import { LanguageContext } from '../context/LanguageContext';
import TextTicker from 'react-native-text-ticker';
import WalkthroughElement from '../components/WalkthroughElement';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'OrdersOverview'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const OrdersOverviewScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  const { incomingOrders, acceptedOrders, rejectedOrders, deliveredOrders } = useOrders();

  // Helper to translate route parts on the UI level without breaking core logic
  const translateRoute = (route: string) => {
    return route.split('>').map(part => translateRoutePart(part, t)).join(' > ');
  };

  // Build real activity list from live order state — NO hardcoded demo data
  const recentActivities = [
    ...acceptedOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: translateRoute(getRouteForOrder(order)),
      details: `${order.remainingQty || 1} ${t("su_products") || "products"} • ${order.weight || 2} ${t("su_kg") || "kg"}`,
      time: order.acceptedAt || '',
      status: t('overview_accepted') || 'Accepted',
      _sortKey: order.acceptedAt || '',
    })),
    ...rejectedOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: translateRoute(getRouteForOrder(order)),
      details: `${order.remainingQty || 1} ${t("su_products") || "products"} • ${order.weight || 2} ${t("su_kg") || "kg"}`,
      time: order.rejectedAt || '',
      status: t('overview_rejected') || 'Rejected',
      _sortKey: order.rejectedAt || '',
    })),
    ...deliveredOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: translateRoute(getRouteForOrder(order)),
      details: `${order.remainingQty || 1} ${t("su_products") || "products"} • ${order.weight || 2} ${t("su_kg") || "kg"}`,
      time: order.completedAt || '',
      status: t('overview_completed') || 'Completed',
      _sortKey: order.completedAt || '',
    })),
  ].sort((a, b) => b._sortKey.localeCompare(a._sortKey));

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Picked':
        return { bg: 'bg-[#EEF4FF]', text: 'text-[#2D73D5]' };
      case 'Dropped':
      case 'Accepted':
      case t('overview_accepted'):
      case 'Completed':
      case 'COMPLETED':
      case t('overview_completed'):
        return { bg: 'bg-[#D1F2D9]', text: 'text-[#1B7034]' };
      case 'Rejected':
      case 'REJECTED':
      case t('overview_rejected'):
        return { bg: 'bg-[#FEECEE]', text: 'text-[#D0303F]' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* Custom Navbar */}
          <SharedHeader 
            title={t("title_order_management")} 
            subtitle={t("subtitle_order_management")} 
            navigation={navigation} 
          />

          {/* Dashboard Gradient Cards */}
          <View className="px-4 mt-6 flex-row flex-wrap justify-between">
            
            {/* New Orders */}
            <WalkthroughElement
              stepId="incoming_orders_card"
              style={{ width: '48%', marginBottom: 16 }}
            >
              <TouchableOpacity 
                onPress={() => navigation.navigate('IncomingOrders')}
                className="w-full rounded-[24px] shadow-sm overflow-hidden flex-1"
                style={{ elevation: 3 }}
              >
                <LinearGradient colors={['#0265AD', '#0097FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                  <View className="flex-row justify-between items-start">
                    <Text className="text-[15px] font-bold text-white mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_new_orders")}</Text>
                    <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                      <Feather name="package" size={14} color="#FFFFFF" />
                      <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                    </View>
                  </View>
                  <View className="mt-5">
                    <Text className="text-[40px] font-black text-white leading-[48px]" adjustsFontSizeToFit numberOfLines={1}>{incomingOrders.length}</Text>
                    <Text className="text-[11px] text-white/90 mt-1 font-medium" numberOfLines={1}>{t("overview_incoming_items")}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </WalkthroughElement>

            {/* Accepted */}
            <WalkthroughElement
              stepId="accepted_orders_card"
              style={{ width: '48%', marginBottom: 16 }}
            >
              <TouchableOpacity 
                onPress={() => navigation.navigate('AcceptedOrders')}
                className="w-full rounded-[24px] shadow-sm overflow-hidden flex-1"
                style={{ elevation: 3 }}
              >
                <LinearGradient colors={['#5B4FAD', '#897CE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                  <View className="flex-row justify-between items-start">
                    <Text className="text-[15px] font-bold text-white mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_accepted")}</Text>
                    <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                      <Feather name="clock" size={14} color="#FFFFFF" />
                      <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                    </View>
                  </View>
                  <View className="mt-5">
                    <Text className="text-[40px] font-black text-white leading-[48px]" adjustsFontSizeToFit numberOfLines={1}>{acceptedOrders.length}</Text>
                    <Text className="text-[11px] text-white/90 mt-1 font-medium" numberOfLines={1}>{t("overview_accepted_desc")}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </WalkthroughElement>

            {/* Rejected */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('RejectedOrders')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm overflow-hidden"
              style={{ elevation: 3 }}
            >
              <LinearGradient colors={['#BA2931', '#F05A61']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className="text-[15px] font-bold text-white mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_rejected")}</Text>
                  <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                    <Feather name="x" size={14} color="#FFFFFF" />
                    <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                  </View>
                </View>
                <View className="mt-5">
                  <Text className="text-[40px] font-black text-white leading-[48px]" adjustsFontSizeToFit numberOfLines={1}>{rejectedOrders.length}</Text>
                  <Text className="text-[11px] text-white/90 mt-1 font-medium" numberOfLines={1}>{t("overview_rejected_desc")}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Completed */}
            <WalkthroughElement
              stepId="completed_orders_card"
              style={{ width: '48%', marginBottom: 16 }}
            >
              <TouchableOpacity 
                onPress={() => navigation.navigate('OrderHistory')}
                className="w-full rounded-[24px] shadow-sm overflow-hidden flex-1"
                style={{ elevation: 3 }}
              >
                <LinearGradient colors={['#297C11', '#51B833']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                  <View className="flex-row justify-between items-start">
                    <Text className="text-[15px] font-bold text-white mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_completed")}</Text>
                    <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                      <Feather name="check" size={14} color="#FFFFFF" />
                      <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                    </View>
                  </View>
                  <View className="mt-5">
                    <Text className="text-[40px] font-black text-white leading-[48px]" adjustsFontSizeToFit numberOfLines={1}>{deliveredOrders.length}</Text>
                    <Text className="text-[11px] text-white/90 mt-1 font-medium" numberOfLines={1}>{t("overview_completed_desc")}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </WalkthroughElement>

          </View>

          {/* Recent Activity Header */}
          <View className="flex-row justify-between items-center px-5 mt-2 mb-4">
            <Text className="text-xl font-extrabold text-[#1A1A1A]">{t("recent_activity")}</Text>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-[#073318]">{t("view_all")}</Text>
            </TouchableOpacity>
          </View>

          {/* Glassy Recent Activity List */}
          <View className="px-4">
            {recentActivities.length === 0 ? (
              <View 
                className="items-center justify-center py-12 px-6 rounded-[24px] bg-[#F8FAFC]/40 border-2 border-[#CBD5E1]"
                style={{ borderStyle: 'dashed' }}
              >
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-white shadow-sm"
                  style={{ borderWidth: 1, borderColor: '#E2E8F0' }}
                >
                  <Ionicons name="time-outline" size={28} color="#94A3B8" />
                </View>
                <Text className="text-[16px] font-black text-slate-700 text-center">{t("no_recent_activity")}</Text>
                <Text className="text-[12px] font-semibold text-slate-400 text-center mt-1.5 px-6 leading-5">
                  {t("no_recent_activity_desc")}
                </Text>
              </View>
            ) : (
              recentActivities.map((activity, index) => {
                const statusStyle = getStatusStyle(activity.status);
                return (
                  <View
                    key={index}
                    className="rounded-[24px] mb-4 overflow-hidden border border-white/60"
                    style={{
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.85)'
                    }}
                  >
                    <BlurView intensity={50} tint="light">
                      <View className="p-5 bg-white/70">
                        <View className="flex-row justify-between items-center mb-3">
                          <Text className="text-[14px] font-black text-[#073318] tracking-wide">{activity.id}</Text>
                          <View className={`px-3.5 py-1.5 rounded-full ${statusStyle.bg}`}>
                            <Text className={`text-[11px] font-bold ${statusStyle.text}`}>{activity.status}</Text>
                          </View>
                        </View>

                        <View className="mb-4 overflow-hidden">
                          <TextTicker
                            style={{ fontSize: 16, fontWeight: '900', color: '#111827', letterSpacing: -0.5 }}
                            duration={7000}
                            loop
                            bounce={false}
                            repeatSpacer={50}
                            marqueeDelay={2000}
                            animationType="scroll"
                          >
                            {activity.route}
                          </TextTicker>
                        </View>

                        <View className="flex-row justify-between items-center">
                          <Text className="text-[13px] text-[#8792A1] font-medium">{activity.details}</Text>
                          <Text className="text-[12px] text-[#8792A1] font-medium">{activity.time}</Text>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                );
              })
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default OrdersOverviewScreen;
