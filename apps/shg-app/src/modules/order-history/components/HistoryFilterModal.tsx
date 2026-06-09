import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filterType: string, dateRange: { fromDate?: string; toDate?: string }) => void;
  initialFilterType: string;
}

export const HistoryFilterModal: React.FC<FilterModalProps> = ({ 
  visible, 
  onClose, 
  onApply,
  initialFilterType
}) => {
  const [selectedType, setSelectedType] = useState(initialFilterType);
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedType(initialFilterType);
    }
  }, [visible, initialFilterType]);

  const filterOptions = [
    { id: 'All', label: 'All' },
    { id: 'Today', label: 'Today' },
    { id: '1 Week', label: '1 Week' },
    { id: '15 Days', label: '15 Days' },
    { id: '1 Month', label: '1 Month' },
    { id: 'Custom Date Range', label: 'Custom Date Range' }
  ];

  const handleApply = () => {
    let range = { fromDate: undefined as string | undefined, toDate: undefined as string | undefined };
    const today = new Date();
    
    if (selectedType === 'Today') {
      range.fromDate = today.toISOString();
      range.toDate = today.toISOString();
    } else if (selectedType === '1 Week') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      range.fromDate = past.toISOString();
      range.toDate = today.toISOString();
    } else if (selectedType === '15 Days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 15);
      range.fromDate = past.toISOString();
      range.toDate = today.toISOString();
    } else if (selectedType === '1 Month') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      range.fromDate = past.toISOString();
      range.toDate = today.toISOString();
    } else if (selectedType === 'Custom Date Range') {
      range.fromDate = fromDate.toISOString();
      range.toDate = toDate.toISOString();
    }
    
    onApply(selectedType, range);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Filter Orders</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                {filterOptions.map((opt) => {
                  const isSelected = selectedType === opt.id;
                  return (
                    <TouchableOpacity 
                      key={opt.id}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => setSelectedType(opt.id)}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedType === 'Custom Date Range' && (
                <View style={styles.customDateContainer}>
                  <View style={styles.datePickerRow}>
                    <Text style={styles.dateLabel}>From:</Text>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                      <Text style={styles.dateBtnText}>{fromDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.datePickerRow}>
                    <Text style={styles.dateLabel}>To:</Text>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                      <Text style={styles.dateBtnText}>{toDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {showFromPicker && (
                <DateTimePicker
                  value={fromDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowFromPicker(Platform.OS === 'ios');
                    if (date) setFromDate(date);
                  }}
                />
              )}
              {showToPicker && (
                <DateTimePicker
                  value={toDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowToPicker(Platform.OS === 'ios');
                    if (date) setToDate(date);
                  }}
                />
              )}

              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  optionRowSelected: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#073318',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#073318',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  optionTextSelected: {
    color: '#073318',
    fontWeight: '700',
  },
  customDateContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  dateBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#073318',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#073318',
    alignItems: 'center',
    marginLeft: 8,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
