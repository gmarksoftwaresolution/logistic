import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Image } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { X, User, Truck, CheckCircle2, Star } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface Driver {
  id: string;
  name: string;
  vehicle: string;
  vehicleNumber: string;
  rating: number;
  status: 'Available' | 'Busy';
  image?: string;
}

const MOCK_DRIVERS: Driver[] = [];

interface DriverSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (driver: Driver) => void;
  orderId: string;
}

const DriverSelectionModal: React.FC<DriverSelectionModalProps> = ({ visible, onClose, onSelect, orderId }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Assign Driver</Text>
              <Text style={styles.subtitle}>Order: {orderId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={scale(24)} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={MOCK_DRIVERS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.driverCard, item.status === 'Busy' && styles.driverCardDisabled]}
                onPress={() => item.status === 'Available' && onSelect(item)}
                disabled={item.status === 'Busy'}
              >
                <View style={styles.driverInfo}>
                  <View style={styles.avatar}>
                    <User size={scale(24)} color={Colors.primary} />
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.driverName}>{item.name}</Text>
                    <View style={styles.vehicleRow}>
                      <Truck size={scale(14)} color={Colors.textSecondary} />
                      <Text style={styles.vehicleText}>{item.vehicle} • {item.vehicleNumber}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.rightInfo}>
                  <View style={styles.ratingRow}>
                    <Star size={scale(14)} color="#F79009" fill="#F79009" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'Available' ? '#ECFDF5' : '#FEF3F2' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'Available' ? '#065F46' : '#991B1B' }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
          
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    height: '70%',
    paddingBottom: verticalScale(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(24),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.primary,
    marginTop: verticalScale(2),
  },
  closeButton: {
    padding: scale(8),
    backgroundColor: '#F9FAFB',
    borderRadius: scale(12),
  },
  list: {
    padding: scale(24),
    gap: verticalScale(12),
  },
  driverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  driverCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    gap: verticalScale(2),
  },
  driverName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  vehicleText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  rightInfo: {
    alignItems: 'flex-end',
    gap: verticalScale(6),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  ratingText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: scale(24),
  },
  cancelButton: {
    height: verticalScale(56),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    fontSize: moderateScale(16),
  },
});

export default DriverSelectionModal;
