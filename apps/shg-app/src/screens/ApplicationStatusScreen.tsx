import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useUser } from '../context/UserContext';
import Button from '../components/Button';
import { LanguageContext } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplicationStatus'>;

const ApplicationStatusScreen: React.FC<Props> = ({ navigation }) => {
  const context = React.useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  const { status, user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-4 pb-4 bg-transparent mt-4">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => navigation.navigate("Landing")}
            className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm"
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-[28px] font-extrabold text-[#111827]">{t("app_status_sign_up")}</Text>
          <View className="flex-row items-center">
            <TouchableOpacity className="mr-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
              <Ionicons name="help-outline" size={20} color="#073318" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
              <Ionicons name="globe-outline" size={20} color="#073318" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-1 px-6 justify-center">
        <View className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 items-center">
          <View className="w-20 h-20 bg-orange-50 rounded-full items-center justify-center mb-8">
            <Ionicons name="time-outline" size={40} color="#F59E0B" />
          </View>

          <Text className="text-[26px] font-extrabold text-textPrimary mb-3 text-center">
            {t("app_status_under_review")}
          </Text>
          
          <Text className="text-textSecondary text-base text-center mb-10 leading-6">
            {t("app_status_desc")}
          </Text>

          <View className="bg-gray-50 w-full rounded-3xl p-6 mb-10">
            <View className="mb-4">
              <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-1">{t("app_status_req_id")}</Text>
              <Text className="text-lg font-bold text-blue-600">{user?.shgUniqueId || 'Pending'}</Text>
            </View>
            <View>
              <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-1">{t("app_status_est_time")}</Text>
              <Text className="text-lg font-bold text-textPrimary">{t("app_status_24_48_hrs")}</Text>
            </View>
          </View>

          <Button 
            title={t("app_status_login")} 
            onPress={handleLogout}
            className="bg-[#073318]"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ApplicationStatusScreen;
