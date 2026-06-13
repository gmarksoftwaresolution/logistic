import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, BatchOrder } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, MapPin, ChevronDown, ChevronRight, Eye, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const OrderBatchRejectedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { batches } = useOrderManagement();

  // Track accordion expansion states per area.
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({
    nesari: true,
    wagrale: true,
    'Gadhinglaj Hub': true,
    Mahagaon: true,
  });

  const toggleAreaExpand = (areaName: string) => {
    setExpandedAreas((prev) => ({
      ...prev,
      [areaName]: prev[areaName] === undefined ? false : !prev[areaName],
    }));
  };

  // Filter rejected batches
  const rejectedBatches = batches.filter((b) => b.status === 'rejected');

  // Prepare display entries (Rejected batches are viewed as a whole)
  const displayEntries: { batch: BatchOrder; type: 'pickup' | 'drop' }[] = [];
  rejectedBatches.forEach((b) => {
    const type = b.flowType === 'gmu_to_shg' ? 'drop' : 'pickup';
    displayEntries.push({ batch: b, type });
  });

  // Group by Area
  const groupedEntries: Record<string, typeof displayEntries> = {};
  displayEntries.forEach((entry) => {
    const area = entry.batch.areaName;
    if (!groupedEntries[area]) {
      groupedEntries[area] = [];
    }
    groupedEntries[area].push(entry);
  });

  const areas = Object.keys(groupedEntries);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('orders.rejected_orders')}
        subtitle={t('orders.rejected_orders_subtitle')}
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      <View style={{ height: verticalScale(14) }} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {areas.length === 0 ? (
          <View style={styles.emptyCard}>
            <XCircle size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
            <Text style={styles.emptyCardText}>{t('orders.no_rejected_batches')}</Text>
          </View>
        ) : (
          areas.map((areaName) => {
            const areaEntries = groupedEntries[areaName];
            const isExpanded = expandedAreas[areaName] !== false;

            return (
              <View key={areaName} style={styles.areaAccordionBlock}>
                <View style={styles.areaAccentBar} />
                
                <TouchableOpacity
                  style={styles.areaHeaderRow}
                  activeOpacity={0.8}
                  onPress={() => toggleAreaExpand(areaName)}
                >
                  <View style={styles.headerLeftCol}>
                    <MapPin size={scale(18)} color={Colors.primary} strokeWidth={2.5} />
                    <Text style={styles.areaTitleText} numberOfLines={1}>
                      {areaName}
                    </Text>
                  </View>

                  <View style={styles.headerRightCol}>
                    <View style={styles.assignedBadgePill}>
                      <Text style={styles.assignedBadgeText}>{t('orders.items_count', { count: areaEntries.length })}</Text>
                    </View>
                    <View style={styles.chevronBox}>
                      {isExpanded ? (
                        <ChevronDown size={scale(18)} color={Colors.textSecondary} />
                      ) : (
                        <ChevronRight size={scale(18)} color={Colors.textSecondary} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.accordionBody}>
                    <View style={styles.notificationsWrapper}>
                      {areaEntries.map((entry, index) => {
                        const { batch, type } = entry;
                        const isPickup = type === 'pickup';

                        return (
                          <TouchableOpacity
                            key={`${batch.id}-${type}-${index}`}
                            style={styles.premiumBatchCard}
                            activeOpacity={0.85}
                            onPress={() =>
                              navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id, type: type })
                            }
                          >
                            <View style={styles.cardHeaderRow}>
                              <View style={styles.idGroup}>
                                <Text style={styles.batchIdText}>{batch.id}</Text>
                                <View style={styles.errorPill}>
                                  <Text style={styles.errorPillText}>{t('orders.rejected')}</Text>
                                </View>
                              </View>
                              <XCircle size={scale(18)} color="#EF4444" strokeWidth={3} />
                            </View>

                            <Text style={styles.shgNameText}>{batch.shgName}</Text>
                            
                            <View style={styles.routeRow}>
                              <Text style={styles.routeText} numberOfLines={1}>
                                {isPickup ? `${batch.pickupPointName} > Gadhinglaj Hub` : `Gadhinglaj Hub > ${batch.dropPointName}`}
                              </Text>
                            </View>

                            <View style={styles.reasonStrip}>
                              <XCircle size={scale(14)} color="#DC2626" style={{ marginTop: scale(2) }} />
                              <Text style={styles.reasonText}>
                                {batch.rejectReason || t('orders.standard_non_compliance')}
                              </Text>
                            </View>

                            <View style={styles.metricsStrip}>
                              <View style={styles.metricItem}>
                                <Text style={styles.metricValueText}>{isPickup ? batch.pickupCount : batch.dropCount}</Text>
                                <Text style={styles.metricLabelText}>{t('orders.items_label')}</Text>
                              </View>
                              <View style={styles.metricLine} />
                              <View style={styles.metricItem}>
                                <Text style={styles.metricValueText}>{batch.totalWeight}</Text>
                                <Text style={styles.metricLabelText}>{t('orders.weight_label')}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(120),
    gap: verticalScale(16),
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginTop: verticalScale(20),
    gap: verticalScale(12),
  },
  emptyCardText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  areaAccordionBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  areaAccentBar: {
    width: scale(4),
    height: '100%',
    backgroundColor: '#DC2626', // Red accent for rejected
    position: 'absolute',
    left: 0,
    top: 0,
  },
  areaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: scale(20),
    paddingRight: scale(16),
    paddingVertical: verticalScale(16),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginRight: scale(8),
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  areaTitleText: {
    flex: 1,
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  assignedBadgePill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  assignedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#DC2626',
  },
  chevronBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
    backgroundColor: '#FFFFFF',
  },
  notificationsWrapper: {
    gap: verticalScale(12),
  },
  premiumBatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: verticalScale(2),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  batchIdText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  errorPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  errorPillText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  shgNameText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  routeRow: {
    marginBottom: verticalScale(12),
  },
  routeText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: Colors.textPrimary,
  },
  reasonStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: scale(8),
    borderRadius: scale(8),
    gap: scale(6),
    marginBottom: verticalScale(12),
  },
  reasonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#DC2626',
    flex: 1,
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(10),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValueText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  metricLabelText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: Colors.textPlaceholder,
  },
  metricLine: {
    width: 1,
    height: verticalScale(16),
    backgroundColor: '#E2E8F0',
    marginHorizontal: scale(4),
  },
});

export default OrderBatchRejectedScreen;
