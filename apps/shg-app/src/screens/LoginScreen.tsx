import React, { useState, useRef, useEffect, useContext } from 'react';
import { Image, View, Text, TouchableOpacity, TextInput, Platform, ActivityIndicator, Keyboard } from 'react-native';
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
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const mobileInputRef = useRef<TextInput | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isMobileFocused, setIsMobileFocused] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setStep(1);
      setMobile('');
      setMobileError('');
      setOtpError('');
      setOtp(['', '', '', '', '', '']);
      setTimer(60);
      setLoading(false);
      setFocusedIndex(null);
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 150);
    }, [])
  );

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } else if (step === 1) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

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
    setOtpError('');
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
    setOtpError('');
    try {
      await authService.sendLoginOtp(mobile);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      Toast.show({ type: 'success', text1: 'OTP Resent Successfully' });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      setOtpError(displayMessage || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!mobile) {
      setMobileError(t('val_mobile_number_required') || 'Mobile number is required');
      return;
    }
    if (mobile.length !== 10) {
      setMobileError(t('su_enter_valid_10_digit_100') || 'Enter a valid 10 digit mobile number');
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
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      setMobileError(displayMessage || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setOtpError('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    setOtpError('');
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
          name: response.userDetails.fullName ? response.userDetails.fullName.replace(/\s*\(.*\)\s*/g, '').trim() : '',
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
        setOtpError('User not registered. Please sign up first.');
        setTimeout(() => navigation.navigate('Signup'), 2000);
      }
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      setOtpError(displayMessage || 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={40}
        extraHeight={40}
        enableAutomaticScroll={true}
      >
        {/* Modern Back Header */}
        <View className="px-6 pt-6 pb-2 flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              if (step === 2) {
                setStep(1);
                setOtp(['', '', '', '', '', '']);
              } else {
                navigation.goBack();
              }
            }} 
            className="bg-white p-3 rounded-full shadow-sm mr-4"
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
          <Text className="text-[24px] font-extrabold text-[#111827]">
            {step === 2 ? (t('verify_otp') || "Verify OTP") : (t('login') || "Sign In")}
          </Text>
        </View>

        <View className="flex-grow px-6 justify-center pb-8">
          {/* Logo & Brand Header */}
          <View className={`${isKeyboardVisible ? 'mb-4 mt-2' : 'mb-10 mt-4'} items-center justify-center text-center`}>
            <Image
              source={require('../../assets/images/GMU Logo.png')}
              style={isKeyboardVisible ? { width: 50, height: 50 } : { width: 80, height: 80 }}
              resizeMode="contain"
              className={isKeyboardVisible ? 'mb-1' : 'mb-2'}
            />
            <Text className={`font-extrabold tracking-tight text-center px-4 ${isKeyboardVisible ? 'text-[24px]' : 'text-[36px]'}`} adjustsFontSizeToFit numberOfLines={1}>
              <Text style={{ color: '#073318' }}>{t('gram')}</Text>
              <Text style={{ color: '#84B827' }}>{t('unnati')}</Text>
            </Text>
            <Text className={`font-black text-[#073318] tracking-widest uppercase text-center mt-1 ${isKeyboardVisible ? 'text-[12px]' : 'text-[18px]'}`} adjustsFontSizeToFit numberOfLines={1}>{t('delivery_partner')}</Text>
          </View>

          {/* Form Content Container */}
          <View 
            className="bg-white rounded-[32px] p-6 w-full border border-gray-100"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.05,
              shadowRadius: 16,
              elevation: 10
            }}
          >
            {step === 1 && (
              <View>
                <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">
                  {t('welcome_back') || 'Welcome Back!'}
                </Text>
                <Text className="text-[#6B7280] text-[13px] font-medium mb-6 text-center">
                  {t('login_desc') || 'Enter your mobile number to sign in'}
                </Text>

                <View className="mb-5">
                  <Text className="text-[10px] font-bold text-[#414651] uppercase tracking-wider mb-2 ml-1">
                    {t('mobile_number')}
                  </Text>
                  <View
                    className={`bg-[#F9FAFB] h-[50px] px-4 rounded-[16px] border flex-row items-center ${
                      mobileError ? 'border-[#EF4444]' : isMobileFocused ? 'border-[#073318]' : 'border-gray-200'
                    }`}
                  >
                    <Text className="text-[#073318] text-[15px] font-bold mr-3">+91</Text>
                    <View className="h-5 w-[1px] bg-gray-200 mr-3" />
                    <TextInput
                      ref={mobileInputRef}
                      className="flex-1 text-[#111827] text-[15px] font-medium p-0"
                      style={{ padding: 0, height: '100%', textAlignVertical: 'center' }}
                      placeholder="Enter your mobile number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      maxLength={10}
                      value={mobile}
                      onChangeText={(val) => {
                        setMobile(val);
                        if (val.length === 10) setMobileError('');
                      }}
                      onFocus={() => setIsMobileFocused(true)}
                      onBlur={() => setIsMobileFocused(false)}
                    />
                  </View>
                  {mobileError ? (
                    <Text className="text-red-500 text-xs mt-1.5 ml-2 font-medium">{mobileError}</Text>
                  ) : null}
                </View>

                 <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={loading}
                  className={`${loading ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-2xl items-center justify-center flex-row mb-5`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: loading ? 0 : 0.3,
                    shadowRadius: 5,
                    elevation: loading ? 0 : 8,
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
                
                <View className="flex-row justify-between w-full mb-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <View 
                      key={i} 
                      className={`w-[14%] aspect-square border-2 rounded-[16px] bg-[#F9FAFB] justify-center items-center relative ${
                        otpError ? 'border-red-500' : focusedIndex === i ? 'border-[#073318]' : 'border-gray-200'
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
                {otpError ? (
                  <Text className="text-red-500 text-xs mt-1.5 mb-3 text-center font-medium">{otpError}</Text>
                ) : null}

                <View className="flex-row items-center justify-center mb-8">
                  <Feather name="clock" size={14} color="#6B7280" style={{ marginRight: 6 }} />
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
                  className={`${!otp.every(d => d !== '') ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-2xl items-center justify-center flex-row mb-5`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: (!otp.every(d => d !== '') || loading) ? 0 : 0.3,
                    shadowRadius: 5,
                    elevation: (!otp.every(d => d !== '') || loading) ? 0 : 8,
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
                    <Ionicons name="pencil" size={16} color="#6B7280" style={{ marginRight: 8 }} />
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
              <Text className="text-[#073318] font-bold" onPress={() => navigation.navigate("Terms")}> {t('terms_conditions')} </Text>{t('and')}<Text className="text-[#073318] font-bold" onPress={() => navigation.navigate("Privacy")}> {t('privacy_title')}</Text>
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
