import React, { useContext } from "react";
import { Image, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from "../context/LanguageContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthSelection'>;

/**
 * AuthSelectionScreen - Allows users to choose between Login and Signup.
 * Features consistent branding.
 */
export default function AuthSelectionScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  if (!context) return null;
  const { t } = context;

  const handleAuthNavigation = async (route: keyof RootStackParamList) => {
    navigation.navigate(route as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      {/* Modern Back Button */}
      <View className="absolute top-12 left-6 z-10">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="bg-white p-3 rounded-full shadow-sm" 
          style={{ 
            shadowColor: "#000", 
            shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.1, 
            shadowRadius: 4, 
            elevation: 4 
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#073318" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 justify-center">
        {/* Massive Branding Section */}
        <View className="mb-10 items-center justify-center">
          <Image source={require('../../assets/images/GMU Logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" className="mb-2" />
          <Text className="font-extrabold text-[36px] tracking-tight text-center">
            <Text style={{ color: '#073318' }}>Gram</Text>
            <Text style={{ color: '#84B827' }}>Unnati</Text>
          </Text>
          <Text className="font-black text-[#073318] text-[18px] tracking-widest uppercase text-center mt-1">Delivery Partner</Text>
        </View>

        {/* Big Container Card for Actions */}
        <View 
          className="bg-white rounded-[32px] p-6 w-full border border-gray-100"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Text className="text-xl font-extrabold text-[#111827] mb-1 text-center">{t('get_started')}</Text>
          <Text className="text-[#6B7280] text-[13px] font-medium mb-6 text-center">
            {t('select_role')}
          </Text>

          {/* Action Buttons */}
          <View className="w-full">
            <Text className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 text-center">{t('have_account')}</Text>
            <TouchableOpacity
              onPress={() => handleAuthNavigation("Login")}
              className="bg-[#073318] py-4 rounded-full items-center justify-center mb-5"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 8,
              }}
            >
              <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide">{t('login')}</Text>
            </TouchableOpacity>
            
            <Text className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 text-center">{t('no_account')}</Text>
            <TouchableOpacity
              onPress={() => handleAuthNavigation("Signup")}
              className="bg-white py-4 rounded-full items-center justify-center border-2 border-[#073318]"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 8,
              }}
            >
              <Text numberOfLines={1} className="text-[#073318] text-[18px] font-bold tracking-wide">{t('signup')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="items-center px-6 mb-6">
        <Text className="text-textSecondary text-xs text-center">
          {t('i_accept')}{"\n"}
          <Text className="text-primary font-bold" onPress={() => navigation.navigate("Terms")}>{t('terms_conditions')}</Text> {t('and')} <Text className="text-primary font-bold" onPress={() => navigation.navigate("Privacy")}>{t('privacy_policy')}</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
