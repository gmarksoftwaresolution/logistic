import React, { useContext, useState, useRef, useEffect } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Animated, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../context/OrderContext';
import { ActivityIndicator } from 'react-native';
export const REJECTION_REASONS = ['customer_not_available', 'wrong_address', 'product_damaged', 'transport_issue', 'payment_issue', 'duplicate_order', 'other'];
interface RejectReasonModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (order: Order, reason: string) => void | Promise<void>;
}
export const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
  visible,
  order,
  onClose,
  onSubmit
}) => {
  const context = useContext(LanguageContext);
  const { t } = context!;

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherText, setOtherText] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      setSelectedReason('');
      setOtherText('');
      setValidationError('');
      Animated.parallel([Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      }), Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 11,
        useNativeDriver: true
      })]).start();
    } else {
      Animated.parallel([Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }), Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true
      })]).start();
    }
  }, [visible]);
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!selectedReason) {
      setValidationError(t('su_please_select_a_reas_468') || 'Please select a rejection reason');
      return;
    }
    if (selectedReason === 'other' && otherText.trim().length === 0) {
      setValidationError(t('su_enter_rejection_reas_469') || 'Please enter rejection reason');
      return;
    }
    if (!order) return;
    const finalReason = selectedReason === 'other' ? otherText.trim() : selectedReason;
    setValidationError('');
    
    try {
      setIsSubmitting(true);
      await onSubmit(order, finalReason);
    } catch (e) {
      // error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    setValidationError('');
    if (reason !== 'other') setOtherText('');
  };
  if (!visible && !order) return null;
  return <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Dark overlay */}
      <Animated.View style={{
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      opacity: fadeAnim
    }}>
        <Pressable style={{
        flex: 1
      }} onPress={onClose} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0
      }}>
          <Animated.View style={{
          transform: [{
            translateY: slideAnim
          }],
          backgroundColor: 'white',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingBottom: Platform.OS === 'ios' ? 36 : 28,
          maxHeight: '85%',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4
          },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 20
        }}>
            {/* Grab handle */}
            <View style={{
            width: 44,
            height: 4,
            backgroundColor: '#E2E8F0',
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: 12,
            marginBottom: 20
          }} />

            {/* Header */}
            <View style={{
            paddingHorizontal: 24,
            marginBottom: 6
          }}>
              <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
                <View style={{
                flex: 1,
                marginRight: 12
              }}>
                  {/* Red accent line */}
                  <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 6
                }}>
                    <View style={{
                    width: 4,
                    height: 20,
                    backgroundColor: '#DC2626',
                    borderRadius: 2,
                    marginRight: 10
                  }} />
                    <Text style={{
                    fontSize: 20,
                    fontWeight: '900',
                    color: '#0F172A',
                    letterSpacing: -0.3
                  }}>{t("su_reject_order_356")}</Text>
                  </View>
                  <Text style={{
                  fontSize: 13,
                  color: '#64748B',
                  fontWeight: '500',
                  marginLeft: 14
                }}>{t("su_please_select_a_reas_468")}</Text>
                </View>
                <TouchableOpacity onPress={onClose} disabled={isSubmitting} style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isSubmitting ? 0.5 : 1
              }}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View style={{
            height: 1,
            backgroundColor: '#F1F5F9',
            marginVertical: 16
          }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 8
          }} keyboardShouldPersistTaps="handled">
              {/* Reason Options */}
              {REJECTION_REASONS.map(reason => {
              const isSelected = selectedReason === reason;
              const isOtherSelected = reason === 'other' && isSelected;
              return <View key={reason}>
                    <TouchableOpacity onPress={() => handleSelectReason(reason)} activeOpacity={0.7} disabled={isSubmitting} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  marginBottom: 8,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#DC2626' : '#E2E8F0',
                  backgroundColor: isSelected ? '#FFF5F5' : '#FAFAFA'
                }}>
                      {/* Custom Radio Circle */}
                      <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: isSelected ? '#DC2626' : '#CBD5E1',
                    backgroundColor: isSelected ? '#DC2626' : 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                        {isSelected && <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'white'
                    }} />}
                      </View>
                      <Text style={{
                    fontSize: 14,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#DC2626' : '#334155',
                    flex: 1
                  }}>
                        {t("reason_" + reason)}
                      </Text>
                      {isSelected && reason !== 'other' && <Ionicons name="checkmark-circle" size={18} color="#DC2626" />}
                    </TouchableOpacity>

                    {/* "Other" expanded text input */}
                    {isOtherSelected && <View style={{
                  marginBottom: 8,
                  marginTop: -4,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#DC2626',
                  backgroundColor: '#FFF5F5',
                  padding: 12
                }}>
                        <TextInput editable={!isSubmitting} value={otherText} onChangeText={text => {
                    if (text.length <= 200) {
                      setOtherText(text);
                      setValidationError('');
                    }
                  }} placeholder={t("su_enter_rejection_reas_469")} placeholderTextColor="#94A3B8" multiline numberOfLines={3} maxLength={200} style={{
                    fontSize: 14,
                    color: '#0F172A',
                    fontWeight: '500',
                    minHeight: 72,
                    textAlignVertical: 'top'
                  }} />
                        <Text style={{
                    fontSize: 11,
                    color: '#94A3B8',
                    textAlign: 'right',
                    marginTop: 4
                  }}>
                          {otherText.length}/200
                        </Text>
                      </View>}
                  </View>;
            })}

              {/* Validation Error */}
              {validationError.length > 0 && <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FEF2F2',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: '#FECACA',
              marginTop: 4,
              marginBottom: 4
            }}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" style={{
                marginRight: 8
              }} />
                  <Text style={{
                fontSize: 13,
                color: '#DC2626',
                fontWeight: '600',
                flex: 1
              }}>
                    {validationError}
                  </Text>
                </View>}
            </ScrollView>

            {/* Bottom Action Buttons */}
            <View style={{
            flexDirection: 'row',
            paddingHorizontal: 24,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
            gap: 12
          }}>
              {/* Cancel Button */}
              <TouchableOpacity onPress={onClose} activeOpacity={0.75} disabled={isSubmitting} style={{
              flex: 1,
              height: 52,
              backgroundColor: isSubmitting ? '#F8FAFC' : 'white',
              borderWidth: 1.5,
              borderColor: isSubmitting ? '#E2E8F0' : '#CBD5E1',
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                <Text style={{
                fontSize: 14,
                fontWeight: '700',
                color: isSubmitting ? '#94A3B8' : '#475569'
              }}>{t("cancel")}</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} disabled={isSubmitting} style={{
              flex: 2,
              height: 52,
              backgroundColor: isSubmitting ? '#FCA5A5' : '#DC2626',
              borderRadius: 26,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#DC2626',
              shadowOffset: {
                width: 0,
                height: 4
              },
              shadowOpacity: isSubmitting ? 0.1 : 0.3,
              shadowRadius: 8,
              elevation: isSubmitting ? 0 : 6
            }}>
                {isSubmitting ? <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} /> : <Ionicons name="close-circle" size={18} color="white" style={{
                marginRight: 8
              }} />}
                <Text style={{
                fontSize: 14,
                fontWeight: '800',
                color: 'white',
                letterSpacing: 0.2
              }}>{isSubmitting ? (t('su_processing') || 'Processing...') : t("su_submit_rejection_471")}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>;
};