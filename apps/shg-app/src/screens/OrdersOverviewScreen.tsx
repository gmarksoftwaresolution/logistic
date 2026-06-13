import React, { useContext, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { useOrders, Order } from '../context/OrderContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SharedHeader } from '../components/SharedHeader';
import { getRouteForOrder, getFormattedOrderId, translateRoutePart, getModalAddresses } from '../utils/orderHelpers';
import { LanguageContext } from '../context/LanguageContext';
import { DashboardLoader } from '../components/DashboardLoader';
import { AddressDetailsModal } from '../components/AddressDetailsModal';
import { HighlightCardWrapper } from '../components/HighlightCardWrapper';

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
  const { incomingOrders, acceptedOrders, rejectedOrders, deliveredOrders, returnedOrders, refreshOrdersList, isOrdersLoading, highlightedOrders } = useOrders();

  useFocusEffect(
    useCallback(() => {
      refreshOrdersList();
    }, [refreshOrdersList])
  );

  // Helper to translate route parts on the UI level without breaking core logic
  const translateRoute = (route: string) => {
    return route.split('>').map(part => translateRoutePart(part, t)).join(' > ');
  };
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedAddressOrder, setSelectedAddressOrder] = useState<Order | null>(null);

  // Build real activity list from live order state — NO hardcoded demo data
  const recentActivities = [
    ...acceptedOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: translateRoute(getRouteForOrder(order)),
      details: `${order.remainingQty || 1} ${t("su_products") || "products"} • ${order.weight || 2} ${t("su_kg") || "kg"}`,
      time: order.acceptedAt || '',
      status: t('overview_accepted') || 'Accepted',
      _sortKey: order.acceptedAt || '',
      originalOrder: order,
    })),
    ...rejectedOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: translateRoute(getRouteForOrder(order)),
      details: `${order.remainingQty || 1} ${t("su_products") || "products"} • ${order.weight || 2} ${t("su_kg") || "kg"}`,
      time: order.rejectedAt || '',
      status: t('overview_rejected') || 'Rejected',
      _sortKey: order.rejectedAt || '',
      originalOrder: order,
    })),
    ...deliveredOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: translateRoute(getRouteForOrder(order)),
      details: `${order.remainingQty || 1} ${t("su_products") || "products"} • ${order.weight || 2} ${t("su_kg") || "kg"}`,
      time: order.completedAt || '',
      status: t('overview_completed') || 'Completed',
      _sortKey: order.completedAt || '',
      originalOrder: order,
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

  const isInitialLoad = isOrdersLoading && incomingOrders.length === 0 && acceptedOrders.length === 0 && rejectedOrders.length === 0 && deliveredOrders.length === 0;

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          
          {/* Custom Navbar */}
          <SharedHeader 
            title={t("title_order_management")} 
            subtitle={t("subtitle_order_management")} 
            navigation={navigation} 
          />

          {/* Dashboard Gradient Cards */}
          <View className="px-4 mt-6 flex-row flex-wrap justify-between">
            
            {/* New Orders */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('IncomingOrders')}
              className="w-full rounded-[24px] mb-4 shadow-sm"
              style={{ 
                shadowColor: '#004797', 
                shadowOffset: { width: 0, height: 8 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 12, 
                elevation: 8 
              }}
            >
              <View className="rounded-[24px] overflow-hidden flex-1">
                <LinearGradient colors={['#004797', '#0071D5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1 relative">
                  {/* Background Decoration */}
                  <View className="absolute inset-0 overflow-hidden rounded-[24px]">
                    <Ionicons name="cube-outline" size={140} color="rgba(255,255,255,0.08)" style={{ position: 'absolute', bottom: -30, right: -30, transform: [{ rotate: '-10deg' }] }} />
                    <View style={{ position: 'absolute', top: '30%', left: '20%', width: 60, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', transform: [{ rotate: '-45deg' }] }} />
                    <View style={{ position: 'absolute', top: '40%', left: '30%', width: 80, height: 2, backgroundColor: 'rgba(255,255,255,0.15)', transform: [{ rotate: '-45deg' }] }} />
                  </View>
                  {/* Content */}
                  <View className="flex-row justify-between items-start relative z-10">
                    <Text className="text-[15px] font-semibold text-white/90 tracking-wide mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_new_orders")}</Text>
                    <View className="w-9 h-9 rounded-full border border-white/30 items-center justify-center relative overflow-hidden bg-white/20">
                      <Feather name="package" size={16} color="#FFFFFF" />
                      <View className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
                    </View>
                  </View>
                  <View className="mt-6 relative z-10">
                    <Text className="text-[48px] font-bold text-white tracking-tight leading-[56px]" adjustsFontSizeToFit numberOfLines={1}>{incomingOrders.length}</Text>
                    <Text className="text-[11px] font-medium text-white/80 mt-1" numberOfLines={1}>{t("overview_incoming_items")}</Text>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>

            {/* Accepted */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('AcceptedOrders')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm"
              style={{ 
                shadowColor: '#3F1E9A', 
                shadowOffset: { width: 0, height: 8 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 12, 
                elevation: 8 
              }}
            >
              <View className="rounded-[24px] overflow-hidden flex-1">
                <LinearGradient colors={['#3F1E9A', '#6D3CD8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1 relative">
                  {/* Background Decoration */}
                  <View className="absolute inset-0 overflow-hidden rounded-[24px]">
                    <Feather name="clock" size={140} color="rgba(255,255,255,0.06)" style={{ position: 'absolute', bottom: -30, right: -30 }} />
                    <View style={{ position: 'absolute', bottom: -20, right: -20, width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                    <View style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }} />
                  </View>
                  {/* Content */}
                  <View className="flex-row justify-between items-start relative z-10">
                    <Text className="text-[15px] font-semibold text-white/90 tracking-wide mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_accepted")}</Text>
                    <View className="w-9 h-9 rounded-full border border-white/30 items-center justify-center relative overflow-hidden bg-white/20">
                      <Feather name="clock" size={16} color="#FFFFFF" />
                      <View className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
                    </View>
                  </View>
                  <View className="mt-6 relative z-10">
                    <Text className="text-[48px] font-bold text-white tracking-tight leading-[56px]" adjustsFontSizeToFit numberOfLines={1}>{acceptedOrders.length}</Text>
                    <Text className="text-[11px] font-medium text-white/80 mt-1" numberOfLines={1}>{t("overview_accepted_desc")}</Text>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>

            {/* Return Orders */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('ReturnOrders' as never)}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm"
              style={{ 
                shadowColor: '#D34800', 
                shadowOffset: { width: 0, height: 8 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 12, 
                elevation: 8 
              }}
            >
              <View className="rounded-[24px] overflow-hidden flex-1">
                <LinearGradient colors={['#D34800', '#FFA400']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1 relative">
                  {/* Background Decoration */}
                  <View className="absolute inset-0 overflow-hidden rounded-[24px]">
                    <Feather name="corner-up-left" size={160} color="rgba(255,255,255,0.06)" style={{ position: 'absolute', bottom: -40, right: -20 }} />
                    <View style={{ position: 'absolute', bottom: -100, right: -40, width: 240, height: 240, borderRadius: 120, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                    <View style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />
                  </View>
                  {/* Content */}
                  <View className="flex-row justify-between items-start relative z-10">
                    <Text className="text-[15px] font-semibold text-white/90 tracking-wide mt-1" adjustsFontSizeToFit numberOfLines={1}>Returned </Text>
                    <View className="w-9 h-9 rounded-full border border-white/30 items-center justify-center relative overflow-hidden bg-white/20">
                      <Feather name="corner-up-left" size={16} color="#FFFFFF" />
                      <View className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
                    </View>
                  </View>
                  <View className="mt-6 relative z-10">
                    <Text className="text-[48px] font-bold text-white tracking-tight leading-[56px]" adjustsFontSizeToFit numberOfLines={1}>{returnedOrders.length}</Text>
                    <Text className="text-[11px] font-medium text-white/80 mt-1" numberOfLines={1}>Return / RTO Items</Text>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>

            {/* Rejected */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('RejectedOrders')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm"
              style={{ 
                shadowColor: '#A80A16', 
                shadowOffset: { width: 0, height: 8 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 12, 
                elevation: 8 
              }}
            >
              <View className="rounded-[24px] overflow-hidden flex-1">
                <LinearGradient colors={['#A80A16', '#E72A32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1 relative">
                  {/* Background Decoration */}
                  <View className="absolute inset-0 overflow-hidden rounded-[24px]">
                    <Feather name="x" size={160} color="rgba(255,255,255,0.06)" style={{ position: 'absolute', bottom: -40, right: -40 }} />
                    <View style={{ position: 'absolute', top: 30, right: 60, width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <View style={{ position: 'absolute', bottom: 40, left: 40, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    <View style={{ position: 'absolute', top: 60, left: 20, width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  </View>
                  {/* Content */}
                  <View className="flex-row justify-between items-start relative z-10">
                    <Text className="text-[15px] font-semibold text-white/90 tracking-wide mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_rejected")}</Text>
                    <View className="w-9 h-9 rounded-full border border-white/30 items-center justify-center relative overflow-hidden bg-white/20">
                      <Feather name="x" size={16} color="#FFFFFF" />
                      <View className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
                    </View>
                  </View>
                  <View className="mt-6 relative z-10">
                    <Text className="text-[48px] font-bold text-white tracking-tight leading-[56px]" adjustsFontSizeToFit numberOfLines={1}>{rejectedOrders.length}</Text>
                    <Text className="text-[11px] font-medium text-white/80 mt-1" numberOfLines={1}>{t("overview_rejected_desc")}</Text>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>

            {/* Completed */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('CompletedOrders')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm"
              style={{ 
                shadowColor: '#005A12', 
                shadowOffset: { width: 0, height: 8 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 12, 
                elevation: 8 
              }}
            >
              <View className="rounded-[24px] overflow-hidden flex-1">
                <LinearGradient colors={['#005A12', '#159121']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1 relative">
                  {/* Background Decoration */}
                  <View className="absolute inset-0 overflow-hidden rounded-[24px]">
                    <Ionicons name="checkmark-circle-outline" size={160} color="rgba(255,255,255,0.08)" style={{ position: 'absolute', bottom: -40, right: -40 }} />
                    <View style={{ position: 'absolute', bottom: -80, right: -20, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.03)' }} />
                    <View style={{ position: 'absolute', bottom: -120, left: -40, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.03)' }} />
                  </View>
                  {/* Content */}
                  <View className="flex-row justify-between items-start relative z-10">
                    <Text className="text-[15px] font-semibold text-white/90 tracking-wide mt-1" adjustsFontSizeToFit numberOfLines={1}>{t("overview_completed")}</Text>
                    <View className="w-9 h-9 rounded-full border border-white/30 items-center justify-center relative overflow-hidden bg-white/20">
                      <Feather name="check" size={16} color="#FFFFFF" />
                      <View className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-sm" />
                    </View>
                  </View>
                  <View className="mt-6 relative z-10">
                    <Text className="text-[48px] font-bold text-white tracking-tight leading-[56px]" adjustsFontSizeToFit numberOfLines={1}>{deliveredOrders.length}</Text>
                    <Text className="text-[11px] font-medium text-white/80 mt-1" numberOfLines={1}>{t("overview_completed_desc")}</Text>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>

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
                  <HighlightCardWrapper key={index} isHighlighted={highlightedOrders[activity.originalOrder.id]}>
                    <View
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

                          <View className="mb-2 mt-1">
                            <View className="flex-row items-center pr-2">
                              <Text className="text-[13px] font-extrabold text-[#111827] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{activity.route.split(' > ')[0]}</Text>
                              <Ionicons name="arrow-forward" size={12} color="#94A3B8" style={{ marginHorizontal: 6 }} />
                              <Text className="text-[13px] font-extrabold text-[#111827] flex-shrink" numberOfLines={1} ellipsizeMode="tail">{activity.route.split(' > ')[1]}</Text>
                            </View>
                          </View>
                          
                          {/* View Address Button */}
                          <TouchableOpacity 
                            onPress={() => setSelectedAddressOrder(activity.originalOrder)} 
                            activeOpacity={0.7}
                            className="mt-2 mb-4 self-start flex-row items-center px-2 py-0.5 rounded-[6px] border border-[#22C55E]/40 bg-[#F0FDF4]"
                          >
                            <Ionicons name="location-outline" size={10} color="#16A34A" style={{ marginRight: 4 }} />
                            <Text className="text-[10px] font-bold text-[#16A34A] tracking-wide">
                              {t("view_address") || "View Address"}
                            </Text>
                          </TouchableOpacity>

                          <View className="flex-row justify-between items-center">
                            <Text className="text-[13px] text-[#8792A1] font-medium">{activity.details}</Text>
                            <Text className="text-[12px] text-[#8792A1] font-medium">{activity.time}</Text>
                          </View>
                        </View>
                      </BlurView>
                    </View>
                  </HighlightCardWrapper>
                );
              })
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
      {selectedAddressOrder && (() => {
        const { pickup, delivery } = getModalAddresses(selectedAddressOrder, t);
        return (
          <AddressDetailsModal
            visible={!!selectedAddressOrder}
            onClose={() => setSelectedAddressOrder(null)}
            orderIdText={getFormattedOrderId(selectedAddressOrder)}
            pickupAddress={pickup}
            deliveryAddress={delivery}
            distance={selectedAddressOrder.distance || '0'}
          />
        );
      })()}
      {isInitialLoad && <DashboardLoader t={t} />}
    </View>
  );
};

export default OrdersOverviewScreen;
