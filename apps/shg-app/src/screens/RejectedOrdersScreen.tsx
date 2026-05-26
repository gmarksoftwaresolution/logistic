import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { useOrders } from '../context/OrderContext';
import { SharedHeader } from '../components/SharedHeader';
import { getRouteForOrder, getInfoForOrder, translateRoutePart } from '../utils/orderHelpers';
import { FilterModal } from '../components/FilterModal';
import { FilterState, isOrderInDateRange } from '../utils/dateFilters';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'RejectedOrders'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const RejectedOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  const { rejectedOrders } = useOrders();
  
  const [filterState, setFilterState] = useState<FilterState>({ type: 'today' });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  if (!context || !user) return null;
  const { t } = context;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <SharedHeader 
        title={t("title_rejected_orders")} 
        subtitle={t("subtitle_rejected_orders")} 
        navigation={navigation}
      />

      {/* Filter Button */}
      <View className="px-6 flex-row justify-end py-2">
        <TouchableOpacity
          onPress={() => setIsFilterModalVisible(true)}
          activeOpacity={0.7}
          className={`flex-row items-center px-4 py-2 rounded-full border ${isFilterModalVisible ? 'bg-[#F2FDF5] border-[#073318]' : 'bg-white border-slate-200 shadow-sm'}`}
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
        >
          <Ionicons name="filter" size={14} color={isFilterModalVisible ? '#073318' : '#4B5563'} style={{ marginRight: 6 }} />
          <Text className={`text-[13px] font-bold ${isFilterModalVisible ? 'text-[#073318]' : 'text-textPrimary'}`}>
            {t("filter_label")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {(() => {
        const filteredOrders = rejectedOrders.filter(item => {
          const info = getInfoForOrder(item);
          const dateStr = item.rejectedAt || info.date;
          return isOrderInDateRange(dateStr, filterState);
        });

        if (filteredOrders.length === 0) {
          return (
            <View className="flex-1 items-center justify-center py-32 px-6">
              <View className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="file-tray-outline" size={36} color="#94A3B8" />
              </View>
              <Text className="text-textSecondary font-bold text-center text-[16px]">
                {t("no_orders_found")}
              </Text>
            </View>
          );
        }

        return (
          <ScrollView 
            className="flex-1 px-6 pt-2"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            {filteredOrders.map((item, index) => {
              const orderIdText = `#ORD-1769749895005-${item.id.replace('inc-', '')}`;
              const routeText = getRouteForOrder(item).split('>').map(part => translateRoutePart(part, t)).join(' > ');
              const info = getInfoForOrder(item);

              return (
                <View 
                  key={item.id || index} 
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
                        <Text className="text-[14px] font-black text-[#073318] tracking-wide">{orderIdText}</Text>
                        <View className="px-3.5 py-1.5 rounded-full bg-[#FEECEE]">
                          <Text className="text-[11px] font-bold text-[#D0303F]">{t("status_rejected") || "Rejected"}</Text>
                        </View>
                      </View>
                      
                      <Text className="text-[16px] font-extrabold text-[#111827] mb-4 tracking-tight">
                        {routeText}
                      </Text>
                      
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[13px] text-[#8792A1] font-medium">
                          {item.remainingQty || 1} {t("su_products") || "products"} • {item.weight || 2} {t("su_kg") || "kg"}
                        </Text>
                        <Text className="text-[12px] text-[#8792A1] font-medium">
                          {item.rejectedAt || `${info.date}, ${info.time}`}
                        </Text>
                      </View>

                      {item.rejectReason ? (
                        <View className="mt-3 pt-3 border-t border-red-100/50">
                          <Text className="text-[11px] font-bold text-[#D0303F] tracking-wide mb-1">{t("rejection_reason_label")}</Text>
                          <Text className="text-[13px] text-slate-700 font-medium leading-[18px]">{t("reason_" + item.rejectReason) || item.rejectReason}</Text>
                        </View>
                      ) : null}
                    </View>
                  </BlurView>
                </View>
              );
            })}
          </ScrollView>
        );
      })()}

      <FilterModal
        visible={isFilterModalVisible}
        currentFilter={filterState}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={(f) => setFilterState(f)}
      />
    </SafeAreaView>
  );
};

export default RejectedOrdersScreen;
