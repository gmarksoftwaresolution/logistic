import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

interface ReturnOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  orderIdText: string;
  buyerMobile?: string;
}

export const ReturnOtpModal: React.FC<ReturnOtpModalProps> = ({
  visible,
  onClose,
  onVerify,
  orderIdText,
  buyerMobile,
}) => {
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '']);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputs = useRef<Array<TextInput | null>>([]);

  // Reset internal modal state cleanly whenever modal becomes visible or order changes
  useEffect(() => {
    if (visible) {
      setOtpValues(['', '', '', '']);
      setOtpSent(false);
      setIsVerified(false);
      setLoading(false);
      setSubmitting(false);
      setFocusedIndex(null);
      setErrorMessage(null);
    }
  }, [visible, orderIdText]);

  const formatMaskedMobile = (phone?: string) => {
    if (!phone || phone === 'N/A') return '******0002';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length >= 4) {
      const last4 = clean.slice(-4);
      return `******${last4}`;
    }
    return '******0002';
  };

  const handleSendOtp = () => {
    setOtpSent(true);
    setErrorMessage(null);
    Toast.show({
      type: 'info',
      text1: 'OTP Sent',
      text2: `Demo OTP is 1234 (Sent to ${formatMaskedMobile(buyerMobile)})`,
    });
    // Auto-focus first OTP input after state update
    setTimeout(() => {
      inputs.current[0]?.focus();
    }, 150);
  };

  const handleOtpChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, '');
    const newOtp = [...otpValues];
    newOtp[index] = clean;
    setOtpValues(newOtp);
    setErrorMessage(null);

    // If user changes OTP after verification, reset verified state
    if (isVerified) {
      setIsVerified(false);
    }

    if (clean.length > 0 && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleCloseModal = () => {
    setOtpValues(['', '', '', '']);
    setOtpSent(false);
    setIsVerified(false);
    setLoading(false);
    setSubmitting(false);
    setFocusedIndex(null);
    setErrorMessage(null);
    onClose();
  };

  // Stage 1: Verify OTP
  const handleVerify = () => {
    const fullOtp = otpValues.join('');
    if (fullOtp.length < 4) {
      setErrorMessage('Please enter all 4 digits.');
      Toast.show({
        type: 'error',
        text1: 'Incomplete OTP',
        text2: 'Please enter all 4 digits.',
      });
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // Demo OTP check (1234)
    if (fullOtp !== '1234') {
      setLoading(false);
      setIsVerified(false);
      setErrorMessage('Incorrect OTP. Please enter the correct 4-digit OTP.');
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Incorrect OTP. Demo OTP is 1234.',
      });
      return;
    }

    // OTP is valid - Transition to Verified state
    setLoading(false);
    setIsVerified(true);
    setErrorMessage(null);
    Toast.show({
      type: 'success',
      text1: 'OTP Verified',
      text2: 'OTP verified successfully. Tap Submit to complete pickup.',
    });
  };

  // Stage 2: Submit and Complete Return Pickup
  const handleSubmit = async () => {
    const fullOtp = otpValues.join('');
    if (!isVerified || fullOtp.length < 4) {
      setErrorMessage('Please verify the OTP before submitting.');
      Toast.show({
        type: 'error',
        text1: 'OTP Not Verified',
        text2: 'Please verify the OTP before submitting.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await onVerify(fullOtp);
      handleCloseModal();
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Pickup submission failed';
      setErrorMessage(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: Array.isArray(errMsg) ? errMsg[0] : errMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formattedMobileText = formatMaskedMobile(buyerMobile);
  const isActionLoading = loading || submitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCloseModal}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full max-w-sm"
          >
            <View
              className="bg-white rounded-[28px] p-6 shadow-2xl border border-slate-100 overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between pb-4 border-b border-slate-100">
                <View className="flex-row items-center flex-1 mr-2">
                  <View
                    className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                      isVerified
                        ? 'bg-emerald-50 border border-emerald-200'
                        : otpSent
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Ionicons
                      name={
                        isVerified
                          ? 'checkmark-circle'
                          : otpSent
                          ? 'key-outline'
                          : 'shield-checkmark'
                      }
                      size={22}
                      color={isVerified ? '#059669' : otpSent ? '#D97706' : '#0F172A'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] font-bold text-slate-900 tracking-tight" numberOfLines={1}>
                      Buyer OTP Verification
                    </Text>
                    <Text className="text-[12px] font-semibold text-slate-500 mt-0.5" numberOfLines={1}>
                      {orderIdText}
                    </Text>
                  </View>
                </View>

                {/* Close X Button */}
                <TouchableOpacity
                  onPress={handleCloseModal}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* STEP 1: INITIAL STATE (Before Send OTP) */}
              {!otpSent ? (
                <View className="pt-4">
                  {/* Buyer Mobile Info Card */}
                  <View className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 mb-3 flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-amber-100/80 items-center justify-center mr-3">
                      <Ionicons name="phone-portrait-outline" size={16} color="#B45309" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Buyer Contact
                      </Text>
                      <Text className="text-[13px] font-bold text-slate-800 mt-0.5">
                        OTP will be sent to {formattedMobileText}
                      </Text>
                    </View>
                  </View>

                  {/* Instruction */}
                  <Text className="text-[13px] font-medium text-slate-600 leading-5 mb-5 px-1">
                    Collect the parcel from Buyer and ask for the 4-digit verification OTP.
                  </Text>

                  {/* Send OTP Button */}
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    className="w-full bg-[#0F172A] py-3.5 rounded-2xl items-center justify-center mb-2.5 shadow-sm active:opacity-90 flex-row gap-2"
                    activeOpacity={0.8}
                  >
                    <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />
                    <Text className="text-white font-bold text-[14px]">
                      Send OTP to Buyer
                    </Text>
                  </TouchableOpacity>

                  {/* Cancel Action */}
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    className="w-full py-2.5 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="font-semibold text-slate-500 text-[13px]">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* STEP 2 & 3: OTP SENT & VERIFICATION STATE */
                <View className="pt-4">
                  {/* OTP Sent Confirmation Banner */}
                  <View
                    className={`p-3 rounded-2xl border mb-4 flex-row items-center justify-between ${
                      isVerified
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50/80 border-amber-200/80'
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <Ionicons
                        name={isVerified ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={18}
                        color={isVerified ? '#059669' : '#D97706'}
                      />
                      <Text
                        className={`text-[12px] font-bold ml-2 ${
                          isVerified ? 'text-emerald-800' : 'text-amber-900'
                        }`}
                        numberOfLines={1}
                      >
                        {isVerified ? 'OTP Verified Successfully' : 'OTP sent successfully'}
                      </Text>
                    </View>
                    {!isVerified && (
                      <TouchableOpacity
                        onPress={handleSendOtp}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text className="text-[12px] font-bold text-amber-700 underline">
                          Resend
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Section Title */}
                  <Text className="text-[13px] font-bold text-slate-700 text-center mb-3">
                    Enter 4-digit OTP
                  </Text>

                  {/* 4 OTP Input Boxes */}
                  <View className="flex-row justify-between mb-3 px-2">
                    {[0, 1, 2, 3].map((index) => {
                      const isFocused = focusedIndex === index;
                      const hasValue = !!otpValues[index];
                      const isError = !isVerified && !!errorMessage;

                      return (
                        <TextInput
                          key={index}
                          ref={(ref) => {
                            inputs.current[index] = ref;
                          }}
                          className={`w-13 h-14 bg-slate-50 border-2 rounded-2xl text-center font-bold text-[22px] text-slate-900 ${
                            isVerified
                              ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                              : isError
                              ? 'border-red-400 bg-red-50/20'
                              : isFocused
                              ? 'border-amber-500 bg-white shadow-sm'
                              : hasValue
                              ? 'border-slate-300 bg-white'
                              : 'border-slate-200'
                          }`}
                          style={{ width: 54, height: 56 }}
                          keyboardType="number-pad"
                          maxLength={1}
                          value={otpValues[index]}
                          onChangeText={(text) => handleOtpChange(text, index)}
                          onKeyPress={(e) => handleKeyPress(e, index)}
                          onFocus={() => setFocusedIndex(index)}
                          onBlur={() => setFocusedIndex(null)}
                          editable={!submitting && !isVerified}
                          selectTextOnFocus
                        />
                      );
                    })}
                  </View>

                  {/* Inline Error Message */}
                  {errorMessage && (
                    <View className="flex-row items-center justify-center mb-3 bg-red-50 py-1.5 px-3 rounded-xl border border-red-100">
                      <Ionicons name="alert-circle" size={15} color="#DC2626" />
                      <Text className="text-[12px] font-medium text-red-600 ml-1.5 text-center flex-shrink">
                        {errorMessage}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="mt-2 gap-2.5">
                    {!isVerified ? (
                      <TouchableOpacity
                        onPress={handleVerify}
                        disabled={isActionLoading}
                        className="w-full py-3.5 rounded-2xl bg-[#073318] items-center justify-center shadow-sm active:opacity-90"
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text className="font-bold text-white text-[14px]">
                            Verify OTP
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isActionLoading}
                        className="w-full py-3.5 rounded-2xl bg-[#073318] items-center justify-center shadow-sm active:opacity-90 flex-row gap-2"
                        activeOpacity={0.8}
                      >
                        {submitting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                            <Text className="font-bold text-white text-[14px]">
                              Submit Pickup
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Cancel Button */}
                    <TouchableOpacity
                      onPress={handleCloseModal}
                      disabled={isActionLoading}
                      className="w-full py-2.5 items-center justify-center"
                      activeOpacity={0.7}
                    >
                      <Text className="font-semibold text-slate-500 text-[13px]">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
