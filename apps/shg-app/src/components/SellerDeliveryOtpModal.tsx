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

interface SellerDeliveryOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  orderIdText: string;
  sellerMobile?: string;
}

export const SellerDeliveryOtpModal: React.FC<SellerDeliveryOtpModalProps> = ({
  visible,
  onClose,
  onVerify,
  orderIdText,
  sellerMobile,
}) => {
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '']);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const inputs = useRef<Array<TextInput | null>>([]);

  // Reset internal state whenever modal opens or order changes
  useEffect(() => {
    if (visible) {
      setOtpSent(false);
      setOtpValues(['', '', '', '']);
      setIsSending(false);
      setIsSubmitting(false);
      setFocusedIndex(null);
      setErrorMessage(null);
      setResendCooldown(0);
    }
  }, [visible, orderIdText]);

  // Resend timer countdown
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  const formatMaskedMobile = (phone?: string) => {
    if (!phone || phone === 'N/A') return '******67';
    const clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.length >= 2) {
      const last2 = clean.slice(-2);
      return `******${last2}`;
    }
    return '******67';
  };

  const handleSendOtp = async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      setOtpSent(true);
      setOtpValues(['', '', '', '']);
      setResendCooldown(30);
      Toast.show({
        type: 'info',
        text1: 'OTP Sent',
        text2: `OTP sent to seller's registered mobile (${formatMaskedMobile(sellerMobile)})`,
      });
      setTimeout(() => {
        inputs.current[0]?.focus();
      }, 150);
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (errorMessage) setErrorMessage(null);

    // Handle paste of 4 digits
    if (clean.length > 1) {
      const digits = clean.slice(0, 4).split('');
      const newOtp = ['', '', '', ''];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtpValues(newOtp);
      const nextFocus = Math.min(digits.length, 3);
      inputs.current[nextFocus]?.focus();
      return;
    }

    const newOtp = [...otpValues];
    newOtp[index] = clean;
    setOtpValues(newOtp);

    if (clean.length > 0 && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const fullOtp = otpValues.join('');
  const isOtpComplete = fullOtp.length === 4;

  const handleVerify = async () => {
    if (!isOtpComplete || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onVerify(fullOtp);
    } catch (err: any) {
      // Clean, user-facing invalid OTP validation message
      const is400OrOtpError =
        err?.response?.status === 400 ||
        err?.response?.data?.statusCode === 400 ||
        err?.response?.data?.message?.toString().toLowerCase().includes('otp') ||
        err?.message?.toString().toLowerCase().includes('otp') ||
        err?.message?.toString().includes('400');

      const cleanErrorMessage = is400OrOtpError
        ? 'Invalid OTP. Please enter a valid OTP.'
        : 'Unable to verify OTP. Please try again.';

      setErrorMessage(cleanErrorMessage);
      setOtpValues(['', '', '', '']);
      setTimeout(() => {
        inputs.current[0]?.focus();
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskedPhone = formatMaskedMobile(sellerMobile);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isSubmitting ? undefined : onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full max-w-sm"
          >
            <View
              className="bg-white rounded-[32px] p-6 shadow-2xl border border-slate-100 overflow-hidden items-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Icon Circle */}
              <View className="w-16 h-16 rounded-full bg-[#DCFCE7] items-center justify-center mb-3 border border-[#BBF7D0]">
                <Ionicons name="shield-checkmark" size={32} color="#059669" />
              </View>

              {/* Title & Order ID */}
              <Text className="text-[20px] font-black text-[#111827] text-center tracking-tight">
                Verify Seller OTP
              </Text>
              <Text className="text-[13px] font-extrabold text-[#059669] mt-1 text-center">
                {orderIdText}
              </Text>

              {!otpSent ? (
                /* STEP 1: INITIAL STATE (Before Send OTP) */
                <View className="w-full items-center">
                  <Text className="text-[13px] font-medium text-slate-500 text-center mt-3 px-3 leading-relaxed">
                    Enter the OTP sent to the{"\n"}Seller's registered mobile number
                  </Text>

                  {/* Masked Seller Mobile Box */}
                  <View className="bg-slate-50 border border-slate-200/80 rounded-2xl py-2.5 px-6 my-4">
                    <Text className="text-[17px] font-black text-slate-800 tracking-widest text-center">
                      {maskedPhone}
                    </Text>
                  </View>

                  {/* Send OTP Button */}
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={isSending}
                    activeOpacity={0.85}
                    className="w-full py-4 rounded-[20px] bg-[#059669] border border-[#059669] flex-row items-center justify-center shadow-md mb-2.5"
                    style={{ elevation: 3 }}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-black text-[15px] tracking-wide">
                        Send OTP
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={onClose}
                    disabled={isSending}
                    activeOpacity={0.7}
                    className="w-full py-3.5 rounded-[20px] bg-slate-100 items-center justify-center border border-slate-200"
                  >
                    <Text className="font-extrabold text-[14px] text-slate-600">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* STEP 2 & 3: OTP SENT STATE (Enter OTP, Verify, Resend) */
                <View className="w-full items-center">
                  <Text className="text-[13px] font-medium text-slate-500 text-center mt-2 px-3 leading-relaxed">
                    OTP sent to seller's{"\n"}registered mobile number
                  </Text>

                  {/* Masked Seller Mobile Confirmation */}
                  <View className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl py-1.5 px-5 mt-2 mb-3">
                    <Text className="text-[14px] font-black text-[#059669] tracking-widest text-center">
                      {maskedPhone}
                    </Text>
                  </View>

                  {/* 4 Separate OTP Box Inputs */}
                  <View className="flex-row justify-center gap-3 my-3 w-full">
                    {[0, 1, 2, 3].map((index) => (
                      <TextInput
                        key={index}
                        ref={(el) => {
                          inputs.current[index] = el;
                        }}
                        value={otpValues[index]}
                        onChangeText={(text) => handleOtpChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        style={{ textAlign: 'center' }}
                        className={`w-14 h-14 bg-slate-50 rounded-[18px] border text-center text-[24px] font-black text-[#111827] ${
                          otpValues[index]
                            ? 'border-[#059669] bg-[#F0FDF4]'
                            : focusedIndex === index
                            ? 'border-[#059669] bg-white'
                            : 'border-slate-200'
                        }`}
                      />
                    ))}
                  </View>

                  {/* Error Banner below OTP boxes */}
                  {errorMessage && (
                    <View className="w-full bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-3 flex-row items-center justify-center">
                      <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text className="text-[12px] font-bold text-red-600 text-center flex-1">
                        {errorMessage}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="w-full space-y-2">
                    {/* Verify Button */}
                    <TouchableOpacity
                      onPress={handleVerify}
                      disabled={!isOtpComplete || isSubmitting}
                      activeOpacity={0.85}
                      className={`w-full py-4 rounded-[20px] flex-row items-center justify-center shadow-md mb-1.5 ${
                        isOtpComplete && !isSubmitting
                          ? 'bg-[#059669] border border-[#059669]'
                          : 'bg-slate-200 border border-slate-200'
                      }`}
                      style={isOtpComplete && !isSubmitting ? { elevation: 3 } : undefined}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          className={`font-black text-[15px] tracking-wide ${
                            isOtpComplete ? 'text-white' : 'text-slate-400'
                          }`}
                        >
                          Verify
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Resend OTP Button */}
                    <TouchableOpacity
                      onPress={handleSendOtp}
                      disabled={resendCooldown > 0 || isSending || isSubmitting}
                      activeOpacity={0.7}
                      className="w-full py-2 items-center justify-center"
                    >
                      <Text
                        className={`text-[13px] font-bold ${
                          resendCooldown > 0
                            ? 'text-slate-400'
                            : 'text-[#059669] underline'
                        }`}
                      >
                        {resendCooldown > 0
                          ? `Resend OTP in ${resendCooldown}s`
                          : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity
                      onPress={onClose}
                      disabled={isSubmitting}
                      activeOpacity={0.7}
                      className="w-full py-3 rounded-[20px] bg-slate-100 items-center justify-center border border-slate-200 mt-1"
                    >
                      <Text className="font-extrabold text-[14px] text-slate-600">
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

export default SellerDeliveryOtpModal;
