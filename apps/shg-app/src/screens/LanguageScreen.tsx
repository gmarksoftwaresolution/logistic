import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

export default function LanguageScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  if (!context) return null;
  const { locale, changeLanguage, t } = context;
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale || 'en');

  const languages = [
    {
      id: 'en',
      title: 'English',
      subtitle: 'Global standard language',
      icon: 'A',
    },
    {
      id: 'hi',
      title: 'हिंदी (Hindi)',
      subtitle: 'भारत की राजभाषा',
      icon: 'अ',
    },
    {
      id: 'mr',
      title: 'मराठी (Marathi)',
      subtitle: 'महाराष्ट्राची राजभाषा',
      icon: 'म',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 px-6 justify-center pb-4 pt-6">
          {/* Massive Branding Section */}
          <View className="mb-10 items-center justify-center">
            <Image source={require('../../assets/images/GMU Logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" className="mb-2" />
            <Text className="font-extrabold text-[36px] tracking-tight text-center px-4" adjustsFontSizeToFit numberOfLines={1}>
              <Text style={{ color: '#073318' }}>{t('gram')}</Text>
              <Text style={{ color: '#84B827' }}>{t('unnati')}</Text>
            </Text>
            <Text className="font-black text-[#073318] text-[18px] tracking-widest uppercase text-center mt-1" adjustsFontSizeToFit numberOfLines={1}>{t('delivery_partner')}</Text>
          </View>

          {/* Big Container Card for Languages */}
          <View 
            className="bg-white rounded-[32px] p-6 w-full border border-gray-100 mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Text className="text-xl font-extrabold text-[#111827] mb-1">{t('choose_language')}</Text>
            <Text className="text-[#6B7280] text-[13px] font-medium mb-6">
              {t('select_preferred_language')}
            </Text>

            {/* Language Options */}
            <View className="w-full">
              {languages.map((lang, index) => {
                const isSelected = selectedLanguage === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    onPress={() => setSelectedLanguage(lang.id)}
                    className={`w-full py-4 px-4 rounded-[20px] border-2 flex-row items-center shadow-sm mb-4 ${
                      isSelected 
                        ? 'bg-[#F2F8F4] border-[#073318]' 
                        : 'bg-[#F9FAFB] border-transparent'
                    }`}
                  >
                    {/* Language Icon Symbol */}
                    <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 border ${
                      isSelected ? 'bg-white border-[#073318]' : 'bg-white border-gray-200'
                    }`}>
                      <Text className={`text-[22px] font-black ${isSelected ? 'text-[#073318]' : 'text-gray-400'}`}>
                        {lang.icon}
                      </Text>
                    </View>

                    {/* Language Text */}
                    <View className="flex-1">
                      <Text className={`text-[17px] font-extrabold ${
                        isSelected ? 'text-[#073318]' : 'text-[#111827]'
                      }`}>
                        {lang.title}
                      </Text>
                      <Text className={`text-[12px] font-medium mt-0.5 ${
                        isSelected ? 'text-[#073318]/70' : 'text-[#6B7280]'
                      }`}>
                        {lang.subtitle}
                      </Text>
                    </View>

                    {/* Radio Check Circle */}
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isSelected ? 'bg-[#073318] border-[#073318]' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <View className="px-6 pb-10 pt-2">
          <TouchableOpacity
            onPress={() => {
              changeLanguage(selectedLanguage);
              navigation.navigate('AuthSelection');
            }}
            className="bg-[#073318] py-4 rounded-2xl items-center justify-center border border-white"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 8,
            }}
          >
            <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide">{t('continue')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
