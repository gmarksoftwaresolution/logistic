import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Stock'>;

export default function StockManagementScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  if (!context || !user) return null;
  const { t } = context;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header (Navbar Top) */}
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row justify-between items-center mt-2">
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-textPrimary tracking-tight">{t('home_inventory') || 'Home Inventory'}</Text>
          <Text className="text-textSecondary text-sm font-semibold mt-0.5">{t('inventory_subtitle') || 'Items currently at your home'}</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3 border border-gray-100">
            <Ionicons name="globe-outline" size={20} color="#073318" />
          </TouchableOpacity>
          <TouchableOpacity className="shadow-sm">
             {user?.profileImage ? (
               <Image source={{ uri: user.profileImage }} className="w-10 h-10 rounded-full border-2 border-white" />
             ) : (
                <View className="w-10 h-10 bg-primary rounded-full items-center justify-center border-2 border-white">
                  <Text className="text-white font-bold">{user?.name?.charAt(0) || 'U'}</Text>
                </View>
             )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area (Cleared) */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
          <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
        </View>
        <Text className="text-textSecondary font-bold text-center">
          {t('coming_soon') || 'Content for Stock Management will appear here'}
        </Text>
      </View>
    </SafeAreaView>
  );
}
