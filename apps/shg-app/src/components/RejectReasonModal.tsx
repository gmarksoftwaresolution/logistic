import React, { useContext, useState, useRef, useEffect } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Animated, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../context/OrderContext';
export const REJECTION_REASONS = ['Customer not available', 'Wrong address', 'Product damaged', 'Transport issue', 'Payment issue', 'Duplicate order', 'Other'];
interface RejectReasonModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (order: Order, reason: string) => void;
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
  const handleSubmit = () => {
    if (!selectedReason) {
      setValidationError('Please select a rejection reason');
      return;
    }
    if (selectedReason === 'Other' && otherText.trim().length === 0) {
      setValidationError('Please enter rejection reason');
      return;
    }
    if (!order) return;
    const finalReason = selectedReason === 'Other' ? otherText.trim() : selectedReason;
    setValidationError('');
    onSubmit(order, finalReason);
  };
  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    setValidationError('');
    if (reason !== 'Other') setOtherText('');
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
                <TouchableOpacity onPress={onClose} style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center'
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
              const isOtherSelected = reason === 'Other' && isSelected;
              return <View key={reason}>
                    <TouchableOpacity onPress={() => handleSelectReason(reason)} activeOpacity={0.7} style={{
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
                        {reason}
                      </Text>
                      {isSelected && reason !== 'Other' && <Ionicons name="checkmark-circle" size={18} color="#DC2626" />}
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
                        <TextInput value={otherText} onChangeText={text => {
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
              <TouchableOpacity onPress={onClose} activeOpacity={0.75} style={{
              flex: 1,
              height: 52,
              backgroundColor: 'white',
              borderWidth: 1.5,
              borderColor: '#CBD5E1',
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                <Text style={{
                fontSize: 14,
                fontWeight: '700',
                color: '#475569'
              }}>{t("cancel")}</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} style={{
              flex: 2,
              height: 52,
              backgroundColor: '#DC2626',
              borderRadius: 26,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#DC2626',
              shadowOffset: {
                width: 0,
                height: 4
              },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6
            }}>
                <Ionicons name="close-circle" size={18} color="white" style={{
                marginRight: 8
              }} />
                <Text style={{
                fontSize: 14,
                fontWeight: '800',
                color: 'white',
                letterSpacing: 0.2
              }}>{t("su_submit_rejection_471")}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>;
};