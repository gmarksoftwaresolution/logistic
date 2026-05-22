import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from "../context/LanguageContext";

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

export default function TermsScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  if (!context) return null;
  const { t } = context;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center mt-4">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#073318" />
          </TouchableOpacity>
          <Text numberOfLines={1} className="text-xl font-semibold text-textPrimary flex-1">{t('terms_conditions')}</Text>
        </View>
      </View>
      <ScrollView className="flex-1 p-6">
        <Text className="text-xl font-bold text-textPrimary mb-4">{t('terms_title')}</Text>
        <Text className="text-textSecondary leading-6 mb-4">
          {t('terms_desc_1')}
        </Text>
        <Text className="text-textSecondary leading-6 mb-4">
          {t('terms_desc_2')}
        </Text>
        <Text className="text-textSecondary leading-6 mb-4">
          {t('terms_desc_3')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
