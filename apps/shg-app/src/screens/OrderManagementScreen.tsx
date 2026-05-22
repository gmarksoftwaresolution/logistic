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
import { SharedHeader } from '../components/SharedHeader';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Orders'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function OrderManagementScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  const { user } = useUser();
  if (!context || !user) return null;
  const { t } = context;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <SharedHeader 
        title={t('orders')} 
        subtitle={t('orders_subtitle') || 'Real-time batch & hub transfers'} 
        navigation={navigation} 
      />

      {/* Main Content Area (Cleared) */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
          <Ionicons name="list-outline" size={32} color="#CBD5E1" />
        </View>
        <Text className="text-textSecondary font-bold text-center">
          {t('coming_soon') || 'Content for Order Management will appear here'}
        </Text>
      </View>
    </SafeAreaView>
  );
}
