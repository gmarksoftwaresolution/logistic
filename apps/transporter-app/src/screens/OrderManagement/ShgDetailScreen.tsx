import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, ProductStatus } from '../../context/OrderManagementContext';
import RejectReasonBottomSheet from './RejectReasonBottomSheet';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Camera, CheckCircle, XCircle, Package } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const ShgDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { shgId, shgName } = route.params;
  const { shgProducts, rejectProduct, completeProduct, showToast } = useOrderManagement();
  const [activeTab, setActiveTab] = useState<'pickup' | 'drop'>('pickup');
  const [rejectingProductId, setRejectingProductId] = useState<string | null>(null);
  const [confirmCaptureProductId, setConfirmCaptureProductId] = useState<string | null>(null);

  // Retrieve products list for specific SHG ID
  const allShgProducts = shgProducts[shgId] || shgProducts['default'] || [];
  const displayedProducts = allShgProducts.filter((p) => p.type === activeTab);

  const handleDirectCapture = async (productId: string) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('Permission Required', 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedUri = result.assets[0].uri;
        completeProduct(productId, 'shg', capturedUri, shgId);
      }
    } catch (error) {
      console.warn('Camera Error:', error);
    }
  };

  const handleRejectConfirm = (reason: string) => {
    if (rejectingProductId) {
      rejectProduct(rejectingProductId, 'shg', reason, shgId);
      setRejectingProductId(null);
    }
  };

  const getStatusBorderColor = (status: ProductStatus) => {
    switch (status) {
      case 'completed':
        return '#10B981'; // green
      case 'rejected':
        return '#EF4444'; // red
      default:
        return '#F59E0B'; // amber for pending
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="SHG Orders"
        subtitle={shgName}
        showBackButton={true}
      />

      {/* Top Navbar Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pickup' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pickup')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'pickup' && styles.tabTextActive]}>
            Pick Up
          </Text>
          {activeTab === 'pickup' && <View style={styles.activeTabLine} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'drop' && styles.tabButtonActive]}
          onPress={() => setActiveTab('drop')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'drop' && styles.tabTextActive]}>
            Drop
          </Text>
          {activeTab === 'drop' && <View style={styles.activeTabLine} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {displayedProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
            <Text style={styles.emptyText}>No assigned products in this subcategory.</Text>
          </View>
        ) : (
          displayedProducts.map((product) => {
            const isCompleted = product.status === 'completed';
            const isRejected = product.status === 'rejected';

            return (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  { borderLeftColor: getStatusBorderColor(product.status) },
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <Text style={styles.orderIdText}>{product.orderId}</Text>

                  {isRejected && (
                    <View style={[styles.badge, styles.badgeRejected]}>
                      <Text style={[styles.badgeText, { color: '#DC2626' }]}>Rejected</Text>
                    </View>
                  )}

                </View>

                {/* Name */}
                <Text style={styles.productName}>{product.name}</Text>

                {/* Details Pills */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailLabel}>Qty:</Text>
                    <Text style={styles.detailValue}>{product.qty}</Text>
                  </View>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailLabel}>Weight:</Text>
                    <Text style={styles.detailValue}>{product.weight}</Text>
                  </View>
                </View>

                {/* Reject Reason Display */}
                {isRejected && product.rejectReason && (
                  <View style={styles.rejectReasonBox}>
                    <Text style={styles.rejectReasonLabel}>Reason: </Text>
                    <Text style={styles.rejectReasonValue}>{product.rejectReason}</Text>
                  </View>
                )}



                {/* Buttons Row */}
                <View style={styles.actionButtonsRow}>
                  {isCompleted ? (
                    <View style={styles.completedCapturedRow}>
                      {product.proofImage && (
                        <Image source={{ uri: product.proofImage }} style={styles.capturedButtonReplacementImage} />
                      )}
                      <TouchableOpacity
                        style={styles.retakeIconButton}
                        activeOpacity={0.8}
                        onPress={() => handleDirectCapture(product.id)}
                      >
                        <Text style={styles.btnTextRetake}>Retake</Text>
                      </TouchableOpacity>
                      <View style={styles.completedBadgePill}>
                        <CheckCircle size={scale(12)} color="#10B981" strokeWidth={2.5} />
                        <Text style={styles.completedBadgeText}>
                          {activeTab === 'pickup' ? 'Picked Up' : 'Dropped'}
                        </Text>
                      </View>
                      {activeTab === 'pickup' && (
                        <TouchableOpacity
                          style={styles.rejectButtonCompleted}
                          activeOpacity={0.8}
                          onPress={() => setRejectingProductId(product.id)}
                        >
                          <Text style={styles.rejectButtonCompletedText}>Reject</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : isRejected ? (
                    <View style={[styles.buttonDisabledState, { backgroundColor: '#FEE2E2' }]}>
                      <XCircle size={scale(16)} color="#EF4444" strokeWidth={2.5} />
                      <Text style={[styles.buttonDisabledText, { color: '#EF4444' }]}>
                        Rejected Action
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        activeOpacity={0.8}
                        onPress={() => setConfirmCaptureProductId(product.id)}
                      >
                        <Camera size={scale(16)} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.primaryActionText}>
                          {activeTab === 'pickup' ? 'Pick Up' : 'Drop'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectButton}
                        activeOpacity={0.8}
                        onPress={() => setRejectingProductId(product.id)}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Sheet Modal */}
      <RejectReasonBottomSheet
        visible={!!rejectingProductId}
        context="shg"
        onClose={() => setRejectingProductId(null)}
        onConfirm={handleRejectConfirm}
      />

      {/* Themed Confirmation Modal */}
      <Modal
        visible={confirmCaptureProductId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmCaptureProductId(null)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconCircle}>
              <Camera size={scale(24)} color={Colors.primary} />
            </View>
            
            <Text style={styles.confirmTitle}>Confirm Action</Text>
            <Text style={styles.confirmSubtitle}>
              {activeTab === 'pickup' ? 'Do you want to Pickup order?' : 'Do you want to Drop order?'}
            </Text>

            <View style={styles.confirmActionRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmCaptureProductId(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmYesBtn}
                onPress={() => {
                  const pid = confirmCaptureProductId;
                  setConfirmCaptureProductId(null);
                  if (pid) {
                    handleDirectCapture(pid);
                  }
                }}
              >
                <Text style={styles.confirmYesText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#F8FAFC',
  },
  tabText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#94A3B8',
  },
  tabTextActive: {
    color: Colors.primary,
  },
  activeTabLine: {
    position: 'absolute',
    bottom: 0,
    width: '60%',
    height: verticalScale(3),
    backgroundColor: Colors.primary,
    borderRadius: scale(1.5),
  },
  listContainer: {
    padding: scale(16),
    paddingBottom: verticalScale(120),
    gap: verticalScale(16),
  },
  emptyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    gap: verticalScale(12),
    width: '100%',
  },
  emptyText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: scale(5),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  orderIdText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
  },
  badgeCompleted: {
    backgroundColor: '#D1FAE5',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
  },
  productName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
    marginBottom: verticalScale(10),
  },
  detailsRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(14),
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  detailLabel: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginRight: scale(4),
  },
  detailValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textPrimary,
  },
  rejectReasonBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: scale(10),
    borderRadius: scale(8),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectReasonLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#DC2626',
  },
  rejectReasonValue: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#DC2626',
    flex: 1,
  },
  thumbnailContainer: {
    marginBottom: verticalScale(14),
    backgroundColor: '#F8FAFC',
    padding: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  thumbnailLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginBottom: verticalScale(6),
  },
  photoThumbnail: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(8),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: verticalScale(4),
  },
  primaryActionButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2ECC71', // Primary green requested
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    gap: scale(8),
  },
  primaryActionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  rejectButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C', // Destructive red requested
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
  },
  rejectButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  buttonDisabledState: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A9C0B2', // Muted green state requested
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    gap: scale(8),
  },
  buttonDisabledText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  confirmModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    alignItems: 'center',
    width: '90%',
    maxWidth: scale(320),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  confirmIconCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  confirmTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    marginBottom: verticalScale(6),
  },
  confirmSubtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  confirmActionRow: {
    flexDirection: 'row',
    gap: scale(12),
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
  },
  confirmYesBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmYesText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCapturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
  capturedButtonReplacementImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(8),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  completedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flex: 1,
    justifyContent: 'center',
  },
  completedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#065F46',
  },
  rejectButtonCompleted: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(6),
    borderRadius: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: scale(45),
  },
  rejectButtonCompletedText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(8.5),
    color: '#DC2626',
  },
  retakeIconButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    minWidth: scale(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextRetake: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#2563EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ShgDetailScreen;
