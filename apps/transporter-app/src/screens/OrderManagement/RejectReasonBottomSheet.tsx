import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Colors, Fonts } from '../../constants/Colors';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

interface RejectReasonBottomSheetProps {
  visible: boolean;
  context: 'gmu' | 'shg';
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const GMU_REASONS = [
  'Product damaged',
  'Quantity mismatch',
  'Wrong product',
  'Not available at GMU',
  'Other',
];

const SHG_REASONS = [
  'Product damaged',
  'Quantity mismatch',
  'Wrong product',
  'SHG not available',
  'Customer refused',
  'Other',
];

const RejectReasonBottomSheet: React.FC<RejectReasonBottomSheetProps> = ({
  visible,
  context,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReasonText, setOtherReasonText] = useState<string>('');

  const reasons = context === 'gmu' ? GMU_REASONS : SHG_REASONS;

  const handleSubmit = () => {
    if (!selectedReason) return;
    const finalReason = selectedReason === 'Other' ? otherReasonText.trim() || 'Other' : selectedReason;
    onConfirm(finalReason);
    // Reset state
    setSelectedReason('');
    setOtherReasonText('');
  };

  const handleCancel = () => {
    setSelectedReason('');
    setOtherReasonText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel} />

        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          <Text style={styles.title}>Reject Reason</Text>
          <Text style={styles.subtitle}>Please specify the reason for rejecting this product</Text>

          <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
            {reasons.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.radioItem, isSelected && styles.radioItemSelected]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {selectedReason === 'Other' && (
              <View style={styles.otherInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type specific reason here..."
                  placeholderTextColor={Colors.textPlaceholder}
                  value={otherReasonText}
                  onChangeText={setOtherReasonText}
                  multiline
                  maxLength={150}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedReason || (selectedReason === 'Other' && !otherReasonText.trim())) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || (selectedReason === 'Other' && !otherReasonText.trim())}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>Confirm Rejection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(32),
    paddingTop: verticalScale(12),
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: Colors.error,
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  reasonsList: {
    marginBottom: verticalScale(20),
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    marginBottom: verticalScale(10),
  },
  radioItemSelected: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  radioOuter: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  radioOuterSelected: {
    borderColor: Colors.error,
  },
  radioInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: Colors.error,
  },
  reasonText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  reasonTextSelected: {
    color: Colors.error,
  },
  otherInputContainer: {
    marginTop: verticalScale(4),
    marginBottom: verticalScale(10),
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    padding: scale(12),
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
    backgroundColor: '#FFFFFF',
    minHeight: verticalScale(70),
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },
  confirmButton: {
    flex: 1.5,
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  confirmButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
});

export default RejectReasonBottomSheet;
