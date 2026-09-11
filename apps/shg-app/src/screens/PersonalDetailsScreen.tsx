import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Modal } from 'react-native';
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

  const getInitialAadhaar = () => {
    const u = user as any;
    return u?.aadhaarNumber || u?.aadhaar || u?.document?.rawAadhaarNumber || u?.document?.aadhaarNumber || u?.documents?.[0]?.aadhaarNumber || '';
  };

  const getInitialPan = () => {
    const u = user as any;
    return u?.panNumber || u?.pan || u?.document?.rawPanNumber || u?.document?.panNumber || u?.documents?.[0]?.panNumber || '';
  };

  const getInitialForm = () => ({
    name: user?.name || '',
    mobile: user?.mobile || '',
    profileImage: user?.profileImage || null,
    gmuId: user?.gmuId || '',
    role: user?.role || '',
    dob: user?.dob || '',
    aadhaar: getInitialAadhaar(),
    pan: getInitialPan(),
  });

  const [formData, setFormData] = useState(getInitialForm());
  const [mobileError, setMobileError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);

  useEffect(() => {
    setFormData(getInitialForm());
    setShowAadhaar(false);
    setShowPan(false);
  }, [user]);

  const maskAadhaar = (val: string) => {
    if (!val) return 'Not provided';
    const clean = val.replace(/\s+/g, '');
    if (clean.length < 4) return val;
    return `XXXX XXXX ${clean.slice(-4)}`;
  };

  const maskPan = (val: string) => {
    if (!val) return 'Not provided';
    const clean = val.trim();
    if (clean.length < 4) return val;
    return `XXXXX${clean.slice(-4)}`;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
    const initial = getInitialForm();
    return (
      formData.name !== initial.name ||
      formData.mobile !== initial.mobile ||
      formData.profileImage !== initial.profileImage ||
      formData.dob !== initial.dob ||
      formData.aadhaar !== initial.aadhaar ||
      formData.pan !== initial.pan
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowAadhaar(false);
    setShowPan(false);
    setFormData(getInitialForm());
    setGeneralError('');
    setMobileError('');
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      setIsEditing(false);
      setGeneralError('');
      return;
    }

    let finalFormData: any = {
      ...formData,
      aadhaarNumber: formData.aadhaar,
      panNumber: formData.pan,
    };

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
    }, 1500);
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    editable = true,
    autoCapitalize = "none",
    isToggleable = false,
    isVisible = false,
    onToggleVisibility = () => {},
  }: any) => (
    <View className="w-full mb-3">
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
          autoCapitalize={autoCapitalize}
        />
        {isToggleable && (
          <TouchableOpacity onPress={onToggleVisibility} className="p-1 ml-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isVisible ? "eye-off-outline" : "eye-outline"} size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 bg-white border-b border-gray-50 flex-row items-center mt-2">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#073318" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-textPrimary tracking-tight">{t('personal_details') || "Personal Details"}</Text>
          <Text className="text-textSecondary text-xs font-medium mt-0.5">{t('profile_subtitle') || "View and update your personal info"}</Text>
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
            <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{t('profile_photo') || "PROFILE PHOTO"}</Text>
            <View className="relative">
              <View className="w-20 h-20 bg-primary rounded-full items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                {formData.profileImage ? (
                  <Image source={{ uri: formData.profileImage }} className="w-full h-full" />
                ) : (
                  <Text className="text-white font-bold text-3xl">{formData.name?.charAt(0) || 'U'}</Text>
                )}
              </View>
              {isEditing && (
                <TouchableOpacity onPress={pickImage} className="absolute bottom-0 right-0 w-7 h-7 bg-[#073318] rounded-full border border-white items-center justify-center shadow-sm">
                  <Feather name="camera" size={12} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-50 mb-6">
            {/* 1. GMU ID */}
            <View className="w-full mb-3">
              <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{t("su_gmu_id_331") || "GMU ID"}</Text>
              <View className="bg-gray-50 py-2.5 px-4 rounded-xl border border-gray-100">
                <Text className="text-gray-700 font-semibold text-sm">{user?.gmuId || 'N/A'}</Text>
              </View>
            </View>

            {/* 2. GMU Full Name */}
            <InputField label={t('gmu_full_name') || "GMU FULL NAME"} value={formData.name} editable={false} placeholder={t("su_enter_name_332")} />

            {/* 3. Mobile Number */}
            <View className="w-full mb-3">
              <Text className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-1 ml-1">{t('mobile_number') || "MOBILE NUMBER"}</Text>
              <View className="flex-row items-center py-2.5 px-4 rounded-xl border bg-gray-50 border-gray-100">
                <Text className="text-gray-700 font-semibold mr-3 text-sm">+91</Text>
                <TextInput value={formData.mobile} editable={false} className="flex-1 text-gray-700 font-semibold text-sm" />
              </View>
              {mobileError ? <Text className="text-red-500 text-xs mt-1 ml-1">{mobileError}</Text> : null}
            </View>

            {/* 4. Role in Group */}
            <InputField label={t('role_in_group') || "ROLE IN GROUP"} value={formData.role || user?.role || 'SHG'} editable={false} />
            
            {/* 5. Date of Birth */}
            <TouchableOpacity activeOpacity={isEditing ? 0.8 : 1} onPress={() => { if (isEditing) setShowDobPicker(true); }}>
              <View pointerEvents="none">
                 <InputField label={t('dob') || "DATE OF BIRTH"} value={formData.dob} editable={true} placeholder="Not provided" />
              </View>
            </TouchableOpacity>

            {/* 6. Aadhaar Number */}
            <InputField 
              label={t('aadhaar') || "AADHAAR NUMBER"} 
              value={
                isEditing
                  ? (showAadhaar ? formData.aadhaar : maskAadhaar(formData.aadhaar))
                  : (showAadhaar ? (formData.aadhaar || 'Not provided') : maskAadhaar(formData.aadhaar))
              } 
              editable={true} 
              onChangeText={(val: string) => setFormData({...formData, aadhaar: val})}
              placeholder="Not provided"
              keyboardType="numeric"
              isToggleable={true}
              isVisible={showAadhaar}
              onToggleVisibility={() => setShowAadhaar(!showAadhaar)}
            />

            {/* 7. PAN Card Number */}
            <InputField 
              label={t('pan_card_number') || "PAN CARD NUMBER"} 
              value={
                isEditing
                  ? (showPan ? formData.pan : maskPan(formData.pan))
                  : (showPan ? (formData.pan || 'Not provided') : maskPan(formData.pan))
              } 
              editable={true} 
              onChangeText={(val: string) => setFormData({...formData, pan: val.toUpperCase()})}
              placeholder="Not provided"
              autoCapitalize="characters"
              isToggleable={true}
              isVisible={showPan}
              onToggleVisibility={() => setShowPan(!showPan)}
            />

            {generalError ? (
              <View className="bg-red-50 p-3 rounded-2xl mb-4 flex-row items-center border border-red-100 mt-1">
                <Ionicons name="alert-circle" size={18} color="#EF4444" className="mr-2" />
                <Text className="text-red-500 font-semibold text-xs">{generalError}</Text>
              </View>
            ) : null}

            {/* Bottom Buttons */}
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

      {showDobPicker && (
        <DateTimePicker 
          value={new Date()} 
          mode="date" 
          display="default" 
          onChange={(event, date) => {
            setShowDobPicker(false);
            if (date) {
              setFormData({
                ...formData,
                dob: date.toLocaleDateString()
              });
              setGeneralError('');
            }
          }} 
        />
      )}

      <Modal visible={showSuccess} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-10">
          <View className="bg-white p-10 rounded-[40px] items-center w-full shadow-2xl">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <View className="w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg">
                <Ionicons name="checkmark" size={32} color="white" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-textPrimary mb-2 text-center">{t("updated") || "Updated"}</Text>
            <Text className="text-textSecondary text-center text-sm">{t("personal_details_success") || "Personal details updated successfully."}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}