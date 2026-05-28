import React, { useState, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { View, Text, TouchableOpacity, ScrollView, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useUser } from '../context/UserContext';
type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;
export default function SettingsScreen({
  navigation
}: Props) {
  const context = useContext(LanguageContext);
  const { t, locale, changeLanguage } = context!;
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

  const languages = [
    { id: 'en', title: 'English', icon: 'A' },
    { id: 'hi', title: 'हिंदी (Hindi)', icon: 'अ' },
    { id: 'mr', title: 'मराठी (Marathi)', icon: 'म' },
  ];

  const currentLanguageTitle = languages.find(l => l.id === locale)?.title || 'English';

  const {
    user
  } = useUser();
  const [lockApp, setLockApp] = useState(true);
  const SectionHeader = ({
    title
  }: {
    title: string;
  }) => <Text className="text-xs font-bold text-[#64748B] mb-2 ml-1 mt-4">{title}</Text>;
  const SettingRow = ({
    icon,
    title,
    subtitle,
    rightElement,
    onPress
  }: any) => <TouchableOpacity onPress={onPress} disabled={!onPress && !rightElement} className="flex-row items-center bg-white py-4 px-4 border-b border-gray-50">
      <View className="w-8 h-8 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-[#1E293B] text-[15px]">{title}</Text>
        {subtitle && <Text className="text-[11px] text-[#64748B] mt-0.5">{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
    </TouchableOpacity>;
  const renderCard = (children: React.ReactNode) => <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 mb-4">
      {children}
    </View>;
  return <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 w-10 h-10 items-center justify-center bg-[#F8FAFC] rounded-full">
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-[#1E293B] tracking-tight">{t("settings")}</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        
        <SectionHeader title={t("su_account_427")} />
        {renderCard(<>
            <SettingRow icon={<Ionicons name="person-outline" size={20} color="#16A34A" />} title={t("personal_details")} subtitle={t("su_update_your_personal_429")} onPress={() => navigation.navigate("PersonalDetails")} />
            <SettingRow icon={<Ionicons name="call-outline" size={20} color="#16A34A" />} title={t("su_profile_settings_430")} subtitle={user?.mobile ? `+91 ${user.mobile}` : "Not provided"} />
            <SettingRow icon={<Ionicons name="lock-closed-outline" size={20} color="#16A34A" />} title={t("su_change_password_431")} subtitle={t("su_update_your_password_432")} />
            <SettingRow icon={<Ionicons name="notifications-outline" size={20} color="#16A34A" />} title={t("su_manage_session_433")} subtitle={t("su_check_your_active_se_434")} />
          </>)}

        <SectionHeader title={t("su_preferences_435")} />
        {renderCard(<>
            <SettingRow icon={<Ionicons name="calendar-outline" size={20} color="#16A34A" />} title={t("su_notification_436")} subtitle={t("su_manage_notification__437")} />
            <SettingRow icon={<Ionicons name="globe-outline" size={20} color="#16A34A" />} title={t("su_language_438")} onPress={() => setLanguageModalVisible(true)} rightElement={<View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">{currentLanguageTitle}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>} />
            <SettingRow icon={<Ionicons name="sunny-outline" size={20} color="#16A34A" />} title={t("su_app_theme_440")} rightElement={<View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">{t("su_light_441")}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>} />
          </>)}

        <SectionHeader title={t("su_privacy_security_442")} />
        {renderCard(<>
            <SettingRow icon={<Ionicons name="shield-checkmark-outline" size={20} color="#16A34A" />} title={t("privacy_title")} subtitle={t("su_view_our_privacy_pol_444")} onPress={() => navigation.navigate("Privacy")} />
            <SettingRow icon={<Ionicons name="lock-closed-outline" size={20} color="#16A34A" />} title={t("su_lock_app_on_logout_445")} subtitle={t("su_automatically_lock_t_446")} rightElement={<Switch trackColor={{
          false: "#E2E8F0",
          true: "#16A34A"
        }} thumbColor={"#FFFFFF"} ios_backgroundColor="#E2E8F0" onValueChange={setLockApp} value={lockApp} />} />
            <SettingRow icon={<Ionicons name="finger-print-outline" size={20} color="#16A34A" />} title={t("su_two_factor_authentic_447")} subtitle={t("su_add_extra_layer_of_s_448")} rightElement={<View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">{t("su_off_449")}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>} />
            <SettingRow icon={<Ionicons name="trash-outline" size={20} color="#16A34A" />} title={t("su_delete_account_450")} subtitle={t("su_permanently_delete_y_451")} />
          </>)}

        <SectionHeader title={t("su_support_452")} />
        {renderCard(<>
            <SettingRow icon={<Ionicons name="headset-outline" size={20} color="#16A34A" />} title={t("su_help_center_453")} subtitle={t("su_get_help_and_support_454")} onPress={() => navigation.navigate("Help")} />
            <SettingRow icon={<Ionicons name="chatbubble-ellipses-outline" size={20} color="#16A34A" />} title={t("su_contact_support_455")} subtitle={t("su_we_re_here_to_help_y_456")} />
          </>)}

        <SectionHeader title={t("su_about_457")} />
        {renderCard(<>
            <SettingRow icon={<Ionicons name="star-outline" size={20} color="#16A34A" />} title={t("su_rate_us_458")} subtitle={t("su_share_your_experienc_459")} rightElement={<View className="flex-row items-center">
                  <Text className="text-xs text-[#64748B] mr-2">{t("su_version_2_1_0_460")}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>} />
            <SettingRow icon={<Ionicons name="document-text-outline" size={20} color="#16A34A" />} title={t("terms_conditions")} subtitle={t("su_read_our_terms_and_c_462")} onPress={() => navigation.navigate("Terms")} />
            <SettingRow icon={<Ionicons name="information-circle-outline" size={20} color="#16A34A" />} title={t("su_about_app_463")} subtitle={t("su_learn_more_about_our_464")} />
          </>)}

        {/* Logout */}
        <View className="mb-12 mt-4">
          <TouchableOpacity className="bg-red-50 py-4 rounded-2xl flex-row justify-center items-center">
            <Ionicons name="log-out-outline" size={20} color="#EF4444" className="mr-2" />
            <Text className="text-[#EF4444] font-bold text-base ml-2">{t("logout")}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={isLanguageModalVisible} animationType="slide" transparent={true} onRequestClose={() => setLanguageModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[32px] p-6 pb-10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-[#1E293B]">{t("choose_language")}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)} className="w-8 h-8 items-center justify-center bg-gray-100 rounded-full">
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {languages.map(lang => {
              const isSelected = locale === lang.id;
              return (
                <TouchableOpacity key={lang.id} onPress={() => {
                  changeLanguage(lang.id);
                  setLanguageModalVisible(false);
                }} className={`w-full py-4 px-4 rounded-[20px] border-2 flex-row items-center mb-3 ${isSelected ? 'bg-[#F2F8F4] border-[#073318]' : 'bg-[#F8FAFC] border-transparent'}`}>
                  <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 border ${isSelected ? 'bg-white border-[#073318]' : 'bg-white border-gray-200'}`}>
                    <Text className={`text-lg font-bold ${isSelected ? 'text-[#073318]' : 'text-gray-400'}`}>{lang.icon}</Text>
                  </View>
                  <Text className={`flex-1 text-base font-semibold ${isSelected ? 'text-[#073318]' : 'text-[#1E293B]'}`}>{lang.title}</Text>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'bg-[#073318] border-[#073318]' : 'border-gray-300 bg-white'}`}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

    </SafeAreaView>;
}