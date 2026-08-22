import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, BatchOrder } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, ChevronDown, ChevronRight, Check, X, MapPin, ArrowRight, Info, Truck, Scale, AlertCircle, Gauge } from 'lucide-react-native';
import WalkthroughElement from '../../components/WalkthroughElement';
import { HUB_CONFIG, isHubPoint } from '../../constants/hub';
import { useTranslation } from 'react-i18next';

const CategoryOrdersScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { batches, acceptBatch, acceptBatchIds, refreshBatchesList, vehicleDetails, showToast } = useOrderManagement();

  // Helper to parse numerical weight from weight string e.g. "5 kg" or 5
  const parseWeightKg = (weightStr?: string | number): number => {
    if (!weightStr) return 0;
    if (typeof weightStr === 'number') return weightStr;
    const match = String(weightStr).match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Transporter registered vehicle capacity details & tier-based tolerance buffer calculation
  const maxCapacity = vehicleDetails?.maxWeight ? Number(vehicleDetails.maxWeight) : (vehicleDetails?.maxCapacity ? Number(vehicleDetails.maxCapacity) : 1000);
  const minCapacity = vehicleDetails?.minWeight ? Number(vehicleDetails.minWeight) : (vehicleDetails?.minCapacity ? Number(vehicleDetails.minCapacity) : 0);
  const vehicleTitle = vehicleDetails?.vehicleName || vehicleDetails?.make || vehicleDetails?.vehicleType || 'Vehicle';
  const vehicleWheeler = vehicleDetails?.wheeler || '';

  // Tier-based effective max weight tolerance calculation
  const getEffectiveMaxWeight = (baseW: number): number => {
    let bufferPercent = 0.03;
    if (baseW <= 50) bufferPercent = 0.05;
    else if (baseW > 500) bufferPercent = 0.03;
    return Math.round(baseW * (1 + bufferPercent));
  };
  const effectiveMaxCapacity = getEffectiveMaxWeight(maxCapacity);
  const toleranceBufferKg = effectiveMaxCapacity - maxCapacity;

  // Calculate currently accepted orders total weight
  const acceptedBatches = batches.filter(b => b.status === 'ACCEPTED_PICKUP' || b.status === 'PICKUP_COMPLETED');
  const currentAcceptedWeight = acceptedBatches.reduce((sum, b) => sum + parseWeightKg(b.totalWeight), 0);

  // Live remaining capacity & usage percentage
  const remainingCapacity = Math.max(0, maxCapacity - currentAcceptedWeight);
  const remainingToleranceCapacity = Math.max(0, effectiveMaxCapacity - currentAcceptedWeight);
  const usagePercent = Math.min(100, Math.max(0, Math.round((currentAcceptedWeight / (effectiveMaxCapacity || 1)) * 100)));

  // Gauge bar color
  const getCapacityStatusColor = (percent: number) => {
    if (percent >= 90) return '#EF4444';
    if (percent >= 75) return '#F59E0B';
    return '#10B981';
  };
  const statusColor = getCapacityStatusColor(usagePercent);


  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingArea, setAcceptingArea] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBatchesList();
    } catch (e) {
      console.error('Failed to refresh batches:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBatchesList().catch(err => console.log('Error refreshing batches on focus:', err));
    });
    return unsubscribe;
  }, [navigation]);



  const handleAcceptSingle = async (batchId: string, type: 'pickup' | 'drop' = 'pickup') => {
    const targetBatch = batches.find(b => b.id === batchId);
    const orderWeight = targetBatch ? parseWeightKg(targetBatch.totalWeight) : 0;

    if (currentAcceptedWeight + orderWeight > effectiveMaxCapacity) {
      showToast(`Cannot accept: Total weight (${(currentAcceptedWeight + orderWeight).toFixed(1)} kg) exceeds vehicle tolerance limit (${effectiveMaxCapacity} kg).`, 'error');
      return;
    }

    try {
      await acceptBatch(batchId);
      navigation.navigate('AcceptedOrders', { activeTab: 'pickup' });
    } catch (err) {
      console.error('Failed to accept single batch:', err);
    }
  };

  const handleAcceptBulk = async (ids: string[], areaName: string) => {
    const areaBatches = batches.filter(b => ids.includes(b.id));
    const totalAreaWeight = areaBatches.reduce((sum, b) => sum + parseWeightKg(b.totalWeight), 0);

    if (currentAcceptedWeight + totalAreaWeight > effectiveMaxCapacity) {
      showToast(`Cannot accept bulk orders: Exceeds vehicle tolerance limit (${effectiveMaxCapacity} kg).`, 'error');
      return;
    }

    setAcceptingArea(areaName);
    try {
      await acceptBatchIds(ids);
      setShowSuccessModal(false);
      navigation.navigate('AcceptedOrders');
    } catch (err) {
      console.error('Failed to accept bulk batches:', err);
    } finally {
      setAcceptingArea(null);
    }
  };

  // Track accordion expansion states per area. Collapsed by default.
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  const toggleAreaExpand = (areaName: string) => {
    setExpandedAreas((prev) => ({
      ...prev,
      [areaName]: prev[areaName] === false ? true : false,
    }));
  };

  // New items view
  const pendingBatches = batches.filter((b) => b.status === 'NEW_ORDER');

  const displayEntries: { batch: BatchOrder; type: 'pickup' | 'drop' }[] = [];
  pendingBatches.forEach((b) => {
    if (b.pickupCount > 0) {
      displayEntries.push({ batch: b, type: 'pickup' });
    }
    if (b.dropCount > 0) {
      displayEntries.push({ batch: b, type: 'drop' });
    }
  });

  // Group by Display Area
  const groupedEntries: Record<string, typeof displayEntries> = {};
  displayEntries.forEach((entry) => {
    let displayArea = entry.batch.areaName;

    // Route Logic Consistency
    if (entry.type === 'pickup' && entry.batch.flowType === 'gmu_to_shg') {
      displayArea = HUB_CONFIG.name;
    } else if (entry.type === 'drop' && entry.batch.flowType === 'shg_to_gmu') {
      displayArea = HUB_CONFIG.name;
    }

    if (!groupedEntries[displayArea]) {
      groupedEntries[displayArea] = [];
    }
    groupedEntries[displayArea].push(entry);
  });

  const ORDERED_AREAS = ['Nesari', 'Wagharale', 'Mahagaon', 'Halkarni', HUB_CONFIG.name, 'Gadhinglaj'];
  const allFoundAreas = Object.keys(groupedEntries);
  const rawAreas = [...ORDERED_AREAS.filter(a => groupedEntries[a]), ...allFoundAreas];
  const areas = rawAreas.filter((item, index) => item != null && rawAreas.indexOf(item) === index);



  const getRouteDisplayText = (batch: BatchOrder, type: 'pickup' | 'drop', areaName: string) => {
    const isDirect = batch.flowType === 'shg_to_shg';
    if (isDirect) {
      return `From - ${batch.pickupPointName} To ${batch.dropPointName}`;
    }

    const isHubRoute = areaName === HUB_CONFIG.name || isHubPoint(areaName);
    
    if (isHubRoute) {
      if (type === 'pickup') {
        return `From - GMU To ${batch.dropPointName}`;
      } else {
        return `From - ${batch.pickupPointName} To ${HUB_CONFIG.name}`;
      }
    } else {
      if (type === 'pickup') {
        return `From - ${batch.pickupPointName} To ${HUB_CONFIG.name}`;
      } else {
        return `From - ${HUB_CONFIG.name} To ${batch.dropPointName}`;
      }
    }
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('orders.new_orders', { defaultValue: 'New Orders' })}
        subtitle={t('orders.new_orders_subtitle', { defaultValue: 'Expandable area routes & compact notifications' })}
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      <View style={{ height: verticalScale(10) }} />

      {/* 🚛 Fixed / Frozen Vehicle Capacity Summary Card */}
      <View style={styles.fixedCapacityWrapper}>
        <View style={styles.capacityCard}>
          <View style={styles.capacityCardHeader}>
            <View style={styles.capacityHeaderLeft}>
              <View style={styles.truckIconBadge}>
                <Truck size={scale(18)} color="#059669" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.capacityVehicleTitle} numberOfLines={1}>
                  {vehicleTitle} {vehicleWheeler ? `• ${vehicleWheeler}` : ''}
                </Text>
                <Text style={styles.capacityVehicleSubtitle}>
                  {minCapacity > 0 ? `${t('orders.vehicle_capacity', { defaultValue: 'Cap.' })}: ${minCapacity} - ${maxCapacity} kg` : `${t('orders.vehicle_capacity', { defaultValue: 'Max Cap.' })}: ${maxCapacity} kg`}
                </Text>
              </View>
            </View>

            <View style={[styles.capacityPercentageBadge, { backgroundColor: `${statusColor}18` }]}>
              <Gauge size={scale(13)} color={statusColor} style={{ marginRight: scale(4) }} />
              <Text style={[styles.capacityPercentageText, { color: statusColor }]}>{usagePercent}%</Text>
            </View>
          </View>

          {/* Metrics Grid: Total | Accepted | Remaining */}
          <View style={styles.capacityMetricsGrid}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>{t('orders.vehicle_capacity', { defaultValue: 'Max Cap.' })}</Text>
              <Text style={styles.metricValue}>{maxCapacity} kg</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>{t('orders.accepted_load', { defaultValue: 'Accepted' })}</Text>
              <Text style={[styles.metricValue, { color: currentAcceptedWeight > 0 ? '#2563EB' : Colors.textPrimary }]}>
                {currentAcceptedWeight.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>{t('orders.remaining_capacity', { defaultValue: 'Remaining' })}</Text>
              <Text style={[styles.metricValue, { color: remainingCapacity <= 0 ? '#EF4444' : '#059669' }]}>
                {remainingCapacity.toFixed(1)} kg
              </Text>
            </View>
          </View>
        </View>
      </View>

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
        {areas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Package size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
            <Text style={styles.emptyCardText}>{t('orders.no_pending_dispatch_active', { defaultValue: 'No pending dispatch notifications active.' })}</Text>
          </View>
        ) : (
          areas.map((areaName) => {
            const areaEntries = groupedEntries[areaName];
            const isExpanded = expandedAreas[areaName] !== false;

            const pickupEntries = areaEntries.filter(e => e.type === 'pickup');
            const dropEntries = areaEntries.filter(e => e.type === 'drop');

            return (
              <View key={areaName} style={styles.areaAccordionBlock}>
                {/* Visual Accent Bar */}
                <View style={styles.areaAccentBar} />

                {/* Tappable Area Heading to expand/close */}
                <TouchableOpacity
                  style={styles.areaHeaderRow}
                  activeOpacity={0.8}
                  onPress={() => toggleAreaExpand(areaName)}
                >
                  <View style={styles.headerLeftCol}>
                    <MapPin size={scale(18)} color={Colors.primary} strokeWidth={2.5} />
                    <Text style={styles.areaTitleText} numberOfLines={1} ellipsizeMode="tail">
                      {areaName}
                    </Text>
                  </View>

                  <View style={styles.headerRightCol}>
                    <View style={styles.assignedBadgePill}>
                      <Text style={styles.assignedBadgeText}>{areaEntries.length} {t('orders.assigned', { defaultValue: 'Assigned' })}</Text>
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

                {/* Collapsible body section containing sections for Pickup and Drop orders */}
                {isExpanded && (
                  <View style={styles.accordionBody}>
                    
                    {/* Pickup Orders Section */}
                    {pickupEntries.length > 0 && (
                      <View style={{ marginBottom: verticalScale(6) }}>
                        <View style={styles.notificationsWrapper}>
                          {pickupEntries.map((entry, index) => {
                            const { batch, type } = entry;
                            const routeText = getRouteDisplayText(batch, type, areaName);
                            const itemWeight = parseWeightKg(batch.totalWeight);
                            const isExceedingTolerance = (currentAcceptedWeight + itemWeight) > effectiveMaxCapacity;

                            return (
                              <View key={`${batch.id}-pickup-${index}`} style={styles.notificationWidgetCard}>
                                <TouchableOpacity
                                   style={styles.widgetLeftData}
                                   activeOpacity={0.7}
                                   onPress={() => {
                                     navigation.navigate('ActivityOrderDetail', { batchId: batch.id, type: 'pickup' });
                                   }}
                                 >
                                  <View style={styles.widgetTopRow}>
                                    <Text style={styles.widgetBatchIdText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{batch.displayId || batch.id}</Text>
                                  </View>
                                  <Text style={styles.widgetRouteText} numberOfLines={2}>{routeText}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), flexWrap: 'wrap' }}>
                                    <Text style={styles.widgetTotalsText}>{batch.pickupCount} {t('orders.items')} • {batch.totalWeight}</Text>
                                    <View style={[styles.legTagBox, { backgroundColor: batch.flowType === 'shg_to_shg' ? '#FEF2F2' : '#EFF6FF' }]}>
                                      <Text style={[styles.legTagText, { color: batch.flowType === 'shg_to_shg' ? '#DC2626' : '#2563EB' }]}>
                                        {batch.flowType === 'shg_to_shg' ? '⚡ Direct SHG-to-SHG' : t('orders.pickup_orders', { defaultValue: 'Pickup Order' })}
                                      </Text>
                                    </View>
                                  </View>
                                </TouchableOpacity>
                                <View style={styles.actionStrip}>
                                  {batch.id === displayEntries[0]?.batch.id && type === displayEntries[0]?.type ? (
                                    <WalkthroughElement stepId="accept_task">
                                      <TouchableOpacity 
                                        style={[styles.modernAcceptBtn, isExceedingTolerance && { opacity: 0.5, backgroundColor: '#64748B' }]} 
                                        onPress={async () => {
                                          if (isExceedingTolerance) {
                                            showToast(`Cannot accept: Weight (${(currentAcceptedWeight + itemWeight).toFixed(1)} kg) exceeds vehicle tolerance limit (${effectiveMaxCapacity} kg).`, 'error');
                                            return;
                                          }
                                          try {
                                            await acceptBatch(batch.id);
                                            navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id, type: 'pickup' });
                                          } catch (err) {
                                            console.error('Failed to accept batch during walkthrough:', err);
                                          }
                                        }}
                                      >
                                        <Text style={styles.btnTextWhite}>{t('orders.accept', { defaultValue: 'Accept' })}</Text>
                                      </TouchableOpacity>
                                    </WalkthroughElement>
                                  ) : (
                                    <TouchableOpacity 
                                      style={[styles.modernAcceptBtn, isExceedingTolerance && { opacity: 0.5, backgroundColor: '#64748B' }]} 
                                      onPress={() => handleAcceptSingle(batch.id, 'pickup')}
                                    >
                                      <Text style={styles.btnTextWhite}>{t('orders.accept', { defaultValue: 'Accept' })}</Text>
                                    </TouchableOpacity>
                                  )}

                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Drop Orders Section */}
                    {dropEntries.length > 0 && (
                      <View style={{ marginBottom: verticalScale(6) }}>
                        <View style={styles.notificationsWrapper}>
                          {dropEntries.map((entry, index) => {
                            const { batch, type } = entry;
                            const routeText = getRouteDisplayText(batch, type, areaName);
                            const itemWeight = parseWeightKg(batch.totalWeight);
                            const isExceedingTolerance = (currentAcceptedWeight + itemWeight) > effectiveMaxCapacity;

                            return (
                              <View key={`${batch.id}-drop-${index}`} style={styles.notificationWidgetCard}>
                                <TouchableOpacity
                                   style={styles.widgetLeftData}
                                   activeOpacity={0.7}
                                   onPress={() => {
                                     navigation.navigate('ActivityOrderDetail', { batchId: batch.id, type: 'drop' });
                                   }}
                                 >
                                    <View style={styles.widgetTopRow}>
                                      <Text style={styles.widgetBatchIdText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{batch.displayId || batch.id}</Text>
                                    </View>
                                   <Text style={styles.widgetRouteText} numberOfLines={2}>{routeText}</Text>
                                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), flexWrap: 'wrap' }}>
                                     <Text style={styles.widgetTotalsText}>{batch.dropCount} {t('orders.items')} • {batch.totalWeight}</Text>
                                     <View style={[styles.legTagBox, { backgroundColor: '#ECFDF5' }]}>
                                       <Text style={[styles.legTagText, { color: '#059669' }]}>{t('orders.drop_orders', { defaultValue: 'Drop Order' })}</Text>
                                     </View>
                                   </View>
                                 </TouchableOpacity>
                                <View style={styles.actionStrip}>
                                  {batch.id === displayEntries[0]?.batch.id && type === displayEntries[0]?.type ? (
                                    <WalkthroughElement stepId="accept_task">
                                      <TouchableOpacity 
                                        style={[styles.modernAcceptBtn, isExceedingTolerance && { opacity: 0.5, backgroundColor: '#64748B' }]} 
                                        onPress={async () => {
                                          if (isExceedingTolerance) {
                                            showToast(`Cannot accept: Weight (${(currentAcceptedWeight + itemWeight).toFixed(1)} kg) exceeds vehicle tolerance limit (${effectiveMaxCapacity} kg).`, 'error');
                                            return;
                                          }
                                          try {
                                            await acceptBatch(batch.id);
                                            navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id, type: 'pickup' });
                                          } catch (err) {
                                            console.error('Failed to accept batch during walkthrough:', err);
                                          }
                                        }}
                                      >
                                        <Text style={styles.btnTextWhite}>{t('orders.accept', { defaultValue: 'Accept' })}</Text>
                                      </TouchableOpacity>
                                    </WalkthroughElement>
                                  ) : (
                                    <TouchableOpacity 
                                      style={[styles.modernAcceptBtn, isExceedingTolerance && { opacity: 0.5, backgroundColor: '#64748B' }]} 
                                      onPress={() => handleAcceptSingle(batch.id, 'drop')}
                                    >
                                      <Text style={styles.btnTextWhite}>{t('orders.accept', { defaultValue: 'Accept' })}</Text>
                                    </TouchableOpacity>
                                  )}

                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Area bulk dispatch footer button */}
                    <TouchableOpacity
                      style={[
                        styles.bulkAreaAcceptBtn,
                        acceptingArea !== null && { opacity: 0.6 }
                      ]}
                      activeOpacity={0.85}
                      disabled={acceptingArea !== null}
                      onPress={() => {
                        const idsToAccept = areaEntries.map(e => e.batch.id).filter((id, idx, arr) => id != null && arr.indexOf(id) === idx);
                        handleAcceptBulk(idsToAccept, areaName);
                      }}
                    >
                      {acceptingArea === areaName ? (
                        <ActivityIndicator size="small" color="#059669" />
                      ) : (
                        <Text style={styles.bulkAreaAcceptText}>{t('orders.accept_all_for', { areaName, defaultValue: `Accept All for ${areaName}` })}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>


      {/* Premium Order Acceptance Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            {/* Header / Icon */}
            <View style={styles.successIconOuterContainer}>
              <View style={styles.successIconInnerContainer}>
                <Check size={scale(36)} color="#059669" strokeWidth={3} />
              </View>
            </View>

            {/* Content */}
            <Text style={styles.successModalTitle}>
              {t('orders.accepted_success_title', { defaultValue: 'Order Accepted!' })}
            </Text>
            <Text style={styles.successModalSubtitle}>
              {t('orders.accepted_success_subtitle', { defaultValue: "What's next? You need to perform Pickup and then Drop this order." })}
            </Text>

            {/* Step-by-Step Info Cards */}
            <View style={styles.stepsContainer}>
              {/* Step 1: Pickup */}
              <View style={styles.stepRow}>
                <View style={[styles.stepIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Package size={scale(16)} color="#2563EB" strokeWidth={2.5} />
                </View>
                <View style={styles.stepInfoText}>
                  <Text style={styles.stepTitle}>
                    {t('orders.step_pickup_title', { defaultValue: '1. Complete Pickup' })}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {t('orders.step_pickup_desc', { defaultValue: 'Locate the pickup point in Accepted Orders and collect the items.' })}
                  </Text>
                </View>
              </View>

              {/* Connecting Line */}
              <View style={styles.stepVerticalLine} />

              {/* Step 2: Drop */}
              <View style={styles.stepRow}>
                <View style={[styles.stepIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <MapPin size={scale(16)} color="#059669" strokeWidth={2.5} />
                </View>
                <View style={styles.stepInfoText}>
                  <Text style={styles.stepTitle}>
                    {t('orders.step_drop_title', { defaultValue: '2. Complete Drop' })}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {t('orders.step_drop_desc', { defaultValue: 'Deliver the collected items to the destination hub/SHG.' })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.successModalActions}>
              <TouchableOpacity
                style={styles.gotoAcceptedBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.navigate('AcceptedOrders');
                }}
              >
                <Text style={styles.gotoAcceptedText}>
                  {t('orders.goto_accepted_orders', { defaultValue: 'Go to Accepted Orders' })}
                </Text>
                <ArrowRight size={scale(16)} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: scale(6) }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stayHereBtn}
                activeOpacity={0.7}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.stayHereText}>
                  {t('orders.stay_on_new_orders', { defaultValue: 'Stay on New Orders' })}
                </Text>
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
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(120),
    gap: verticalScale(18),
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionSubTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginBottom: verticalScale(6),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  areaAccentBar: {
    width: scale(4),
    height: '100%',
    backgroundColor: Colors.primary,
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
    minWidth: 0,
  },
  assignedBadgePill: {
    backgroundColor: 'rgba(178, 213, 52, 0.12)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(178, 213, 52, 0.3)',
  },
  assignedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.primary,
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
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(12),
    backgroundColor: '#FFFFFF',
  },
  notificationsWrapper: {
    gap: verticalScale(20),
    marginBottom: verticalScale(4),
  },
  notificationWidgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  widgetLeftData: {
    flex: 1,
    marginRight: scale(8),
  },
  widgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(4),
  },
  widgetBatchIdText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  legTagBox: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(1.5),
    borderRadius: scale(4),
  },
  legTagText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
  },
  widgetRouteText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  widgetTotalsText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11.5),
    color: Colors.textPlaceholder,
  },
  actionStrip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: verticalScale(12),
    paddingLeft: scale(16),
    borderLeftWidth: 1.5,
    borderLeftColor: '#F1F5F9',
    marginLeft: scale(4),
  },
  modernAcceptBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  btnTextWhite: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },

  bulkAreaAcceptBtn: {
    backgroundColor: '#ECFDF5',
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bulkAreaAcceptText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },

  successModalCard: {
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(12) },
    shadowOpacity: 0.16,
    shadowRadius: moderateScale(24),
    elevation: 10,
    width: '100%',
  },
  successIconOuterContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  successIconInnerContainer: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(22),
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  successModalSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13.5),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(24),
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: verticalScale(24),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
  },
  stepIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(2),
  },
  stepInfoText: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    marginBottom: verticalScale(2),
  },
  stepDesc: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textPlaceholder,
    lineHeight: moderateScale(16),
  },
  stepVerticalLine: {
    width: scale(2),
    height: verticalScale(16),
    backgroundColor: '#E2E8F0',
    marginLeft: scale(15),
    marginVertical: verticalScale(4),
  },
  successModalActions: {
    width: '100%',
    gap: verticalScale(10),
  },
  gotoAcceptedBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    height: verticalScale(48),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  gotoAcceptedText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  stayHereBtn: {
    height: verticalScale(44),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  stayHereText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13.5),
    color: Colors.textPlaceholder,
  },


  dateTimeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(6),
  },
  dateSelectBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectBtnSelected: {
    backgroundColor: 'rgba(178, 213, 52, 0.08)',
    borderColor: Colors.primary,
  },
  dateSelectText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13.5),
    color: Colors.textSecondary,
  },
  dateSelectTextSelected: {
    color: Colors.primary,
  },
  dateSubtext: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(10.5),
    color: Colors.textPlaceholder,
    marginTop: verticalScale(2),
  },
  dateSubtextSelected: {
    color: Colors.primary,
  },
  timeInputGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(10),
  },
  timeInputCol: {
    flex: 1,
  },
  timeInputLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginBottom: verticalScale(4),
  },
  timeDisplayBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: Platform.OS === 'ios' ? verticalScale(12) : verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  timeDisplayText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13.5),
    color: Colors.textPrimary,
  },
  timePlaceholderText: {
    fontFamily: Fonts.medium,
    color: Colors.textPlaceholder,
  },
  // Vehicle Capacity Summary Card Styles
  fixedCapacityWrapper: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(6),
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  capacityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: scale(14),
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  capacityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(10),
  },
  capacityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
  truckIconBadge: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capacityVehicleTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  capacityVehicleSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
    marginTop: verticalScale(1),
  },
  capacityPercentageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(20),
  },
  capacityPercentageText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
  },
  capacityMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(8),
    marginBottom: 0,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(10.5),
    color: Colors.textSecondary,
    marginBottom: verticalScale(2),
  },
  metricValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13.5),
    color: Colors.textPrimary,
  },
  metricDivider: {
    width: 1,
    height: verticalScale(24),
    backgroundColor: '#E2E8F0',
  },
  progressBarWrapper: {
    marginTop: verticalScale(2),
  },
  progressBarTrack: {
    height: verticalScale(7),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: scale(4),
  },
  progressSummaryText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(10.5),
    color: Colors.textSecondary,
  },
  // Order Level Capacity Suggestion Pill
  capacitySuggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
    marginTop: verticalScale(6),
    alignSelf: 'flex-start',
  },
  capacitySuggestionBoxSafe: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  capacitySuggestionBoxExceeded: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  capacitySuggestionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10.5),
  },
  capacitySuggestionTextSafe: {
    color: '#047857',
  },
  capacitySuggestionTextExceeded: {
    color: '#B91C1C',
  },
});

export default CategoryOrdersScreen;
