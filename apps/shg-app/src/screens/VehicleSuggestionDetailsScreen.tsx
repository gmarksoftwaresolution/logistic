import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OrdersStackParamList } from '../navigation/types';
import { LanguageContext } from '../context/LanguageContext';
import { getRouteForOrder, translateRoutePart, getFormattedOrderId } from '../utils/orderHelpers';

type Props = NativeStackScreenProps<OrdersStackParamList, 'VehicleSuggestionDetails'>;

const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
  switch (icon) {
    case 'bike': return 'bicycle-outline';
    case 'car': return 'car-sport-outline';
    case 'auto': return 'bus-outline';
    case 'pickup': return 'car-outline';
    case 'minivan': return 'bus-outline';
    case 'truck': return 'car-outline';
    case 'tractor': return 'car-outline';
    default: return 'car-outline';
  }
};

const VehicleSuggestionDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { order } = route.params;
  const context = useContext(LanguageContext);
  const { t } = context!;
  
  const routeText = getRouteForOrder(order);
  const routeParts = routeText.split('>');
  const pickup = translateRoutePart(routeParts[0]?.trim() || 'Seller', t);
  const drop = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 items-center justify-center bg-slate-50 rounded-full border border-slate-200"
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="text-[18px] font-bold text-slate-800">
            {t("order_details") || "Order Details"}
          </Text>
          <Text className="text-[12px] font-medium text-[#16A34A]">
            {t("vehicle_suggestion_for_this_order") || "Vehicle suggestion for this order"}
          </Text>
        </View>
        <View className="w-10 h-10 items-center justify-center bg-slate-50 rounded-full border border-slate-200">
          <Ionicons name="help-outline" size={20} color="#64748B" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Top Info Card */}
        <View className="bg-white rounded-[16px] p-4 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-slate-100">
            <View className="bg-emerald-50 px-2.5 py-1 rounded-full flex-row items-center border border-emerald-200">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              <Text className="text-emerald-700 font-bold text-[10px]">New Request</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-slate-800 font-black text-[13px] mr-1.5">
                #{getFormattedOrderId(order)}
              </Text>
              <Ionicons name="copy-outline" size={14} color="#94A3B8" />
            </View>
          </View>

          <View className="flex-row">
            {/* Left: Route */}
            <View className="flex-1 pr-4">
              <View className="flex-row">
                <View className="items-center mr-3 mt-1">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                  <View className="w-[1px] h-8 bg-slate-200 my-0.5" />
                  <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </View>
                <View className="flex-1">
                  <View className="mb-3">
                    <Text className="text-slate-800 font-bold text-[14px]">{pickup}</Text>
                    <Text className="text-slate-400 text-[11px] font-medium mt-0.5">Pickup Location</Text>
                  </View>
                  <View>
                    <Text className="text-slate-800 font-bold text-[14px]">{drop}</Text>
                    <Text className="text-slate-400 text-[11px] font-medium mt-0.5">Drop-off Location</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity className="mt-4 flex-row items-center px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 self-start">
                <Ionicons name="location-outline" size={12} color="#10B981" className="mr-1" />
                <Text className="text-emerald-600 font-bold text-[11px]">View Address</Text>
              </TouchableOpacity>
            </View>

            {/* Vertical Divider */}
            <View className="w-[1px] bg-slate-100" />

            {/* Right: Info */}
            <View className="flex-1 pl-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="cube-outline" size={16} color="#4F46E5" className="mr-2.5 w-4 text-center" />
                <View>
                  <Text className="text-slate-500 text-[10px] font-medium">Quantity</Text>
                  <Text className="text-slate-800 font-bold text-[12px]">{order.remainingQty || 1} Items</Text>
                </View>
              </View>
              
              <View className="flex-row items-center mb-3">
                <Ionicons name="scale-outline" size={16} color="#059669" className="mr-2.5 w-4 text-center" />
                <View>
                  <Text className="text-slate-500 text-[10px] font-medium">Parcel Weight</Text>
                  <Text className="text-[#059669] font-black text-[12px]">{order.parcelWeight} kg</Text>
                </View>
              </View>

              <View className="flex-row items-center mb-3">
                <Ionicons name="calendar-outline" size={16} color="#94A3B8" className="mr-2.5 w-4 text-center" />
                <View>
                  <Text className="text-slate-500 text-[10px] font-medium">Pickup Date</Text>
                  <Text className="text-slate-700 font-semibold text-[12px]">{order.date}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#94A3B8" className="mr-2.5 w-4 text-center" />
                <View>
                  <Text className="text-slate-500 text-[10px] font-medium">Pickup Time</Text>
                  <Text className="text-slate-700 font-semibold text-[12px]">{order.time}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Suggestion Section */}
        {order.recommendedVehicle && (
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-[#ECFDF5] items-center justify-center mr-3">
                <Ionicons name="car-sport" size={16} color="#10B981" />
              </View>
              <View>
                <Text className="text-slate-800 font-bold text-[15px]">Vehicle Suggestion</Text>
                <Text className="text-slate-500 text-[11px]">Based on parcel weight and delivery requirement</Text>
              </View>
            </View>

            {/* Recommended Vehicle */}
            <View className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[16px] p-4 mt-3">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <View className="bg-[#22C55E] px-2 py-0.5 rounded flex-row items-center self-start mb-2">
                    <Ionicons name="star" size={10} color="white" className="mr-1" />
                    <Text className="text-white font-bold text-[9px]">Recommended</Text>
                  </View>
                  <Text className="text-[#166534] font-black text-[18px] mb-1">{order.recommendedVehicle.name}</Text>
                  <Text className="text-[#15803D] text-[12px] font-medium">Ideal for this order</Text>
                </View>
                <View className="items-end">
                  <View className="bg-[#DCFCE7] px-2.5 py-1 rounded-md mb-2">
                    <Text className="text-[#166534] font-bold text-[11px]">Up to {order.recommendedCapacity} kg</Text>
                  </View>
                  <Ionicons name={getIconName(order.recommendedVehicle.icon)} size={32} color="#16A34A" style={{ opacity: 0.8 }} />
                </View>
              </View>
              
              <View className="bg-[#DCFCE7]/60 rounded-xl px-3 py-2.5 flex-row items-center border border-[#BBF7D0]/50">
                <View className="w-5 h-5 rounded-full bg-[#22C55E] items-center justify-center mr-2.5">
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
                <Text className="text-[#166534] font-medium text-[12px] flex-1">This vehicle can easily handle {order.parcelWeight} kg parcel weight.</Text>
              </View>
            </View>

            {/* Other Suitable Options */}
            {order.otherSuitableVehicles && order.otherSuitableVehicles.length > 0 && (
              <View className="mt-6">
                <Text className="text-slate-800 font-bold text-[14px] mb-3">Other Suitable Options</Text>
                {order.otherSuitableVehicles.map((v: any) => (
                  <View key={v.id} className="flex-row items-center bg-white border border-slate-200 rounded-[16px] p-4 mb-3">
                    <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mr-4 border border-slate-100">
                      <Ionicons name={getIconName(v.icon)} size={24} color="#64748B" />
                    </View>
                    <View className="flex-1 pr-3">
                      <Text className="text-slate-800 font-bold text-[15px] mb-0.5">{v.name}</Text>
                      <Text className="text-slate-500 text-[11px] mb-1.5" numberOfLines={1}>{v.description}</Text>
                      <View className="bg-indigo-50 px-2 py-0.5 rounded self-start">
                        <Text className="text-indigo-600 font-bold text-[10px]">Up to {v.capacity} kg</Text>
                      </View>
                    </View>
                    <Ionicons name="radio-button-off" size={24} color="#CBD5E1" />
                  </View>
                ))}
              </View>
            )}

            {/* Info Footer */}
            <View className="bg-amber-50 rounded-[12px] p-3 flex-row items-center justify-between border border-amber-100 mt-2 mb-8">
              <View className="flex-row items-center">
                <Ionicons name="bulb-outline" size={16} color="#D97706" className="mr-2" />
                <Text className="text-slate-700 text-[12px] font-medium">Vehicle suggestions are based on parcel weight.</Text>
              </View>
              <Text className="text-[#0284C7] text-[12px] font-bold">Learn More {'>'}</Text>
            </View>
          </View>
        )}
        <View className="h-[90px]" />
      </ScrollView>

      {/* Footer Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-8 flex-row items-center pt-3">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="flex-1 bg-white border border-[#073318] rounded-xl py-4 items-center justify-center mr-2"
        >
          <Text className="text-[#073318] font-bold text-[15px]">Close</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('OrderDetails', { order })}
          className="flex-1 bg-[#073318] rounded-xl py-4 flex-row items-center justify-center ml-2 shadow-sm"
        >
          <Text className="text-white font-bold text-[15px] mr-2">Proceed</Text>
          <Ionicons name="chevron-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VehicleSuggestionDetailsScreen;
