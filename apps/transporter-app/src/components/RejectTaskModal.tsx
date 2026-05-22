import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, Platform, Pressable } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { X, ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface RejectTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, remarks: string) => void;
  orderId: string;
}

const REASONS = [
  'Vehicle Breakdown',
  'Health Issues',
  'Route Blocked',
  'Incorrect Load Info',
  'Other'
];

const RejectTaskModal: React.FC<RejectTaskModalProps> = ({ visible, onClose, onSubmit, orderId }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedReason('');
      setRemarks('');
      setShowDropdown(false);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!selectedReason) {
      alert('Please select a reason');
      return;
    }
    onSubmit(selectedReason, remarks);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backgroundPressable} onPress={onClose} />
        <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Reject Order</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={scale(24)} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.label}>Select Reason</Text>
              <TouchableOpacity 
                style={styles.dropdown} 
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={[styles.dropdownText, !selectedReason && { color: '#94A3B8' }]}>
                  {selectedReason || 'Select a reason...'}
                </Text>
                {showDropdown ? (
                  <ChevronUp size={scale(18)} color="#64748B" />
                ) : (
                  <ChevronDown size={scale(18)} color="#64748B" />
                )}
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdownList}>
                  {REASONS.map(reason => (
                    <TouchableOpacity 
                      key={reason} 
                      style={[
                        styles.reasonOption,
                        selectedReason === reason && styles.selectedOption
                      ]}
                      onPress={() => {
                        setSelectedReason(reason);
                        setShowDropdown(false);
                      }}
                    >
                      <Clock size={scale(18)} color="#64748B" style={styles.optionIcon} />
                      <Text style={styles.reasonText}>{reason}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { marginTop: verticalScale(20) }]}>Remarks</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter reason"
                multiline
                numberOfLines={4}
                value={remarks}
                onChangeText={setRemarks}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backgroundPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? verticalScale(30) : verticalScale(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  content: {
    padding: scale(20),
    zIndex: 100,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#64748B',
    marginBottom: verticalScale(8),
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    height: verticalScale(48),
  },
  dropdownText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  dropdownList: {
    position: 'absolute',
    top: verticalScale(100), // Adjusted for even better clearance
    left: scale(20),
    right: scale(20),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 1000,
    padding: scale(8),
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(10),
    gap: scale(12),
  },
  selectedOption: {
    backgroundColor: '#F1F5F9',
  },
  optionIcon: {
    opacity: 0.6,
  },
  reasonText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    padding: scale(16),
    height: verticalScale(120),
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  footer: {
    padding: scale(20),
    gap: verticalScale(12),
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: verticalScale(52),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
  cancelBtn: {
    height: verticalScale(52),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#64748B',
  },
});

export default RejectTaskModal;
