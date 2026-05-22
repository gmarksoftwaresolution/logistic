import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { RootStackParamList, MainTabParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  if (!context) return null;
  const { t, locale, changeLanguage } = context;


  const LanguageCard = ({ code, label, subLabel, isActive }: { code: string, label: string, subLabel: string, isActive: boolean }) => (
    <TouchableOpacity 
      onPress={() => changeLanguage(code)}
      className={`flex-1 py-3 px-4 rounded-xl border ${isActive ? 'border-primary bg-green-50/10' : 'border-gray-100 bg-white'} mr-2 items-center justify-center`}
      style={isActive ? { borderWidth: 2 } : {}}
    >
      <View className="items-center">
        <Text className={`font-bold text-sm ${isActive ? 'text-primary' : 'text-textPrimary'}`}>{label}</Text>
        <Text className="text-[10px] text-textSecondary mt-1">{subLabel}</Text>
      </View>
      {isActive && (
        <View className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full items-center justify-center">
          <Ionicons name="checkmark" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const SettingRow = ({ icon, title, onPress }: { icon: any, title: string, onPress?: () => void }) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center bg-white py-3 px-4 rounded-xl border border-gray-100 mb-3 shadow-sm"
    >
      <View className="w-10 h-10 bg-[#EEF5F0] rounded-full items-center justify-center mr-4">
        <Ionicons name={icon} size={20} color="#073318" />
      </View>
      <Text className="flex-1 font-semibold text-textPrimary text-base">{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row items-center mt-2">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#073318" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-textPrimary font-bold tracking-tight">{t('settings')}</Text>
          <Text className="text-textSecondary text-xs font-medium font-medium mt-0.5">{t('settings_subtitle')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-2xl font-bold text-textPrimary mb-1">{t('system_settings')}</Text>
          <Text className="text-textSecondary text-sm">{t('system_settings_desc')}</Text>
        </View>

        {/* Language Preference Section */}
        <View className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-8">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-green-50 rounded-full items-center justify-center mr-3">
               <Ionicons name="globe-outline" size={20} color="#073318" />
            </View>
            <View>
              <Text className="font-bold text-textPrimary text-base">{t('language_preference')}</Text>
              <Text className="text-textSecondary text-[10px]">{t('language_preference_desc')}</Text>
            </View>
          </View>
          
          <View className="flex-row mt-2">
             <LanguageCard code="mr" label={t('marathi')} subLabel={t('marathi_sub')} isActive={locale === 'mr'} />
             <LanguageCard code="hi" label={t('hindi')} subLabel={t('hindi_sub')} isActive={locale === 'hi'} />
             <LanguageCard code="en" label={t('english')} subLabel={t('english_sub')} isActive={locale === 'en'} />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-4 ml-1">{t('profile_details')}</Text>
          <SettingRow icon="person-outline" title={t('personal_details')} onPress={() => navigation.navigate("Profile")} />
          <SettingRow icon="location-outline" title={t('address_details')} onPress={() => navigation.navigate("Address")} />
        </View>

        <View className="mb-4 mt-2">
          <Text className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-4 ml-1">{t('support_policy')}</Text>
          <SettingRow icon="help-circle-outline" title={t('help_support')} onPress={() => navigation.navigate("Help")} />
          <SettingRow icon="document-text-outline" title={t('terms_conditions')} onPress={() => navigation.navigate("Terms")} />
          <SettingRow icon="shield-checkmark-outline" title={t('privacy_policy')} onPress={() => navigation.navigate("Privacy")} />
        </View>
        
        <View className="mb-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
