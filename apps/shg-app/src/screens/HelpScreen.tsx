import React, { useContext } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from "../context/LanguageContext";

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

export default function HelpScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  if (!context) return null;
  const { t } = context;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100 mt-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#073318" />
        </TouchableOpacity>
        <Text numberOfLines={1} className="text-xl font-semibold text-textPrimary flex-1">{t('help_support')}</Text>
      </View>
      <View className="flex-1 px-6 pt-8">
        <Text className="text-[26px] font-extrabold text-textPrimary mb-2">{t('how_can_we_help')}</Text>
        <Text className="text-textSecondary text-base mb-8">
          {t('help_desc')}
        </Text>
        <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 rounded-full bg-[#EEF5F0] items-center justify-center mr-3">
              <Ionicons name="call" size={20} color="#073318" />
            </View>
            <Text className="text-textPrimary font-semibold text-base">+1 234 567 890</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#EEF5F0] items-center justify-center mr-3">
              <Ionicons name="mail" size={20} color="#073318" />
            </View>
            <Text className="text-textPrimary font-semibold text-base">support@gmulogistics.com</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
