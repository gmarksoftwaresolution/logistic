import React, { useMemo } from 'react';
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
import { useOrderManagement } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, ArrowRight, CheckCircle, History, MapPin, Truck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const OrderBatchCompletedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { batches } = useOrderManagement();

  // Consolidate both legs by masterOrderId into a single journey representation
  const journeys = useMemo(() => {
    const journeyMap: Record<string, any> = {};

    batches.forEach((b) => {
      // We only care about orders that have completed at least one leg
      if (b.status !== 'PICKUP_COMPLETED' && b.status !== 'DROP_COMPLETED') {
        return;
      }

      const mId = b.masterOrderId ? String(b.masterOrderId) : b.id;
      if (!journeyMap[mId]) {
        journeyMap[mId] = {
          masterOrderId: b.masterOrderId,
          id: b.id,
          shgName: b.shgName || 'Nesari Bachat Gat',
          productName: b.products?.[0]?.name || 'General Shipment',
          totalQty: b.totalQty || 1,
          totalWeight: b.totalWeight || '1.5 kg',
          timestamp: b.timestamp || '5:02 PM',
          pickupPoint: b.pickupPointName || 'Local SHG',
          dropPoint: b.dropPointName || 'Customer Address',
          pickupCompleted: false,
          dropCompleted: false,
          pickupBatchId: undefined,
          dropBatchId: undefined,
        };
      }

      const journey = journeyMap[mId];

      if (b.id.startsWith('pickup-')) {
        journey.pickupBatchId = b.id;
        journey.pickupPoint = b.pickupPointName;
        if (b.status === 'PICKUP_COMPLETED' || b.status === 'DROP_COMPLETED') {
          journey.pickupCompleted = true;
        }
        if (b.status === 'DROP_COMPLETED') {
          journey.dropCompleted = true;
        }
      } else if (b.id.startsWith('drop-')) {
        journey.dropBatchId = b.id;
        journey.dropPoint = b.dropPointName;
        if (b.status === 'DROP_COMPLETED') {
          journey.dropCompleted = true;
        }
      }
    });

    return Object.values(journeyMap).sort((a, b) => {
      if (b.masterOrderId && a.masterOrderId) {
        return b.masterOrderId - a.masterOrderId;
      }
      return b.id.localeCompare(a.id);
    });
  }, [batches]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('orders.completed_orders')}
        subtitle={t('orders.completed_orders_subtitle')}
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      <View style={{ height: verticalScale(14) }} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Prominent link to full consolidated history table */}
        <TouchableOpacity
          style={styles.historyLinkCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Order History')}
        >
          <View style={styles.historyCardLeft}>
            <View style={styles.historyIconCircle}>
              <History size={scale(20)} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.historyCardTitle}>{t('orders.view_order_history_master')}</Text>
              <Text style={styles.historyCardSub}>{t('orders.explore_complete_historical_ledger')}</Text>
            </View>
          </View>
          <ArrowRight size={scale(18)} color={Colors.primary} />
        </TouchableOpacity>

        {/* Combined Completed Journeys Section */}
        <Text style={styles.sectionHeadingText}>
          {t('orders.completed_transfers_count', { defaultValue: 'Completed Shipments Ledger ({{count}})', count: journeys.length })}
        </Text>

        {journeys.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
            <Text style={styles.emptyCardText}>{t('orders.no_completed_transfers', { defaultValue: 'No completed shipments found.' })}</Text>
          </View>
        ) : (
          journeys.map((journey) => (
            <View key={journey.masterOrderId || journey.id} style={styles.premiumBatchCard}>
              {/* Header: ID & Status Badge */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.idGroup}>
                  <Text style={styles.journeyIdText}>
                    {journey.masterOrderId ? `Order #${journey.masterOrderId}` : `Seed Order`}
                  </Text>
                  <View style={[styles.successPill, journey.dropCompleted ? styles.pillDelivered : styles.pillTransit]}>
                    <Text style={[styles.successPillText, journey.dropCompleted ? styles.textDelivered : styles.textTransit]}>
                      {journey.dropCompleted ? 'FULLY DELIVERED' : 'IN TRANSIT'}
                    </Text>
                  </View>
                </View>
                {journey.dropCompleted ? (
                  <CheckCircle size={scale(20)} color="#10B981" strokeWidth={2.5} />
                ) : (
                  <Truck size={scale(20)} color="#2563EB" strokeWidth={2.5} />
                )}
              </View>

              {/* Product Info */}
              <Text style={styles.shgNameText}>{journey.productName}</Text>
              <Text style={styles.shgContactLabel}>Seller: {journey.shgName}</Text>

              {/* Simplified E-to-E Route Timeline (Only Pickup & Drop) */}
              <View style={styles.timelineContainer}>
                {/* Step 1: Pickup Location */}
                <View style={styles.timelineRow}>
                  <View style={styles.timelineLeftCol}>
                    <View style={[styles.dotCircle, styles.dotCompleted]}>
                      <MapPin size={scale(11)} color="#FFFFFF" />
                    </View>
                    <View style={[styles.verticalLine, journey.dropCompleted ? styles.lineActive : styles.lineInactive]} />
                  </View>
                  <View style={styles.timelineRightCol}>
                    <Text style={styles.timelineLocationTitle}>{journey.pickupPoint}</Text>
                    <Text style={styles.timelineLocationSub}>Seller Pickup Point • Completed</Text>
                  </View>
                </View>

                {/* Step 2: Drop Point Delivery */}
                <View style={styles.timelineRow}>
                  <View style={styles.timelineLeftCol}>
                    <View style={[styles.dotCircle, journey.dropCompleted ? styles.dotCompleted : styles.dotPending]}>
                      <CheckCircle size={scale(11)} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.timelineRightCol}>
                    <Text style={styles.timelineLocationTitle}>{journey.dropPoint}</Text>
                    <Text style={styles.timelineLocationSub}>
                      {journey.dropCompleted ? 'Buyer Drop Point • Delivered' : 'Buyer Drop Point • In Transit'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons to View Details */}
              <View style={styles.cardActionsRow}>
                {(journey.pickupBatchId || journey.dropBatchId) && (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtnOutline}
                      onPress={() => navigation.navigate('OrderBatchPickupDetail', { batchId: journey.pickupBatchId || journey.dropBatchId, type: 'pickup' })}
                    >
                      <Text style={styles.actionBtnOutlineText}>Pickup Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnOutline}
                      onPress={() => navigation.navigate('OrderBatchPickupDetail', { batchId: journey.dropBatchId || journey.pickupBatchId, type: 'drop' })}
                    >
                      <Text style={styles.actionBtnOutlineText}>Drop Details</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Bottom Metrics strip */}
              <View style={styles.metricsStrip}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValueText}>{journey.totalQty}</Text>
                  <Text style={styles.metricLabelText}>Items</Text>
                </View>
                <View style={styles.metricLine} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricValueText}>{journey.totalWeight}</Text>
                  <Text style={styles.metricLabelText}>Weight</Text>
                </View>
                <View style={styles.metricLine} />
                <View style={styles.metricItem}>
                  <Text style={styles.timestampText}>{journey.timestamp}</Text>
                </View>
              </View>
            </View>
          ))
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
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(120),
    gap: verticalScale(16),
  },
  historyLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(12),
      },
      android: {
        elevation: 3,
      },
    }),
    marginBottom: verticalScale(8),
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  historyIconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  historyCardTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: '#166534',
  },
  historyCardSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#15803D',
    marginTop: verticalScale(2),
  },
  sectionHeadingText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
    marginTop: verticalScale(4),
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
    marginTop: verticalScale(12),
    gap: verticalScale(12),
  },
  emptyCardText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  premiumBatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
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
  journeyIdText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  successPill: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  successPillText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    textTransform: 'uppercase',
  },
  pillDelivered: {
    backgroundColor: '#ECFDF5',
  },
  pillTransit: {
    backgroundColor: '#EFF6FF',
  },
  textDelivered: {
    color: '#059669',
  },
  textTransit: {
    color: '#2563EB',
  },
  shgNameText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
    marginBottom: verticalScale(2),
  },
  shgContactLabel: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginBottom: verticalScale(12),
  },
  timelineContainer: {
    marginVertical: verticalScale(12),
    paddingLeft: scale(4),
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: scale(28),
  },
  dotCircle: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotCompleted: {
    backgroundColor: '#10B981',
  },
  dotPending: {
    backgroundColor: '#94A3B8',
  },
  verticalLine: {
    width: scale(2),
    height: verticalScale(28),
    marginVertical: verticalScale(-2),
    zIndex: 1,
  },
  lineActive: {
    backgroundColor: '#10B981',
  },
  lineInactive: {
    backgroundColor: '#E2E8F0',
  },
  timelineRightCol: {
    flex: 1,
    paddingLeft: scale(10),
    paddingBottom: verticalScale(14),
  },
  timelineLocationTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13.5),
    color: Colors.textPrimary,
  },
  timelineLocationSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textPlaceholder,
    marginTop: verticalScale(2),
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginVertical: verticalScale(12),
  },
  actionBtnOutline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  actionBtnOutlineText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
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
  timestampText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(9),
    color: Colors.textPlaceholder,
  },
});

export default OrderBatchCompletedScreen;

