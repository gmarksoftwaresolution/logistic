import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OrdersStackParamList } from '../navigation/types';
import { LanguageContext } from '../context/LanguageContext';
import { getRouteForOrder, translateRoutePart, getFormattedOrderId } from '../utils/orderHelpers';
import { useOrders, VehicleInfo } from '../context/OrderContext';
import Toast from 'react-native-toast-message';
import { ActivityIndicator } from 'react-native';

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
  const insets = useSafeAreaInsets();
  const { order } = route.params;
  const context = useContext(LanguageContext);
  const { t } = context!;
  const { acceptOrder } = useOrders();
  
  const [selectedVehicle, setSelectedVehicle] = React.useState<VehicleInfo | null>(order.recommendedVehicle || null);
  const [isAccepting, setIsAccepting] = React.useState(false);
  
  const handleAcceptOrder = async () => {
    if (!selectedVehicle) return;
    try {
      setIsAccepting(true);
      await acceptOrder(order, selectedVehicle);
      Toast.show({
        type: 'success',
        text1: t("su_success_388") || "Success",
        text2: "Order accepted with selected vehicle."
      });
      navigation.navigate('AcceptedOrders', { initialTab: order.legType === 'drop' ? 'drop' : 'pickup' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to accept order.'
      });
    } finally {
      setIsAccepting(false);
    }
  };
  
  const routeText = getRouteForOrder(order);
  const routeParts = routeText.split('>');
  const pickup = translateRoutePart(routeParts[0]?.trim() || 'Seller', t);
  const drop = translateRoutePart(routeParts[1]?.trim() || 'Buyer', t);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Custom Header matching Collection Details layout exactly */}
      <View className="flex-row items-center px-4 mt-4 mb-2 bg-transparent">
        {/* Back Button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => navigation.goBack()} 
          className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border border-white/80 mr-3"
          style={{
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        
        {/* Header Box */}
        <LinearGradient 
          colors={['#FFFFFF', '#E8F5EC']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }}
          className="flex-1 h-[68px] border border-[#D5EFE0] flex-row justify-between items-center px-5" 
          style={{ 
            borderRadius: 30,
            overflow: 'hidden',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <View className="justify-center flex-1 pr-2">
            <Text className="text-[18px] font-extrabold text-[#111827]" numberOfLines={1}>
              {t("vehicle_suggestion_details") || "Vehicle Suggestion Details"}
            </Text>
            <Text className="text-[12px] font-bold text-[#059669] mt-0.5" numberOfLines={1}>
              {t("review_and_select_best_vehicle") || "Review And Select Best Vehicle"}
            </Text>
          </View>
          <TouchableOpacity 
            className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm"
            style={{
              elevation: 2,
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }}
          >
            <Ionicons name="help" size={16} color="#059669" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
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
                  <View className="w-[1px] flex-1 bg-slate-200 my-1" />
                  <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </View>
                <View className="flex-1">
                  <View className="mb-4 pr-1">
                    <Text className="text-slate-800 font-bold text-[14px]" numberOfLines={2} adjustsFontSizeToFit>{pickup}</Text>
                    <Text className="text-slate-400 text-[11px] font-medium mt-0.5">Pickup Location</Text>
                  </View>
                  <View className="pr-1">
                    <Text className="text-slate-800 font-bold text-[14px]" numberOfLines={2} adjustsFontSizeToFit>{drop}</Text>
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
            <View className="flex-1 pl-4 justify-between">
              <View className="flex-row items-center mb-3">
                <Ionicons name="cube-outline" size={16} color="#4F46E5" className="mr-2 w-5 text-center" />
                <View className="flex-1 justify-center">
                  <Text className="text-slate-500 text-[10px] font-medium leading-none mb-1">Quantity</Text>
                  <Text className="text-slate-800 font-bold text-[12px] leading-none">{order.remainingQty || 1} Items</Text>
                </View>
              </View>
              
              <View className="flex-row items-center mb-3">
                <Ionicons name="scale-outline" size={16} color="#059669" className="mr-2 w-5 text-center" />
                <View className="flex-1 justify-center">
                  <Text className="text-slate-500 text-[10px] font-medium leading-none mb-1">Parcel Weight</Text>
                  <Text className="text-[#059669] font-black text-[14px] leading-none">{order.parcelWeight} kg</Text>
                </View>
              </View>

              <View className="flex-row items-center mb-3">
                <Ionicons name="calendar-outline" size={16} color="#94A3B8" className="mr-2 w-5 text-center" />
                <View className="flex-1 justify-center">
                  <Text className="text-slate-500 text-[10px] font-medium leading-none mb-1">Pickup Date</Text>
                  <Text className="text-slate-700 font-semibold text-[12px] leading-none">{order.date}</Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#94A3B8" className="mr-2 w-5 text-center" />
                <View className="flex-1 justify-center">
                  <Text className="text-slate-500 text-[10px] font-medium leading-none mb-1">Pickup Time</Text>
                  <Text className="text-slate-700 font-semibold text-[12px] leading-none">{order.time}</Text>
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
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => order.recommendedVehicle && setSelectedVehicle(order.recommendedVehicle)}
              className={`rounded-[16px] p-4 mt-3 ${selectedVehicle?.name === order.recommendedVehicle?.name ? 'bg-[#F0FDF4] border-[#16A34A] border-2' : 'bg-white border-slate-200 border'}`}
            >
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-1 pr-3">
                  <View className="bg-[#22C55E] px-2 py-0.5 rounded flex-row items-center self-start mb-1.5">
                    <Ionicons name="star" size={10} color="white" className="mr-1" />
                    <Text className="text-white font-bold text-[9px]">Recommended</Text>
                  </View>
                  <Text className="text-[#166534] font-black text-[18px] leading-tight">{order.recommendedVehicle.name}</Text>
                  <Text className="text-[#15803D] text-[11px] font-medium mt-0.5">Ideal for this order</Text>
                </View>
                <View className="items-end justify-center">
                  <View className="bg-[#DCFCE7] px-2 py-0.5 rounded flex-row items-center border border-[#BBF7D0] mb-1.5">
                    <Text className="text-[#166534] font-bold text-[10px]">Up to {order.recommendedCapacity} kg</Text>
                  </View>
                  <Ionicons name={getIconName(order.recommendedVehicle.icon)} size={36} color="#16A34A" />
                </View>
              </View>
              
              <View className="flex-row items-center mt-2">
                <Ionicons name={selectedVehicle?.name === order.recommendedVehicle?.name ? "radio-button-on" : "radio-button-off"} size={24} color={selectedVehicle?.name === order.recommendedVehicle?.name ? "#16A34A" : "#CBD5E1"} className="mr-3" />
                <View className="bg-[#DCFCE7]/60 rounded-[10px] px-3 py-2 flex-row items-center border border-[#BBF7D0]/50 flex-1">
                  <View className="w-4 h-4 rounded-full bg-[#22C55E] items-center justify-center mr-2">
                    <Ionicons name="checkmark" size={10} color="white" />
                  </View>
                  <Text className="text-[#166534] font-medium text-[11px] flex-1 leading-tight">This vehicle can easily handle {order.parcelWeight} kg parcel weight.</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Other Suitable Options */}
            {order.otherSuitableVehicles && order.otherSuitableVehicles.length > 0 && (
              <View className="mt-6">
                <Text className="text-slate-800 font-bold text-[14px] mb-3">Other Suitable Options</Text>
                {order.otherSuitableVehicles.map((v: any) => (
                  <TouchableOpacity 
                    key={v.id} 
                    activeOpacity={0.7}
                    onPress={() => setSelectedVehicle(v)}
                    className={`flex-row items-center rounded-[16px] p-4 mb-3 ${selectedVehicle?.name === v.name ? 'bg-[#F0FDF4] border-[#16A34A] border-2' : 'bg-white border-slate-200 border'}`}
                  >
                    <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center mr-3 border border-slate-100">
                      <Ionicons name={getIconName(v.icon)} size={24} color={selectedVehicle?.name === v.name ? "#16A34A" : "#64748B"} />
                    </View>
                    <View className="flex-1 pr-3 justify-center">
                      <Text className="text-slate-800 font-bold text-[15px] leading-tight mb-0.5">{v.name}</Text>
                      <Text className="text-slate-500 text-[11px] mb-1.5 leading-tight" numberOfLines={1}>{v.description}</Text>
                      <View className="bg-indigo-50 px-2 py-0.5 rounded flex-row self-start items-center border border-indigo-100/50">
                        <Text className="text-indigo-600 font-bold text-[10px]">Up to {v.capacity} kg</Text>
                      </View>
                    </View>
                    <Ionicons name={selectedVehicle?.name === v.name ? "radio-button-on" : "radio-button-off"} size={24} color={selectedVehicle?.name === v.name ? "#16A34A" : "#CBD5E1"} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Info Footer */}
            <View className="bg-amber-50 rounded-[12px] px-4 py-3 flex-row items-center justify-between border border-amber-100 mt-1 mb-6">
              <View className="flex-row items-center flex-1 pr-3">
                <Ionicons name="bulb-outline" size={16} color="#D97706" className="mr-2" />
                <Text className="text-slate-700 text-[11px] font-medium flex-1 leading-tight" numberOfLines={2}>Vehicle suggestions are based on parcel weight.</Text>
              </View>
              <Text className="text-[#0284C7] text-[11px] font-bold">Learn More {'>'}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons moved into scroll view */}
        <View 
          className="flex-row items-center justify-between pt-2"
          style={{ paddingBottom: insets.bottom + 160 }}
        >
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="flex-1 bg-white border border-[#073318] rounded-[16px] h-[52px] items-center justify-center mr-2"
            disabled={isAccepting}
          >
            <Text className="text-[#073318] font-bold text-[15px]">Close</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleAcceptOrder}
            disabled={isAccepting || !selectedVehicle}
            className={`flex-1 rounded-[16px] h-[52px] flex-row items-center justify-center ml-2 shadow-sm ${!selectedVehicle || isAccepting ? 'bg-slate-300' : 'bg-[#073318]'}`}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-[15px]">Accept Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VehicleSuggestionDetailsScreen;
