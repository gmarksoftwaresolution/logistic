import React from 'react';
import { Colors, Fonts } from '../constants/Colors';
import { X, Phone, Package, CheckCircle2, ArrowRight, Clock, Box } from 'lucide-react-native';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, FlatList, Alert, Pressable } from 'react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface TaskDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  task: any;
  onAccept: () => void;
  onReject: () => void;
}

const MOCK_PRODUCTS: any[] = [];

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ visible, onClose, task, onAccept, onReject }) => {
  if (!task) return null;

  const renderProductItem = ({ item }: { item: any }) => (
    <View style={styles.productRow}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productQty}>{item.qty}</Text>
      <Text style={styles.productWeight}>{item.weight}</Text>
    </View>
  );

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
          <View style={styles.topHeader}>
            <View>
              <Text style={styles.orderLabel}>ORDER ID</Text>
              <Text style={styles.orderValue}>#{task.orderId}</Text>
            </View>
            <View style={[styles.statusBadge, task.status === 'Accepted' && { backgroundColor: '#E0F2FE' }]}>
              <View style={[styles.statusDot, task.status === 'Accepted' && { backgroundColor: '#0EA5E9' }]} />
              <Text style={[styles.statusText, task.status === 'Accepted' && { color: '#0EA5E9' }]}>
                {task.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.routeCard}>
              <View style={styles.routeTimeline}>
                <View style={styles.pickupDot} />
                <View style={styles.dottedLine} />
                <View style={styles.dropDot} />
              </View>
              
              <View style={styles.routeDetails}>
                <View style={styles.point}>
                  <Text style={styles.pickupLabel}>PICKUP SHG</Text>
                  <Text style={styles.locationName}>Annapurna Women's Group</Text>
                  <Text style={styles.fullAddress}>Plot 45, Industrial Estate, Sector 12 Raipur, Chhattisgarh 492001</Text>
                  <TouchableOpacity style={styles.phoneLink}>
                    <Phone size={scale(14)} color={Colors.primary} />
                    <Text style={styles.phoneText}>+91 98765 43210</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.point}>
                  <Text style={styles.dropLabel}>DROP SHG/GMU</Text>
                  <Text style={styles.locationName}>Central Warehouse Unit B</Text>
                  <Text style={styles.fullAddress}>National Highway 43, Logistics Park Bhilai, Chhattisgarh 490021</Text>
                  <TouchableOpacity style={styles.phoneLink}>
                    <Phone size={scale(14)} color={Colors.primary} />
                    <Text style={styles.phoneText}>+91 98989 89898</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.productsCard}>
              <View style={styles.cardHeader}>
                <Package size={scale(20)} color={Colors.primary} />
                <Text style={styles.cardTitle}>Product Details</Text>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { flex: 2 }]}>Product Name</Text>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>Weight</Text>
              </View>

              <Text style={styles.subGroupLabel}>• PICKUP PRODUCTS</Text>
              {MOCK_PRODUCTS.filter(p => p.type === 'PICKUP').map(item => (
                <View key={item.id} style={styles.productRow}>
                  <Text style={[styles.productName, { flex: 2 }]}>{item.name}</Text>
                  <Text style={[styles.productQty, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
                  <Text style={[styles.productWeight, { flex: 1, textAlign: 'right' }]}>{item.weight}</Text>
                </View>
              ))}

              <Text style={[styles.subGroupLabel, { color: '#F97316', marginTop: 20 }]}>• DROP PRODUCTS</Text>
              {MOCK_PRODUCTS.filter(p => p.type === 'DROP').map(item => (
                <View key={item.id} style={styles.productRow}>
                  <Text style={[styles.productName, { flex: 2 }]}>{item.name}</Text>
                  <Text style={[styles.productQty, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
                  <Text style={[styles.productWeight, { flex: 1, textAlign: 'right' }]}>{item.weight}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {task.status === 'Accepted' ? (
              <TouchableOpacity style={styles.acceptBtn} onPress={() => Alert.alert("Start Pickup", "Starting pickup sequence...")}>
                <Text style={styles.acceptBtnText}>Start Pickup</Text>
                <ArrowRight size={scale(22)} color="#FFFFFF" style={{ marginLeft: 8 }} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
                  <CheckCircle2 size={scale(20)} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.acceptBtnText}>Accept Task</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
                  <X size={scale(20)} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
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
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    height: '92%',
    paddingBottom: Platform.OS === 'ios' ? verticalScale(30) : verticalScale(20),
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(24),
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderLabel: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#94A3B8',
  },
  orderValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
    gap: scale(8),
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#F97316',
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#9A3412',
  },
  scrollContent: {
    padding: scale(16),
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    padding: scale(20),
    flexDirection: 'row',
    marginBottom: verticalScale(20),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  routeTimeline: {
    alignItems: 'center',
    width: scale(24),
    marginRight: scale(16),
    paddingVertical: verticalScale(6),
  },
  pickupDot: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.primary + '30',
  },
  dropDot: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: '#F97316',
    borderWidth: 3,
    borderColor: '#FFEDD5',
  },
  dottedLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(4),
  },
  routeDetails: {
    flex: 1,
    gap: verticalScale(24),
  },
  point: {
    gap: verticalScale(4),
  },
  pickupLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  dropLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  locationName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
  },
  fullAddress: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    lineHeight: verticalScale(20),
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(6),
  },
  phoneText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.primary,
  },
  productsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    padding: scale(20),
    marginBottom: verticalScale(120),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    color: Colors.textPrimary,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: verticalScale(16),
    paddingBottom: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  subGroupLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.primary,
    marginBottom: verticalScale(12),
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  productRow: {
    flexDirection: 'row',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  productName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  productQty: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  productWeight: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  footer: {
    padding: scale(20),
    paddingBottom: Platform.OS === 'ios' ? verticalScale(34) : scale(20),
    backgroundColor: '#FFFFFF',
    gap: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    height: verticalScale(56),
    borderRadius: scale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
  rejectBtn: {
    backgroundColor: '#FFFFFF',
    height: verticalScale(56),
    borderRadius: scale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  rejectBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#64748B',
  },
});

export default TaskDetailsModal;
