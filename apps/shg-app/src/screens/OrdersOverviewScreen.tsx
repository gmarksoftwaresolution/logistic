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
import { getRouteForOrder, getFormattedOrderId } from '../utils/orderHelpers';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'OrdersOverview'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const OrdersOverviewScreen: React.FC<Props> = ({ navigation }) => {
  const { incomingOrders, acceptedOrders, rejectedOrders, deliveredOrders } = useOrders();

  // Build real activity list from live order state — NO hardcoded demo data
  const recentActivities = [
    ...acceptedOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: getRouteForOrder(order),
      details: `${order.remainingQty || 1} products • ${order.weight || 2} kg`,
      time: order.acceptedAt || '',
      status: 'Accepted',
      _sortKey: order.acceptedAt || '',
    })),
    ...rejectedOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: getRouteForOrder(order),
      details: `${order.remainingQty || 1} products • ${order.weight || 2} kg`,
      time: order.rejectedAt || '',
      status: 'Rejected',
      _sortKey: order.rejectedAt || '',
    })),
    ...deliveredOrders.map(order => ({
      id: `#${getFormattedOrderId(order)}`,
      route: getRouteForOrder(order),
      details: `${order.remainingQty || 1} products • ${order.weight || 2} kg`,
      time: order.completedAt || '',
      status: 'Completed',
      _sortKey: order.completedAt || '',
    })),
  ].sort((a, b) => b._sortKey.localeCompare(a._sortKey));

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Picked':
        return { bg: 'bg-[#EEF4FF]', text: 'text-[#2D73D5]' };
      case 'Dropped':
      case 'Accepted':
      case 'Completed':
      case 'COMPLETED':
        return { bg: 'bg-[#D1F2D9]', text: 'text-[#1B7034]' };
      case 'Rejected':
      case 'REJECTED':
        return { bg: 'bg-[#FEECEE]', text: 'text-[#D0303F]' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

  return (
    <LinearGradient 
      colors={['#EAF5F8', '#F5F7FA', '#E8F5E9']} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }} 
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* Custom Navbar */}
          <SharedHeader 
            title="Order Management" 
            subtitle="Real-time batch & hub transfers" 
            navigation={navigation} 
          />

          {/* Dashboard Gradient Cards */}
          <View className="px-4 mt-6 flex-row flex-wrap justify-between">
            
            {/* New Orders */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('IncomingOrders')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm overflow-hidden"
              style={{ elevation: 3 }}
            >
              <LinearGradient colors={['#0265AD', '#0097FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className="text-[15px] font-bold text-white mt-1">New Orders</Text>
                  <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                    <Feather name="package" size={14} color="#FFFFFF" />
                    <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                  </View>
                </View>
                <View className="mt-5">
                  <Text className="text-[40px] font-black text-white leading-[48px]">{incomingOrders.length}</Text>
                  <Text className="text-[11px] text-white/90 mt-1 font-medium">Incoming items</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Accepted */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('AcceptedOrders')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm overflow-hidden"
              style={{ elevation: 3 }}
            >
              <LinearGradient colors={['#5B4FAD', '#897CE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className="text-[15px] font-bold text-white mt-1">Accepted</Text>
                  <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                    <Feather name="clock" size={14} color="#FFFFFF" />
                    <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                  </View>
                </View>
                <View className="mt-5">
                  <Text className="text-[40px] font-black text-white leading-[48px]">{acceptedOrders.length}</Text>
                  <Text className="text-[11px] text-white/90 mt-1 font-medium">Accepted to process</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Rejected */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('RejectedOrders')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm overflow-hidden"
              style={{ elevation: 3 }}
            >
              <LinearGradient colors={['#BA2931', '#F05A61']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className="text-[15px] font-bold text-white mt-1">Rejected</Text>
                  <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                    <Feather name="x" size={14} color="#FFFFFF" />
                    <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                  </View>
                </View>
                <View className="mt-5">
                  <Text className="text-[40px] font-black text-white leading-[48px]">{rejectedOrders.length}</Text>
                  <Text className="text-[11px] text-white/90 mt-1 font-medium">With specific reason</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Completed */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('OrderHistory')}
              className="w-[48%] rounded-[24px] mb-4 shadow-sm overflow-hidden"
              style={{ elevation: 3 }}
            >
              <LinearGradient colors={['#297C11', '#51B833']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className="text-[15px] font-bold text-white mt-1">Completed</Text>
                  <View className="w-8 h-8 rounded-full border border-white/30 items-center justify-center relative bg-white/10">
                    <Feather name="check" size={14} color="#FFFFFF" />
                    <View className="absolute top-0 right-0 w-1.5 h-1.5 bg-white rounded-full" />
                  </View>
                </View>
                <View className="mt-5">
                  <Text className="text-[40px] font-black text-white leading-[48px]">{deliveredOrders.length}</Text>
                  <Text className="text-[11px] text-white/90 mt-1 font-medium">Completed transports</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* Recent Activity Header */}
          <View className="flex-row justify-between items-center px-5 mt-2 mb-4">
            <Text className="text-xl font-extrabold text-[#1A1A1A]">Recent Activity</Text>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-[#073318]">View All</Text>
            </TouchableOpacity>
          </View>

          {/* Glassy Recent Activity List */}
          <View className="px-4">
            {recentActivities.length === 0 ? (
              <View className="items-center justify-center py-16">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#E2E8F0' }}
                >
                  <Ionicons name="time-outline" size={30} color="#94A3B8" />
                </View>
                <Text className="text-[15px] font-bold text-slate-500 text-center">No recent activity</Text>
                <Text className="text-[12px] text-slate-400 text-center mt-1 px-8">
                  Your accepted, completed and rejected orders will appear here
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

                        <Text className="text-[16px] font-extrabold text-[#111827] mb-4 tracking-tight">
                          {activity.route}
                        </Text>

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
    </LinearGradient>
  );
};

export default OrdersOverviewScreen;
