import React, { useState, useRef, useEffect, useContext } from 'react';
import { Image, View, Text, TouchableOpacity, TextInput, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { authService } from '../services/authService';
import { signupService } from '../services/signupService';
import { STORAGE_KEYS } from '../utils/storage';
import { useUser } from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  const { login } = useUser();
  if (!context) return null;
  const { locale, t } = context;
  
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      setStep(1);
      setMobile('');
      setMobileError('');
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      setLoading(false);
      setFocusedIndex(null);
    }, [])
  );

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  const handleOtpChange = (val: string, index: number) => {
    let newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await authService.sendLoginOtp(mobile);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      Toast.show({ type: 'success', text1: 'OTP Resent Successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to resend OTP', text2: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      setMobileError(t('enter_10_digit'));
      return;
    }
    if (!/^[6-9]/.test(mobile)) {
      setMobileError(t('invalid_mobile_start'));
      return;
    }
    setMobileError("");
    setLoading(true);
    try {
      await authService.sendLoginOtp(mobile);
      setOtp(['', '', '', '', '', '']);
      setStep(2);
      Toast.show({ type: 'success', text1: 'OTP Sent Successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter 6-digit OTP' });
      return;
    }

    setLoading(true);
    try {
      const languageMap: Record<string, string> = {
        'en': 'English',
        'hi': 'Hindi',
        'mr': 'Marathi'
      };
      const response = await authService.verifyLoginOtp(mobile, otpString, languageMap[locale] || 'English');
      
      if (response.accessToken) {
        // Map backend fields to frontend UserProfile interface
        const mappedUser = {
          ...response.userDetails,
          name: response.userDetails.fullName,
          mobile: response.userDetails.mobileNumber,
        };
        
        await login(response.accessToken, mappedUser);
        
        if (response.userDetails.signupStep === 'PROFILE') {
          try {
            const progressRes = await signupService.getProgress();
            if (progressRes.success && progressRes.frontendStep && progressRes.frontendStep >= 3 && progressRes.frontendStep <= 9) {
              const role = progressRes.signupData.selectedRole;
              const stepKey = role === 'Individual' ? STORAGE_KEYS.CURRENT_STEP_INDIVIDUAL : STORAGE_KEYS.CURRENT_STEP_SHG;
              const dataKey = role === 'Individual' ? STORAGE_KEYS.SIGNUP_DATA_INDIVIDUAL : STORAGE_KEYS.SIGNUP_DATA_SHG;
              await AsyncStorage.setItem(stepKey, progressRes.frontendStep.toString());
              await AsyncStorage.setItem(dataKey, JSON.stringify({ ...progressRes.signupData, mobile }));
              Toast.show({ type: 'info', text1: 'Incomplete Signup', text2: 'Resuming your registration progress' });
              navigation.navigate('Signup');
              return;
            }
          } catch (err) {
            console.error('Failed to fetch signup progress on login:', err);
          }
        }
        
        // Navigate based on application status
        if (response.userDetails.applicationStatus === 'APPROVED') {
          navigation.navigate('Main');
        } else {
          navigation.navigate('ApplicationStatus');
        }
        
        Toast.show({ type: 'success', text1: 'Login Successful' });
      } else {
        Toast.show({ 
          type: 'error', 
          text1: 'Account Not Found', 
          text2: 'User not registered. Please sign up first.' 
        });
        setTimeout(() => navigation.navigate('Signup'), 2000);
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]">
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={50}
        bounces={false}
      >
        {/* Header / Back Button */}
        <View className="px-6 pt-6 pb-4 bg-transparent flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              if (step === 2) {
                setStep(1);
                setOtp(['', '', '', '', '', '']);
              }
              else navigation.goBack();
            }} 
            className="bg-white p-3 rounded-full shadow-sm mr-3" 
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
          <Text className="text-[20px] font-bold text-[#111827]">{t('login')}</Text>
        </View>

        <View className={`px-6 justify-center pb-10 ${step === 2 ? 'pb-20' : ''}`}>
          {/* Massive Branding Section */}
          <View className="mb-8 items-center justify-center mt-4">
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
            {/* Step 1: Mobile Input */}
            {step === 1 && (
              <View>
                <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">{t('login')}</Text>
                <Text className="text-[#6B7280] text-[13px] font-medium mb-8 text-center">
                  {t('enter_mobile')}
                </Text>

                <Text numberOfLines={1} className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">{t('mobile_number')}</Text>
                <View className={`flex-row items-center bg-[#F9FAFB] py-4 px-4 rounded-[20px] shadow-sm border ${mobileError ? 'border-red-500' : 'border-gray-200'} mb-2`}>
                  <Text className="text-[#073318] font-bold mr-3">+91</Text>
                  <View className="w-[1px] h-6 bg-gray-300 mr-3" />
                  <TextInput 
                    className="flex-1 text-[#111827] text-[16px] font-bold"
                    placeholder={t('enter_10_digit')}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={(val) => { 
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setMobile(cleaned); 
                      setMobileError(""); 
                      setOtp(['', '', '', '', '', '']);
                    }}
                  />
                </View>
                {mobileError ? <Text className="text-red-500 text-xs mb-4 ml-1">{mobileError}</Text> : <View className="mb-6" />}

                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={mobile.length !== 10 || loading}
                  className={`${mobile.length !== 10 ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-full items-center justify-center flex-row mb-5`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 8,
                  }}
                >
                  {loading ? <ActivityIndicator color="white" /> : (
                    <>
                      <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide mr-2">{t('send_otp')}</Text>
                      <Ionicons name="arrow-forward" size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>

                <View className="flex-row justify-center items-center mt-2 flex-wrap">
                  <Text className="text-[#6B7280] text-[13px] font-medium">{t('no_account')} </Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                    <Text numberOfLines={1} className="text-[#073318] font-bold text-[14px] px-1">{t('signup')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <View>
                <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">{t('verify_otp')}</Text>
                <Text className="text-[#6B7280] text-[13px] font-medium mb-8 text-center">
                  {t('enter_otp_sent')} <Text className="text-[#073318] font-bold">+91 {mobile || "XXXXXXXXXX"}</Text>
                </Text>
                
                <View className="flex-row justify-between w-full mb-6">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <View 
                      key={i} 
                      className={`w-[14%] aspect-square border-2 rounded-[16px] bg-[#F9FAFB] justify-center items-center relative ${
                        focusedIndex === i ? 'border-[#073318]' : 'border-gray-200'
                      }`}
                    >
                      <Text 
                        style={{ 
                          textAlign: 'center', 
                          textAlignVertical: 'center',
                          includeFontPadding: false 
                        }} 
                        className="text-xl font-bold text-[#111827]"
                      >
                        {otp[i]}
                      </Text>
                      <TextInput
                        ref={(el) => { inputRefs.current[i] = el; }}
                        style={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0,
                          padding: 0,
                        }}
                        keyboardType="numeric"
                        maxLength={1}
                        value={otp[i]}
                        onChangeText={(val) => handleOtpChange(val, i)}
                        onKeyPress={(e) => handleOtpKeyPress(e, i)}
                        onFocus={() => setFocusedIndex(i)}
                        onBlur={() => setFocusedIndex(null)}
                      />
                    </View>
                  ))}
                </View>

                <View className="flex-row items-center justify-center mb-8">
                  <Feather name="clock" size={14} color="#6B7280" className="mr-1.5" />
                  <Text numberOfLines={1} className="text-[#6B7280] text-[13px] font-medium">
                    {timer > 0 ? (
                      <>{t('resend_otp_in')} <Text className="text-[#073318] font-bold">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</Text></>
                    ) : (
                      <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                        <Text numberOfLines={1} className="text-[#073318] font-bold">{t('resend_otp')}</Text>
                      </TouchableOpacity>
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={!otp.every(d => d !== '') || loading}
                  className={`${!otp.every(d => d !== '') ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-full items-center justify-center flex-row mb-5`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 8,
                  }}
                >
                  {loading ? <ActivityIndicator color="white" /> : (
                    <>
                      <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide mr-2">{t('verify_otp')}</Text>
                      <Ionicons name="arrow-forward" size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>

                <View className="items-center mt-2">
                  <TouchableOpacity onPress={() => { setStep(1); setOtp(['', '', '', '', '', '']); }} className="flex-row items-center">
                    <Ionicons name="pencil" size={16} color="#6B7280" className="mr-2" />
                    <Text numberOfLines={1} className="font-semibold text-[#6B7280] text-[14px] px-1">{t('edit_mobile')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Footer (Only for Step 1) */}
        {step === 1 && (
          <View className="items-center px-6 mb-6 mt-auto">
            <Text className="text-[#6B7280] text-xs text-center">
              {t('i_accept')} 
              <Text className="text-[#073318] font-bold" onPress={() => navigation.navigate("Terms")}> {t('terms_conditions')} </Text>{t('and')}<Text className="text-[#073318] font-bold" onPress={() => navigation.navigate("Privacy")}> {t('privacy_policy')}</Text>
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
