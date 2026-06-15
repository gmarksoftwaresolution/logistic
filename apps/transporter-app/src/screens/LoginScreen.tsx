import React, { useState, useRef, useEffect, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  LayoutAnimation,
  Dimensions,
  PixelRatio
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Fonts } from '../constants/Colors';
import { ChevronLeft, Truck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale, moderateScale, SCREEN_WIDTH } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const otpInputs = useRef<Array<TextInput | null>>([]);
  const mobileInputRef = useRef<TextInput>(null);

  // Animation values for running truck and smoke
  const truckAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.4)).current;
  const smokeAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setCurrentStep(1);
      setMobileNumber('');
      setOtp(['', '', '', '', '', '']);
      setError(null);
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 250);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (isVerifying) {
      // Main truck and text group animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(truckAnim, {
            toValue: SCREEN_WIDTH * 0.6,
            duration: 3500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(truckAnim, {
            toValue: -SCREEN_WIDTH * 0.4,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();

      // Smoke particles animation
      smokeAnims.forEach((anim, index) => {
        const delay = index * 600;
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(anim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              })
            ]),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            })
          ])
        ).start();
      });
    } else {
      truckAnim.setValue(-SCREEN_WIDTH * 0.4);
      smokeAnims.forEach(anim => anim.setValue(0));
    }
  }, [isVerifying]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, timer]);

  useEffect(() => {
    if (currentStep === 2) {
      setTimeout(() => {
        otpInputs.current[0]?.focus();
      }, 300);
    } else if (currentStep === 1) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 500);
    }
  }, [currentStep]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);

    if (numericValue.length !== 0 && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleSendOTP = async () => {
    if (!mobileNumber || mobileNumber.length === 0) {
      setError(t('errors.mobile_required'));
      return;
    }
    if (!/^[6789]\d{9}$/.test(mobileNumber)) {
      setError(t('errors.mobile_invalid'));
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    try {
      await api.post('/auth/send-otp', {
        mobileNumber,
        language: i18n.language === 'en' ? 'English' : i18n.language === 'hi' ? 'Hindi' : 'Marathi',
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(2);
      setTimer(30);
    } catch (error: any) {
      console.log('Send OTP error:', error);
      const message = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      const displayMessage = Array.isArray(message) ? message[0] : message;
      setError(displayMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;
    
    setIsVerifying(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-otp', {
        mobileNumber,
        otp: otpCode,
      });
      
      const { accessToken } = response.data;
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('user_phone_number', mobileNumber);
      
      try {
        const isFirstTimeRegister = await AsyncStorage.getItem('IS_FIRST_TIME_REGISTER');
        if (isFirstTimeRegister === 'true') {
          await AsyncStorage.removeItem('IS_FIRST_TIME_REGISTER');
          await AsyncStorage.removeItem('HAS_COMPLETED_ONBOARDING');
        } else {
          await AsyncStorage.setItem('HAS_COMPLETED_ONBOARDING', 'true');
        }
      } catch (storageErr) {
        console.warn('Failed to handle onboarding storage during login:', storageErr);
      }
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(3);
    } catch (error: any) {
      console.log('Verify OTP error:', error);
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      const displayMessage = Array.isArray(message) ? message[0] : message;
      setError(displayMessage);
      Alert.alert('Error', displayMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <Animated.View style={[
        styles.animatedTruckGroup,
        { transform: [{ translateX: truckAnim }] }
      ]}>
        <View style={styles.smokeContainer}>
          {smokeAnims.map((anim, i) => (
            <Animated.View 
              key={i}
              style={[
                styles.smokeParticle,
                {
                  opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 0] }),
                  transform: [
                    { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, scale(-30)] }) },
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, verticalScale(-10)] }) },
                    { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }
                  ]
                }
              ]}
            />
          ))}
        </View>
        <Text style={styles.processingText}>{t('login.processing')}</Text>
        <Truck size={scale(24)} color="#FFFFFF" style={styles.truckIcon} />
      </Animated.View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputCard}>
        <Text style={styles.title}>{t('login.verify_mobile')}</Text>
        <Text style={styles.subtitle}>{t('login.enter_mobile')}</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('login.mobile_label')}</Text>
          <View style={[styles.mobileInputWrapper, error && styles.inputError]}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              ref={mobileInputRef}
              style={styles.mobileInput}
              placeholder={t('login.mobile_placeholder')}
              placeholderTextColor={Colors.textPlaceholder}
              keyboardType="phone-pad"
              maxLength={10}
              value={mobileNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setMobileNumber(cleaned);
                if (cleaned.length === 0) {
                  setError(t('errors.mobile_required'));
                } else if (cleaned.length > 0 && !/^[6789]/.test(cleaned)) {
                  setError(t('errors.mobile_invalid'));
                } else {
                  setError(null);
                }
              }}
              onBlur={() => {
                if (!mobileNumber || mobileNumber.length === 0) {
                  setError(t('errors.mobile_required'));
                }
              }}
            />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (!/^[6789]\d{9}$/.test(mobileNumber) || isVerifying) && styles.buttonDisabled]}
          disabled={!/^[6789]\d{9}$/.test(mobileNumber) || isVerifying}
          onPress={handleSendOTP}
        >
          {isVerifying ? renderProcessing() : (
            <Text style={styles.buttonText}>{t('login.get_otp')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputCard}>
        <Text style={styles.title}>{t('login.verify_otp')}</Text>
        <Text style={styles.subtitle}>{t('signup.enter_otp_desc', { mobile: mobileNumber })}</Text>

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { otpInputs.current[index] = ref; }}
              style={styles.otpBox}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(val) => handleOtpChange(val, index)}
              onKeyPress={(e) => handleOtpKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (otp.join('').length !== 6 || isVerifying) && styles.buttonDisabled]}
          disabled={otp.join('').length !== 6 || isVerifying}
          onPress={handleVerifyOTP}
        >
          {isVerifying ? renderProcessing() : (
            <Text style={styles.buttonText}>{t('login.verify_otp')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.otpLinks}>
          <TouchableOpacity disabled={timer > 0} onPress={handleSendOTP}>
            <Text style={[styles.linkText, timer > 0 && { color: Colors.textPlaceholder }]}>
              {timer > 0 ? t('login.resend_in', { timer: formatTimer(timer) }) : "Resend OTP"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCurrentStep(1);
            setOtp(['', '', '', '', '', '']);
          }}>
            <Text style={styles.linkText}>{t('login.change_mobile')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputCard}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✔</Text>
          </View>
          <Text style={[styles.title, { textAlign: 'center' }]}>{t('login.login_success')}</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>{t('login.welcome_back')}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.buttonText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topNavigation}>
            <TouchableOpacity 
              style={styles.backArrowButton} 
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'GetStarted' }],
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <ChevronLeft size={scale(24)} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.mainTitle}>{t('login.title')}</Text>
          </View>



          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {currentStep !== 3 && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('login.no_account')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signupText}>{t('login.signup_link')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: Platform.OS === 'ios' ? verticalScale(5) : verticalScale(15),
    paddingBottom: verticalScale(24),
  },
  mainHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
    marginTop: verticalScale(10),
  },
  topNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(24),
    marginTop: Platform.OS === 'ios' ? verticalScale(20) : verticalScale(25),
  },
  backArrowButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: moderateScale(4),
  },
  mainTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(24),
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginRight: scale(44), // To balance the back button width
  },

  stepLine: {
    width: scale(40),
    height: verticalScale(2),
    marginHorizontal: scale(8),
  },
  lineActive: {
    backgroundColor: Colors.primary,
  },
  lineInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: verticalScale(20),
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(28),
    color: Colors.textPrimary,
    textAlign: 'left',
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(16),
    color: Colors.textSecondary,
    textAlign: 'left',
    marginBottom: verticalScale(32),
    lineHeight: verticalScale(24),
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(16),
    elevation: moderateScale(4),
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginBottom: verticalScale(16),
    letterSpacing: moderateScale(1),
  },
  inputContainer: {
    marginBottom: verticalScale(32),
  },
  mobileInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: moderateScale(1.5),
    borderBottomColor: '#E5E7EB',
    paddingBottom: verticalScale(12),
  },
  prefix: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    marginRight: moderateScale(12),
  },
  mobileInput: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    padding: 0,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(8),
    elevation: moderateScale(4),
  },
  buttonDisabled: {
    backgroundColor: Colors.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(32),
  },
  otpBox: {
    width: (SCREEN_WIDTH - moderateScale(120)) / 6,
    height: verticalScale(56),
    backgroundColor: Colors.background,
    borderRadius: moderateScale(12),
    borderWidth: moderateScale(1.5),
    borderColor: '#E5E7EB',
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
  },
  otpLinks: {
    marginTop: verticalScale(24),
    alignItems: 'center',
    gap: verticalScale(12),
  },
  linkText: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
    fontSize: moderateScale(14),
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(40),
  },
  successIcon: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  checkmark: {
    fontSize: moderateScale(40),
    color: Colors.success,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: verticalScale(16),
  },
  footerText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(15),
    color: Colors.textSecondary,
  },
  signupText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.primary,
  },
  processingContainer: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  animatedTruckGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
  },
  truckIcon: {
    marginLeft: scale(8),
  },
  processingText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    letterSpacing: moderateScale(1),
    marginRight: scale(4),
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  smokeContainer: {
    position: 'absolute',
    left: scale(-10),
    bottom: verticalScale(2),
    flexDirection: 'row',
  },
  smokeParticle: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: scale(4),
  },
  errorText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#EF4444',
    marginTop: verticalScale(4),
    marginLeft: scale(4),
  },
  inputError: {
    borderBottomColor: '#EF4444',
  },
});

export default LoginScreen;
