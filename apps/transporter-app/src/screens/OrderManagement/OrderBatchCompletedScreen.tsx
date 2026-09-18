import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, ArrowRight, CheckCircle, History, MapPin, Truck, RotateCcw } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { HUB_CONFIG } from '../../constants/hub';
import { useTranslation } from 'react-i18next';
import { TrackingHistoryModal } from '../../components/TrackingHistoryModal';

const OrderBatchCompletedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { batches, refreshBatchesList } = useOrderManagement();
  const [activeTab, setActiveTab] = useState<'new' | 'return'>('new');
  const [selectedTrackingOrder, setSelectedTrackingOrder] = React.useState<any>(null);

  const { width: screenWidth } = Dimensions.get('window');
  const pagerRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (refreshBatchesList) {
        refreshBatchesList().catch(() => {});
      }
    });
    return unsubscribe;
  }, [navigation, refreshBatchesList]);

  // Consolidate completed batches into journeys
  const { normalJourneys, returnJourneys } = useMemo(() => {
    const journeyMap: Record<string, any> = {};

    batches.forEach((b) => {
      // Must be drop completed and not rejected
      if (b.status !== 'DROP_COMPLETED' || Boolean(b.rejectReason)) {
        return;
      }

      const isReturn = Boolean(
        b.isReturn ||
        b.returnType === 'BUYER_RETURN' ||
        b.returnType === 'TRANSPORTER_RETURN' ||
        (b as any).returnType === 'BUYER_RETURN' ||
        (b as any).returnType === 'TRANSPORTER_RETURN' ||
        ((b.mainStatus || (b as any).mainStatus) && ((b.mainStatus || (b as any).mainStatus).includes('RETURN') || (b.mainStatus || (b as any).mainStatus) === 'INVENTORY_BUYER_RETURN'))
      );

      // Skip non-return RTO if any
      if (b.isRTO && !isReturn) {
        return;
      }

      const cleanId = b.id.replace(/^(pickup|drop)-/, '');
      const mId = isReturn ? `return-${cleanId}` : (b.masterOrderId ? String(b.masterOrderId) : cleanId);

      if (!journeyMap[mId]) {
        journeyMap[mId] = {
          masterOrderId: b.masterOrderId,
          id: cleanId,
          displayId: b.displayId || (isReturn ? `ORD-${cleanId.replace(/^ORD-/, '')}` : cleanId),
          shgName: b.shgName || (isReturn ? 'SHG Return Center' : 'Local SHG'),
          productName: b.products?.[0]?.name || (isReturn ? 'Return Parcel' : 'General Shipment'),
          products: Array.isArray(b.products) ? [...b.products] : [],
          tracking: Array.isArray((b as any).tracking) ? [...(b as any).tracking] : [],
          totalQty: b.totalQty || 1,
          totalWeight: b.totalWeight || '1.5 kg',
          timestamp: b.timestamp || '5:02 PM',
          createdAt: b.createdAt || (b as any).orderDate || b.timestamp,
          acceptedAt: (b as any).acceptedAt,
          shgPickedUpAt: (b as any).shgPickedUpAt,
          transporterPickedUpAt: (b as any).transporterPickedUpAt,
          warehouseReceivedAt: (b as any).warehouseReceivedAt,
          dispatchedAt: (b as any).dispatchedAt,
          deliveredAt: (b as any).completedAt || (b as any).deliveredAt || b.timestamp,
          pickupPoint: b.pickupPointName || (isReturn ? 'SHG Return Center' : 'Local SHG'),
          dropPoint: isReturn ? HUB_CONFIG.name : (b.dropPointName || (b.flowType === 'shg_to_gmu' ? HUB_CONFIG.name : 'Customer Address')),
          pickupCompleted: true,
          dropCompleted: true,
          pickupBatchId: undefined,
          dropBatchId: undefined,
          mainStatus: b.mainStatus || 'DROP_COMPLETED',
          status: 'DROP_COMPLETED',
          isReturn: isReturn,
          returnType: b.returnType || (isReturn ? 'BUYER_RETURN' : undefined),
        };
      }

      const journey = journeyMap[mId];

      if (b.products && Array.isArray(b.products)) {
        const existingIds = new Set((journey.products || []).map((p: any) => p.id || p.name));
        b.products.forEach((p: any) => {
          if (!existingIds.has(p.id || p.name)) {
            journey.products.push(p);
          }
        });
      }

      if ((b as any).tracking && Array.isArray((b as any).tracking)) {
        (b as any).tracking.forEach((t: any) => {
          journey.tracking.push(t);
        });
      }

      if (b.id.startsWith('pickup-')) {
        journey.pickupBatchId = b.id;
        if (b.pickupPointName) journey.pickupPoint = b.pickupPointName;
        if (b.createdAt) journey.createdAt = b.createdAt;
        if ((b as any).acceptedAt) journey.acceptedAt = (b as any).acceptedAt;
        if (b.timestamp) journey.shgPickedUpAt = b.timestamp;
      } else if (b.id.startsWith('drop-')) {
        journey.dropBatchId = b.id;
        if (b.dropPointName) journey.dropPoint = b.dropPointName;
        if (b.timestamp) journey.deliveredAt = b.timestamp;
      }
    });

    const allJourneys = Object.values(journeyMap).sort((a, b) => {
      if (b.masterOrderId && a.masterOrderId) {
        return b.masterOrderId - a.masterOrderId;
      }
      return b.id.localeCompare(a.id);
    });

    const normal = allJourneys.filter((j) => !j.isReturn && j.returnType !== 'BUYER_RETURN');
    const returns = allJourneys.filter((j) => j.isReturn || j.returnType === 'BUYER_RETURN');

    return { normalJourneys: normal, returnJourneys: returns };
  }, [batches]);

  const renderJourneyCard = (journey: any) => {
    const isReturn = journey.isReturn || journey.returnType === 'BUYER_RETURN';
    const cleanIdNum = String(journey.displayId || journey.id || '').replace(/^ORD-/, '');

    return (
      <View key={journey.masterOrderId || journey.id} style={styles.premiumBatchCard}>
        {/* Header: ID & Status Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.idGroup}>
            <Text style={styles.journeyIdText}>
              Order #{cleanIdNum}
            </Text>
            <View style={[styles.successPill, styles.pillDelivered]}>
              <Text style={[styles.successPillText, styles.textDelivered]}>
                {isReturn ? 'RETURN COMPLETED' : 'FULLY DELIVERED'}
              </Text>
            </View>
          </View>
          {isReturn ? (
            <RotateCcw size={scale(18)} color="#10B981" strokeWidth={2.5} />
          ) : (
            <CheckCircle size={scale(20)} color="#10B981" strokeWidth={2.5} />
          )}
        </View>

        {/* Product Info */}
        <Text style={styles.shgNameText}>{journey.productName}</Text>
        <Text style={styles.shgContactLabel}>
          {isReturn ? `Return Pickup Center: ${journey.shgName}` : `Seller: ${journey.shgName}`}
        </Text>

        {/* E-to-E Route Timeline */}
        <View style={styles.timelineContainer}>
          {/* Step 1: Pickup Location */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeftCol}>
              <View style={[styles.dotCircle, styles.dotCompleted]}>
                <MapPin size={scale(11)} color="#FFFFFF" />
              </View>
              <View style={[styles.verticalLine, styles.lineActive]} />
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineLocationTitle}>{journey.pickupPoint}</Text>
              <Text style={styles.timelineLocationSub}>
                {isReturn ? 'SHG Return Pickup Point • Collected' : 'Seller Pickup Point • Completed'}
              </Text>
            </View>
          </View>

          {/* Step 2: Drop Point Delivery */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeftCol}>
              <View style={[styles.dotCircle, styles.dotCompleted]}>
                <CheckCircle size={scale(11)} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineLocationTitle}>{journey.dropPoint}</Text>
              <Text style={styles.timelineLocationSub}>
                {isReturn ? 'GMU Hub • Returned & Stored' : 'Buyer Drop Point • Delivered'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons to View Details & Tracking */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => navigation.navigate('OrderBatchPickupDetail', { batchId: journey.pickupBatchId || journey.dropBatchId || journey.id, type: 'pickup' })}
          >
            <Text style={styles.actionBtnOutlineText}>Pickup Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => navigation.navigate('OrderBatchPickupDetail', { batchId: journey.dropBatchId || journey.pickupBatchId || journey.id, type: 'drop' })}
          >
            <Text style={styles.actionBtnOutlineText}>Drop Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnTrack}
            onPress={() => setSelectedTrackingOrder(journey)}
          >
            <Ionicons name="footsteps-outline" size={scale(13)} color="#16A34A" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnTrackText}>Track Order</Text>
          </TouchableOpacity>
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
    );
  };

  const currentJourneys = activeTab === 'new' ? normalJourneys : returnJourneys;

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

      {/* Segmented Top Tabs: New / Return */}
      <View style={styles.tabNavbar}>
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: (screenWidth - scale(40) - scale(8)) / 2,
              transform: [
                {
                  translateX: scrollX.interpolate({
                    inputRange: [0, screenWidth],
                    outputRange: [0, (screenWidth - scale(40) - scale(8)) / 2],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setActiveTab('new');
            pagerRef.current?.scrollTo({ x: 0, animated: true });
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.navTabText, activeTab === 'new' && styles.navTabTextActive]}>
            New ({normalJourneys.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setActiveTab('return');
            pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.navTabText, activeTab === 'return' && styles.navTabTextActive]}>
            Return ({returnJourneys.length})
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={pagerRef as any}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(e) => {
          const pageIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setActiveTab(pageIndex === 0 ? 'new' : 'return');
        }}
      >
        {/* TAB 1: New Completed Orders */}
        <View style={{ width: screenWidth }}>
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

            <Text style={styles.sectionHeadingText}>
              Completed Forward Shipments ({normalJourneys.length})
            </Text>

            {normalJourneys.length === 0 ? (
              <View style={styles.emptyCard}>
                <CheckCircle size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
                <Text style={styles.emptyCardText}>No completed forward shipments found.</Text>
              </View>
            ) : (
              normalJourneys.map(renderJourneyCard)
            )}
          </ScrollView>
        </View>

        {/* TAB 2: Return Completed Orders */}
        <View style={{ width: screenWidth }}>
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

            <Text style={styles.sectionHeadingText}>
              Completed Return Shipments ({returnJourneys.length})
            </Text>

            {returnJourneys.length === 0 ? (
              <View style={styles.emptyCard}>
                <RotateCcw size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
                <Text style={styles.emptyCardText}>No completed return shipments found.</Text>
              </View>
            ) : (
              returnJourneys.map(renderJourneyCard)
            )}
          </ScrollView>
        </View>
      </Animated.ScrollView>

      {selectedTrackingOrder && (
        <TrackingHistoryModal
          visible={!!selectedTrackingOrder}
          onClose={() => setSelectedTrackingOrder(null)}
          order={selectedTrackingOrder}
          role="TRANSPORTER"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: moderateScale(14),
    marginHorizontal: scale(20),
    padding: scale(4),
    position: 'relative',
    height: verticalScale(46),
    marginBottom: verticalScale(6),
  },
  slidingPill: {
    position: 'absolute',
    top: scale(4),
    bottom: scale(4),
    left: scale(4),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: '100%',
  },
  navTabText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#64748B',
  },
  navTabTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.extraBold,
  },
  container: {
    paddingHorizontal: scale(20),
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
  textDelivered: {
    color: '#059669',
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
  verticalLine: {
    width: 2,
    height: verticalScale(36),
    marginVertical: verticalScale(2),
  },
  lineActive: {
    backgroundColor: '#10B981',
  },
  timelineRightCol: {
    flex: 1,
    paddingLeft: scale(10),
    paddingBottom: verticalScale(16),
  },
  timelineLocationTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  timelineLocationSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(12),
  },
  actionBtnOutline: {
    flex: 1,
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  actionBtnOutlineText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#334155',
  },
  actionBtnTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(10),
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  actionBtnTrackText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#16A34A',
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValueText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  metricLabelText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
    marginTop: verticalScale(1),
  },
  metricLine: {
    width: 1,
    height: verticalScale(20),
    backgroundColor: '#E2E8F0',
  },
  timestampText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#64748B',
  },
});

export default OrderBatchCompletedScreen;
