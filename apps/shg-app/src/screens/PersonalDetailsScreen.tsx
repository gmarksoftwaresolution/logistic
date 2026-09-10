import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons, Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { uploadService } from '../services/uploadService';
type Props = NativeStackScreenProps<RootStackParamList, 'PersonalDetails'>;
export default function PersonalDetailsScreen({
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
    name: user?.name || '',
    mobile: user?.mobile || '',
    profileImage: user?.profileImage || null,
    gmuId: user?.gmuId || '',
    role: user?.role || '',
    dob: user?.dob || '',
    aadhaar: user?.aadhaar || '',
    joiningDate: user?.joiningDate || ''
  });
  const [mobileError, setMobileError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showJoiningPicker, setShowJoiningPicker] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated to avoid deprecation warning
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1
    });
    if (!result.canceled) {
      setFormData({
        ...formData,
        profileImage: result.assets[0].uri
      });
      setGeneralError('');
    }
  };
  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify({
      name: user?.name,
      mobile: user?.mobile,
      profileImage: user?.profileImage,
      gmuId: user?.gmuId,
      role: user?.role,
      dob: user?.dob,
      aadhaar: user?.aadhaar,
      joiningDate: user?.joiningDate
    });
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || '',
      mobile: user?.mobile || '',
      profileImage: user?.profileImage || null,
      gmuId: user?.gmuId || '',
      role: user?.role || '',
      dob: user?.dob || '',
      aadhaar: user?.aadhaar || '',
      joiningDate: user?.joiningDate || ''
    });
    setGeneralError('');
    setMobileError('');
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      setGeneralError('Please make changes before saving');
      return;
    }
    if (formData.mobile.length !== 10) {
      setMobileError('Please enter exactly 10 digits');
      return;
    }
    if (!/^[6-9]/.test(formData.mobile)) {
      setMobileError('Mobile number must start from 6');
      return;
    }

    let finalFormData = { ...formData };

    if (
      formData.profileImage && 
      !formData.profileImage.startsWith('http') && 
      !formData.profileImage.startsWith('/uploads')
    ) {
      try {
        const response = await uploadService.uploadProfilePhoto(formData.profileImage);
        const baseUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace('/api', '');
        finalFormData.profileImage = baseUrl + response.url;
      } catch (error) {
        setGeneralError('Failed to upload profile photo');
        return;
      }
    }

    updateUser(finalFormData);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setIsEditing(false);
      // Removed navigation.goBack() so user stays on view mode
    }, 2000);
  };
  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    editable = true
  }: any) => <View className="w-full mb-3">
      <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{label}</Text>
      <View className={`flex-row items-center py-2.5 px-4 rounded-xl border ${editable && isEditing ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
        <TextInput
          value={value}
          onChangeText={val => {
            if (editable && onChangeText) {
              onChangeText(val);
              setGeneralError('');
            }
          }}
          className={`flex-1 font-semibold text-sm ${editable && isEditing ? 'text-textPrimary' : 'text-gray-700'}`}
          placeholder={placeholder}
          keyboardType={keyboardType}
          editable={editable && isEditing}
        />
      </View>
    </View>;

  return <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row items-center mt-2">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#073318" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-textPrimary tracking-tight">{t('personal_details')}</Text>
          <Text className="text-textSecondary text-xs font-medium mt-0.5">{t('profile_subtitle')}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={80}
        extraHeight={80}
        enableAutomaticScroll={true}
      >
        <View className="px-5 pt-3">
          <View className="items-center mb-3">
            <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{t('profile_photo')}</Text>
            <View className="relative">
              <View className="w-20 h-20 bg-primary rounded-full items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                {formData.profileImage ? <Image source={{
                uri: formData.profileImage
              }} className="w-full h-full" /> : <Text className="text-white font-bold text-3xl">{formData.name?.charAt(0) || 'U'}</Text>}
              </View>
              <TouchableOpacity onPress={pickImage} className="absolute bottom-0 right-0 w-7 h-7 bg-[#073318] rounded-full border border-white items-center justify-center shadow-sm">
                <Feather name="camera" size={12} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-50 mb-6">
            <View className="w-full mb-3">
              <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{t("su_gmu_id_331")}</Text>
              <View className="bg-gray-50 py-2.5 px-4 rounded-xl border border-gray-100">
                <Text className="text-gray-700 font-semibold text-sm">{user?.gmuId || 'N/A'}</Text>
              </View>
            </View>

            <InputField label={t('gmu_full_name')} value={formData.name} editable={false} placeholder={t("su_enter_name_332")} />

            <View className="w-full mb-3">
              <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{t('mobile_number')}</Text>
              <View className="flex-row items-center py-2.5 px-4 rounded-xl border bg-gray-50 border-gray-100">
                <Text className="text-gray-700 font-semibold mr-3 text-sm">+91</Text>
                <TextInput value={formData.mobile} editable={false} className="flex-1 text-gray-700 font-semibold text-sm" />
              </View>
              {mobileError ? <Text className="text-red-500 text-xs mt-1 ml-1">{mobileError}</Text> : null}
            </View>
            <InputField label={t('role_in_group')} value={formData.role} editable={false} />
            
            <TouchableOpacity activeOpacity={isEditing ? 0.8 : 1} onPress={() => { if (isEditing) setShowDobPicker(true); }}>
              <View pointerEvents="none">
                 <InputField label={t('dob')} value={formData.dob} editable={true} />
              </View>
            </TouchableOpacity>

            <InputField label={t('aadhaar_optional')} value={formData.aadhaar} editable={true} onChangeText={(val: string) => setFormData({...formData, aadhaar: val})} />

            <View pointerEvents="none">
               <InputField label={t('joining_date')} value={formData.joiningDate} editable={false} />
            </View>

            {generalError ? <View className="bg-red-50 p-3 rounded-2xl mb-4 flex-row items-center border border-red-100 mt-1">
                <Ionicons name="alert-circle" size={18} color="#EF4444" className="mr-2" />
                <Text className="text-red-500 font-semibold text-xs">{generalError}</Text>
              </View> : null}

            <View className="flex-row gap-3 w-full mt-2">
              {!isEditing ? (
                <>
                  <TouchableOpacity onPress={() => navigation.goBack()} className="flex-1 bg-gray-100 py-3.5 rounded-2xl items-center">
                    <Text className="text-textPrimary font-bold text-base">{t("back") || "Back"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditing(true)} className="flex-1 bg-primary py-3.5 rounded-2xl items-center shadow-sm">
                    <Text className="text-white font-bold text-base">{t("edit") || "Edit"}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={handleCancel} className="flex-1 bg-gray-100 py-3.5 rounded-2xl items-center">
                    <Text className="text-textPrimary font-bold text-base">{t("cancel") || "Cancel"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} className="flex-1 bg-primary py-3.5 rounded-2xl items-center shadow-sm">
                    <Text className="text-white font-bold text-base">{t("save_changes") || "Save Changes"}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {showDobPicker && <DateTimePicker value={new Date()} mode="date" display="default" onChange={(event, date) => {
      setShowDobPicker(false);
      if (date) {
        setFormData({
          ...formData,
          dob: date.toLocaleDateString()
        });
        setGeneralError('');
      }
    }} />}

      {showJoiningPicker && <DateTimePicker value={new Date()} mode="date" display="default" onChange={(event, date) => {
      setShowJoiningPicker(false);
      if (date) {
        setFormData({
          ...formData,
          joiningDate: date.toLocaleDateString()
        });
        setGeneralError('');
      }
    }} />}

      <Modal visible={showSuccess} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-10">
          <View className="bg-white p-10 rounded-[40px] items-center w-full shadow-2xl">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <View className="w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg">
                <Ionicons name="checkmark" size={32} color="white" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-textPrimary mb-2 text-center">{t("updated")}</Text>
            <Text className="text-textSecondary text-center text-sm">{t("personal_details_success")}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>;
}