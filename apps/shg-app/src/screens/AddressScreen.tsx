import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons, Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
type Props = NativeStackScreenProps<RootStackParamList, 'Address'>;
export default function AddressScreen({
  navigation
}: Props) {
  const context = useContext(LanguageContext);
  const {
    user,
    updateUser
  } = useUser();
  if (!context || !user) return null;
  const {
    t
  } = context;
  const [formData, setFormData] = useState({
    pincode: user?.pincode || '',
    stateName: user?.stateName || '',
    district: user?.district || '',
    taluka: user?.taluka || '',
    village: user?.village || '',
    homeAddress: user?.homeAddress || ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const hasChanges = () => {
    return formData.pincode !== user.pincode || formData.stateName !== user.stateName || formData.district !== user.district || formData.taluka !== user.taluka || formData.village !== user.village || formData.homeAddress !== user.homeAddress;
  };
  const handleSave = () => {
    if (!hasChanges()) {
      setGeneralError('Please make changes before saving');
      return;
    }
    setGeneralError('');
    updateUser(formData);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigation.goBack();
    }, 2000);
  };
  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default"
  }: any) => <View className="w-full mb-6">
      <Text className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-3 ml-1">{label}</Text>
      <View className="flex-row items-center bg-white py-3 px-4 rounded-xl border border-gray-200 shadow-sm">
        <TextInput value={value} onChangeText={val => {
        onChangeText(val);
        setGeneralError('');
      }} className="flex-1 text-textPrimary font-semibold text-base" placeholder={placeholder} keyboardType={keyboardType} />
      </View>
    </View>;
  return <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row items-center mt-2">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#073318" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-textPrimary font-bold tracking-tight">{t('address_details')}</Text>
          <Text className="text-textSecondary text-xs font-medium font-medium mt-0.5">{t('address_subtitle')}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={80}
        extraHeight={80}
        enableAutomaticScroll={true}
      >
        <View className="px-6 pt-6">
          <View className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 mb-10">
            <InputField label={t('pincode')} value={formData.pincode} onChangeText={(val: string) => setFormData({
            ...formData,
            pincode: val
          })} placeholder={t("su_enter_pincode_337")} keyboardType="numeric" />
            <InputField label={t('state')} value={formData.stateName} onChangeText={(val: string) => setFormData({
            ...formData,
            stateName: val
          })} placeholder={t("su_enter_state_338")} />
            <InputField label={t('district')} value={formData.district} onChangeText={(val: string) => setFormData({
            ...formData,
            district: val
          })} placeholder={t("su_enter_district_339")} />
            <InputField label={t('taluka')} value={formData.taluka} onChangeText={(val: string) => setFormData({
            ...formData,
            taluka: val
          })} placeholder={t("su_enter_taluka_340")} />
            <InputField label={t('village')} value={formData.village} onChangeText={(val: string) => setFormData({
            ...formData,
            village: val
          })} placeholder={t("su_enter_village_341")} />
            <InputField label={t('home_address')} value={formData.homeAddress} onChangeText={(val: string) => setFormData({
            ...formData,
            homeAddress: val
          })} placeholder={t("su_enter_home_address_342")} />

            {generalError ? <View className="bg-red-50 p-4 rounded-2xl mb-6 flex-row items-center border border-red-100">
                <Ionicons name="alert-circle" size={18} color="#EF4444" className="mr-2" />
                <Text className="text-red-500 font-semibold text-xs">{generalError}</Text>
              </View> : null}

            <View className="flex-row gap-4 w-full">
              <TouchableOpacity onPress={() => navigation.goBack()} className="flex-1 bg-gray-100 py-4 rounded-2xl items-center">
                <Text className="text-textPrimary font-bold text-base">{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} className="flex-1 bg-primary py-4 rounded-2xl items-center shadow-sm">
                <Text className="text-white font-bold text-base">{t("save_changes")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View className="mb-20" />
        </View>
      </KeyboardAwareScrollView>

      <Modal visible={showSuccess} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-10">
          <View className="bg-white p-10 rounded-[40px] items-center w-full shadow-2xl">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <View className="w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg">
                <Ionicons name="checkmark" size={32} color="white" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-textPrimary mb-2 text-center">{t("updated")}</Text>
            <Text className="text-textSecondary text-center text-sm">{t("address_details_success")}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>;
}