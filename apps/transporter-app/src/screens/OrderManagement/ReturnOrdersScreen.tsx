import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
  Linking,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, BatchOrder, HUB_CONTACT } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, MapPin, Eye, RotateCcw, CheckCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { isHubPoint } from '../../constants/hub';

type DisplayEntry = { batch: BatchOrder; type: 'pickup' | 'drop' };

const ReturnOrdersScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { batches, refreshBatchesList, finalizePickup } = useOrderManagement();
  const [activeTab, setActiveTab] = useState<'pickup' | 'drop'>(route.params?.activeTab || 'pickup');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPickupBatch, setSelectedPickupBatch] = useState<BatchOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBatchesList().catch(err => console.log('Error refreshing return batches on focus:', err));
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBatchesList();
    } catch (e) {
      console.error('Failed to refresh return batches:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenPickupConfirm = (batch: BatchOrder) => {
    setSelectedPickupBatch(batch);
  };

  const handleConfirmPickup = async () => {
    if (!selectedPickupBatch || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await finalizePickup(selectedPickupBatch.id);
      setSelectedPickupBatch(null);
    } catch (err) {
      console.error('Failed to complete return pickup:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pagerRef = React.useRef<ScrollView>(null);
  const { width: screenWidth } = Dimensions.get('window');

  // Automatically scroll tabs if navigated with activeTab param
  React.useEffect(() => {
    if (route.params?.activeTab) {
      const tab = route.params.activeTab;
      setActiveTab(tab);
      if (tab === 'drop') {
        setTimeout(() => {
          pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
        }, 100);
      } else {
        setTimeout(() => {
          pagerRef.current?.scrollTo({ x: 0, animated: true });
        }, 100);
      }
    }
  }, [route.params?.activeTab, screenWidth]);

  // Helper to check if a batch is a Return order
  const isReturnBatch = (b: BatchOrder): boolean => {
    return Boolean(
      b.isRTO ||
      b.isReturn ||
      b.returnType === 'BUYER_RETURN' ||
      b.returnType === 'TRANSPORTER_RETURN' ||
      b.returnType === 'RTO' ||
      (b as any).returnType === 'BUYER_RETURN' ||
      (b as any).returnType === 'TRANSPORTER_RETURN' ||
      (b as any).returnType === 'RTO' ||
      (b as any).isReturn ||
      b.products?.some(p => (p as any).isRTO || (p as any).isReturn)
    );
  };

  const { sortedPickupEntries, sortedDropEntries } = useMemo(() => {
    const allReturnBatches = batches.filter(isReturnBatch);

    // 1. Pickup Return Orders (Status: ACCEPTED_PICKUP)
    const pickupBatches = allReturnBatches.filter(
      (b) => b.status === 'ACCEPTED_PICKUP'
    );
    const pickupEntries: DisplayEntry[] = pickupBatches.map((b) => ({ batch: b, type: 'pickup' }));

    // 2. Drop Return Orders (Status: PICKUP_COMPLETED)
    const dropBatches = allReturnBatches.filter((b) => b.status === 'PICKUP_COMPLETED');
    const dropEntries: DisplayEntry[] = dropBatches.map((b) => ({ batch: b, type: 'drop' }));

    return {
      sortedPickupEntries: pickupEntries,
      sortedDropEntries: dropEntries,
    };
  }, [batches]);

  const handleNavigateMap = (batch: BatchOrder, type: 'pickup' | 'drop') => {
    const isPickup = type === 'pickup';
    const isHub = isPickup
      ? isHubPoint(batch.pickupPointName)
      : isHubPoint(batch.dropPointName);

    const contact = isHub ? HUB_CONTACT : batch.shgContact;
    const queryAddress = [
      contact?.address,
      (contact as any)?.village,
      (contact as any)?.pincode,
      'Maharashtra',
      'India',
    ]
      .filter(Boolean)
      .join(', ');

    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryAddress)}`
    );
  };

  const renderOrderList = (entries: DisplayEntry[], tabType: 'pickup' | 'drop') => {
    return (
      <View style={{ width: screenWidth }}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Package size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
              <Text style={styles.emptyCardText}>
                {tabType === 'pickup'
                  ? 'No return pickup orders found.'
                  : 'No return drop orders found.'}
              </Text>
            </View>
          ) : (
            <View style={styles.notificationsWrapper}>
              {entries.map((entry: DisplayEntry) => {
                const { batch, type } = entry;
                const isPickup = type === 'pickup';

                return (
                  <View key={`${batch.id}-${type}`} style={styles.orderCard}>
                    {/* Header */}
                    <View style={styles.orderCardHeader}>
                      <View style={styles.orderIdBadge}>
                        <Text style={styles.orderIdText}>{batch.displayId || batch.id}</Text>
                      </View>
                      <View style={styles.returnBadge}>
                        <RotateCcw size={scale(12)} color="#B45309" style={{ marginRight: scale(4) }} />
                        <Text style={styles.returnBadgeText}>Return</Text>
                      </View>
                    </View>

                    {/* Route Info */}
                    <Text style={styles.routeText}>
                      From - {batch.pickupPointName} To {batch.dropPointName}
                    </Text>

                    <Text style={styles.metaSubText}>
                      {batch.products.length || 1} items • {batch.totalWeight}
                    </Text>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.detailBtn}
                        onPress={() => navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id })}
                        activeOpacity={0.8}
                      >
                        <Eye size={scale(14)} color={Colors.primary} style={{ marginRight: scale(4) }} />
                        <Text style={styles.detailBtnText}>View Details</Text>
                      </TouchableOpacity>

                      {isPickup ? (
                        <TouchableOpacity
                          style={styles.pickupBtn}
                          onPress={() => handleOpenPickupConfirm(batch)}
                          activeOpacity={0.8}
                          disabled={isSubmitting && selectedPickupBatch?.id === batch.id}
                        >
                          <CheckCircle size={scale(14)} color="#FFFFFF" style={{ marginRight: scale(4) }} />
                          <Text style={styles.pickupBtnText}>Pickup</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.mapBtn}
                          onPress={() => handleNavigateMap(batch, type)}
                          activeOpacity={0.8}
                        >
                          <MapPin size={scale(14)} color="#FFFFFF" style={{ marginRight: scale(4) }} />
                          <Text style={styles.mapBtnText}>Navigate</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Return Orders"
        subtitle="Manage assigned return pickup and drop orders"
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      {/* 🏷️ Top Segment Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pickup' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('pickup');
            pagerRef.current?.scrollTo({ x: 0, animated: true });
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'pickup' && styles.tabTextActive]}>
            Pickup (Return) ({sortedPickupEntries.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'drop' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('drop');
            pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'drop' && styles.tabTextActive]}>
            Drop (Return) ({sortedDropEntries.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable View Pager Container */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setActiveTab(page === 1 ? 'drop' : 'pickup');
        }}
        style={{ flex: 1 }}
      >
        {renderOrderList(sortedPickupEntries, 'pickup')}
        {renderOrderList(sortedDropEntries, 'drop')}
      </ScrollView>

      {/* 📦 Confirmation Dialog for Pickup */}
      <Modal
        visible={!!selectedPickupBatch}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting) setSelectedPickupBatch(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <CheckCircle size={scale(28)} color={Colors.primary} strokeWidth={2.5} />
            </View>

            <Text style={styles.modalTitle}>Confirm Pickup</Text>

            {selectedPickupBatch && (
              <View style={styles.modalOrderIdChip}>
                <Text style={styles.modalOrderIdText}>
                  {selectedPickupBatch.displayId || selectedPickupBatch.id}
                </Text>
              </View>
            )}

            <Text style={styles.modalMessage}>
              Are you sure you want to pickup?
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  if (!isSubmitting) setSelectedPickupBatch(null);
                }}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleConfirmPickup}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Submit</Text>
                )}
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
    backgroundColor: '#E2E8F0',
    borderRadius: scale(12),
    padding: scale(4),
    marginHorizontal: scale(16),
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(10),
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(13),
    color: '#64748B',
  },
  tabTextActive: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  container: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(100),
  },
  notificationsWrapper: {
    gap: verticalScale(12),
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: verticalScale(20),
  },
  emptyCardText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: '#64748B',
    marginTop: verticalScale(12),
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  orderIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
  },
  orderIdText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
  },
  returnBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#B45309',
  },
  routeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  metaSubText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginBottom: verticalScale(12),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: verticalScale(9),
    borderRadius: scale(10),
  },
  detailBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.primary,
  },
  pickupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(9),
    borderRadius: scale(10),
  },
  pickupBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(9),
    borderRadius: scale(10),
  },
  mapBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(24),
    width: '100%',
    maxWidth: scale(360),
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalIconBox: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalOrderIdChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
    marginTop: verticalScale(6),
  },
  modalOrderIdText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.primary,
  },
  modalMessage: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(20),
    lineHeight: moderateScale(20),
  },
  modalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  modalCancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: Colors.primary,
  },
  modalConfirmBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
});

export default ReturnOrdersScreen;
