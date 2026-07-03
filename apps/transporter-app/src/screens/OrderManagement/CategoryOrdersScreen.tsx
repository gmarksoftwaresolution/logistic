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
import { Package, ChevronDown, ChevronRight, Check, X, MapPin, ArrowRight, Info } from 'lucide-react-native';
import WalkthroughElement from '../../components/WalkthroughElement';
import { useTranslation } from 'react-i18next';

const CategoryOrdersScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { batches, acceptBatch, rejectBatch, acceptBatchIds, refreshBatchesList } = useOrderManagement();
  const [rejectingBatchId, setRejectingBatchId] = useState<string | null>(null);
  const [selectedReasonChip, setSelectedReasonChip] = useState<string | null>(null);
  const [activeSubStep, setActiveSubStep] = useState<'none' | 'shg_gmu_not_available' | 'unsufficient_details'>('none');
  const [customReasonText, setCustomReasonText] = useState('');
  const modalScrollRef = useRef<ScrollView>(null);
  const customReasonInputRef = useRef<TextInput>(null);
  const [isEditingCustomReason, setIsEditingCustomReason] = useState(false);
  const [isCustomInputFocused, setIsCustomInputFocused] = useState(false);

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
    if (route.params?.triggerRejectBatchId) {
      setRejectingBatchId(route.params.triggerRejectBatchId);
      navigation.setParams({ triggerRejectBatchId: undefined });
    }
  }, [route.params?.triggerRejectBatchId]);

  const handleAcceptSingle = async (batchId: string, type: 'pickup' | 'drop' = 'pickup') => {
    try {
      await acceptBatch(batchId);
      navigation.navigate('AcceptedOrders', { activeTab: 'pickup' });
    } catch (err) {
      console.error('Failed to accept single batch:', err);
    }
  };

  const handleAcceptBulk = async (ids: string[], areaName: string) => {
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
      displayArea = 'Gadhinglaj Hub';
    } else if (entry.type === 'drop' && entry.batch.flowType === 'shg_to_gmu') {
      displayArea = 'Gadhinglaj Hub';
    }

    if (!groupedEntries[displayArea]) {
      groupedEntries[displayArea] = [];
    }
    groupedEntries[displayArea].push(entry);
  });

  const ORDERED_AREAS = ['Nesari', 'Wagharale', 'Mahagaon', 'Halkarni', 'Gadhinglaj Hub', 'Gadhinglaj'];
  const allFoundAreas = Object.keys(groupedEntries);
  const areas = Array.from(new Set([...ORDERED_AREAS.filter(a => groupedEntries[a]), ...allFoundAreas]));

  const handleCloseModal = () => {
    setRejectingBatchId(null);
    setSelectedReasonChip(null);
    setActiveSubStep('none');
    setCustomReasonText('');
    setIsEditingCustomReason(false);
    setIsCustomInputFocused(false);
  };

  const handleConfirmReject = async () => {
    if (rejectingBatchId) {
      let finalReason = '';
      if (selectedReasonChip === 'Custom Reason') {
        finalReason = customReasonText.trim();
      } else {
        finalReason = selectedReasonChip || '';
      }

      if (finalReason.trim()) {
        await rejectBatch(rejectingBatchId, finalReason.trim());
        handleCloseModal();
      }
    }
  };

  const getRouteDisplayText = (batch: BatchOrder, type: 'pickup' | 'drop', areaName: string) => {
    const isHubRoute = areaName === 'Gadhinglaj Hub';
    
    if (isHubRoute) {
      if (type === 'pickup') {
        return `From - GMU To ${batch.dropPointName}`;
      } else {
        return `From - ${batch.pickupPointName} To Gadhinglaj Hub`;
      }
    } else {
      if (type === 'pickup') {
        return `From - ${batch.pickupPointName} To Gadhinglaj Hub`;
      } else {
        return `From - Gadhinglaj Hub To ${batch.dropPointName}`;
      }
    }
  };

  const reasonChips = [
    t('orders.reason_vehicle_not_available', { defaultValue: 'Vehicle Not Available' }),
    t('orders.reason_pickup_location_not_reachable', { defaultValue: 'Pickup Location Not Reachable' }),
    t('orders.reason_transport_capacity_full', { defaultValue: 'Transport Capacity Full' }),
    t('orders.reason_custom_own_reason', { defaultValue: 'Custom Reason' }),
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('orders.new_orders', { defaultValue: 'New Orders' })}
        subtitle={t('orders.new_orders_subtitle', { defaultValue: 'Expandable area routes & compact notifications' })}
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      <View style={{ height: verticalScale(14) }} />

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
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                                    <Text style={styles.widgetTotalsText}>{batch.pickupCount} {t('orders.items')} • {batch.totalWeight}</Text>
                                    <View style={[styles.legTagBox, { backgroundColor: '#EFF6FF' }]}>
                                      <Text style={[styles.legTagText, { color: '#2563EB' }]}>{t('orders.pickup_orders', { defaultValue: 'Pickup Order' })}</Text>
                                    </View>
                                  </View>
                                </TouchableOpacity>
                                <View style={styles.actionStrip}>
                                  {batch.id === displayEntries[0]?.batch.id && type === displayEntries[0]?.type ? (
                                    <WalkthroughElement stepId="accept_task">
                                      <TouchableOpacity 
                                        style={styles.modernAcceptBtn} 
                                        onPress={async () => {
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
                                    <TouchableOpacity style={styles.modernAcceptBtn} onPress={() => handleAcceptSingle(batch.id, 'pickup')}>
                                      <Text style={styles.btnTextWhite}>{t('orders.accept', { defaultValue: 'Accept' })}</Text>
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity style={styles.modernRejectBtn} onPress={() => setRejectingBatchId(batch.id)}>
                                    <Text style={styles.btnTextRed}>{t('orders.reject', { defaultValue: 'Reject' })}</Text>
                                  </TouchableOpacity>
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
                                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
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
                                        style={styles.modernAcceptBtn} 
                                        onPress={async () => {
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
                                    <TouchableOpacity style={styles.modernAcceptBtn} onPress={() => handleAcceptSingle(batch.id, 'pickup')}>
                                      <Text style={styles.btnTextWhite}>{t('orders.accept', { defaultValue: 'Accept' })}</Text>
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity style={styles.modernRejectBtn} onPress={() => setRejectingBatchId(batch.id)}>
                                    <Text style={styles.btnTextRed}>{t('orders.reject', { defaultValue: 'Reject' })}</Text>
                                  </TouchableOpacity>
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
                        const idsToAccept = Array.from(new Set(areaEntries.map(e => e.batch.id)));
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
      {/* Reject Modal */}
      <Modal
        visible={!!rejectingBatchId}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {t('orders.reject_order_leg', { defaultValue: 'Reject Order Leg' })}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                <X size={scale(20)} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              ref={modalScrollRef}
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: verticalScale(10) }}
            >
              <View>
                <Text style={styles.modalSubtitle}>{t('orders.specify_reject_reason', { defaultValue: 'Specify reason for failing acceptance' })}</Text>
                
                <View style={styles.chipsContainer}>
                  {/* Option 1: Vehicle Not Available */}
                  <TouchableOpacity
                    style={[
                      styles.reasonChip,
                      selectedReasonChip === 'Vehicle Not Available' && styles.reasonChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedReasonChip('Vehicle Not Available');
                      setActiveSubStep('none');
                      setCustomReasonText('');
                    }}
                  >
                    <Text style={[styles.reasonChipText, selectedReasonChip === 'Vehicle Not Available' && styles.reasonChipTextSelected]}>
                      Vehicle Not Available
                    </Text>
                  </TouchableOpacity>

                  {/* Option 2: Transport Capacity Full */}
                  <TouchableOpacity
                    style={[
                      styles.reasonChip,
                      selectedReasonChip === 'Transport Capacity Full' && styles.reasonChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedReasonChip('Transport Capacity Full');
                      setActiveSubStep('none');
                      setCustomReasonText('');
                    }}
                  >
                    <Text style={[styles.reasonChipText, selectedReasonChip === 'Transport Capacity Full' && styles.reasonChipTextSelected]}>
                      Transport Capacity Full
                    </Text>
                  </TouchableOpacity>

                  {/* Option 3: SHG/Gmu Not Available */}
                  <TouchableOpacity
                    style={[
                      styles.reasonChip,
                      (activeSubStep === 'shg_gmu_not_available' || selectedReasonChip === 'SHG Not Available' || selectedReasonChip === 'GMU Not Available') && styles.reasonChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedReasonChip(null);
                      setActiveSubStep('shg_gmu_not_available');
                      setCustomReasonText('');
                    }}
                  >
                    <Text style={[styles.reasonChipText, (activeSubStep === 'shg_gmu_not_available' || selectedReasonChip === 'SHG Not Available' || selectedReasonChip === 'GMU Not Available') && styles.reasonChipTextSelected]}>
                      SHG/Gmu Not Available
                    </Text>
                  </TouchableOpacity>

                  {/* Option 4: Unsufficient Details */}
                  <TouchableOpacity
                    style={[
                      styles.reasonChip,
                      (activeSubStep === 'unsufficient_details' || selectedReasonChip === 'Unsufficient Details of SHG' || selectedReasonChip === 'Unsufficient Details of GMU') && styles.reasonChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedReasonChip(null);
                      setActiveSubStep('unsufficient_details');
                      setCustomReasonText('');
                    }}
                  >
                    <Text style={[styles.reasonChipText, (activeSubStep === 'unsufficient_details' || selectedReasonChip === 'Unsufficient Details of SHG' || selectedReasonChip === 'Unsufficient Details of GMU') && styles.reasonChipTextSelected]}>
                      Unsufficient Details
                    </Text>
                  </TouchableOpacity>

                  {/* Option 5: Custom Reason */}
                  {selectedReasonChip === 'Custom Reason' ? (
                    <TextInput
                      ref={customReasonInputRef}
                      style={[
                        styles.reasonChip,
                        styles.reasonChipSelected,
                        {
                          fontFamily: Fonts.medium,
                          fontSize: moderateScale(13.5),
                          color: '#DC2626',
                          minHeight: verticalScale(50),
                          textAlignVertical: 'top',
                        }
                      ]}
                      placeholder="Custom Reason here"
                      placeholderTextColor={Colors.textPlaceholder}
                      value={customReasonText}
                      onChangeText={setCustomReasonText}
                      multiline
                      autoFocus
                      onFocus={() => {
                        setTimeout(() => {
                          modalScrollRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.reasonChip}
                      onPress={() => {
                        setSelectedReasonChip('Custom Reason');
                        setActiveSubStep('none');
                        setTimeout(() => {
                          customReasonInputRef.current?.focus();
                        }, 100);
                      }}
                    >
                      <Text style={styles.reasonChipText}>
                        Custom Reason
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                 {/* Sub-steps container */}
                {activeSubStep === 'shg_gmu_not_available' && (
                  <View style={{ marginTop: verticalScale(10), marginBottom: verticalScale(16) }}>
                    <Text style={styles.subHeadingLabel}>Select Specific Location:</Text>
                    <View style={styles.chipsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.reasonChip,
                          selectedReasonChip === 'SHG Not Available' && styles.reasonChipSelected,
                        ]}
                        onPress={() => setSelectedReasonChip('SHG Not Available')}
                      >
                        <Text style={[styles.reasonChipText, selectedReasonChip === 'SHG Not Available' && styles.reasonChipTextSelected]}>
                          SHG Not Available
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.reasonChip,
                          selectedReasonChip === 'GMU Not Available' && styles.reasonChipSelected,
                        ]}
                        onPress={() => setSelectedReasonChip('GMU Not Available')}
                      >
                        <Text style={[styles.reasonChipText, selectedReasonChip === 'GMU Not Available' && styles.reasonChipTextSelected]}>
                          GMU Not Available
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {activeSubStep === 'unsufficient_details' && (
                  <View style={{ marginTop: verticalScale(10), marginBottom: verticalScale(16) }}>
                    <Text style={styles.subHeadingLabel}>Select Specific Party:</Text>
                    <View style={styles.chipsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.reasonChip,
                          selectedReasonChip === 'Unsufficient Details of SHG' && styles.reasonChipSelected,
                        ]}
                        onPress={() => setSelectedReasonChip('Unsufficient Details of SHG')}
                      >
                        <Text style={[styles.reasonChipText, selectedReasonChip === 'Unsufficient Details of SHG' && styles.reasonChipTextSelected]}>
                          Unsufficient Details of SHG
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.reasonChip,
                          selectedReasonChip === 'Unsufficient Details of GMU' && styles.reasonChipSelected,
                        ]}
                        onPress={() => setSelectedReasonChip('Unsufficient Details of GMU')}
                      >
                        <Text style={[styles.reasonChipText, selectedReasonChip === 'Unsufficient Details of GMU' && styles.reasonChipTextSelected]}>
                          Unsufficient Details of GMU
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}



                <TouchableOpacity
                  style={[
                    styles.confirmRejectBtn,
                    (!selectedReasonChip || (selectedReasonChip === 'Custom Reason' && !customReasonText.trim())) && styles.btnDisabled
                  ]}
                  disabled={!selectedReasonChip || (selectedReasonChip === 'Custom Reason' && !customReasonText.trim())}
                  onPress={handleConfirmReject}
                >
                  <Text style={styles.confirmRejectText}>Confirm Reject</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  modernRejectBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWhite: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
  btnTextRed: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.error,
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
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(8) },
    shadowOpacity: 0.12,
    shadowRadius: moderateScale(24),
    elevation: 5,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: scale(4),
  },
  modalSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginBottom: verticalScale(20),
  },
  chipsContainer: {
    flexDirection: 'column',
    gap: verticalScale(10),
    marginBottom: verticalScale(16),
    width: '100%',
  },
  reasonChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonChipSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  reasonChipText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13.5),
    color: Colors.textSecondary,
  },
  reasonChipTextSelected: {
    fontFamily: Fonts.bold,
    color: '#DC2626',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(14),
    padding: scale(12),
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: verticalScale(24),
  },
  confirmRejectBtn: {
    backgroundColor: '#EF4444',
    height: verticalScale(50),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  confirmRejectText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
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

  reasonChipInput: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(16),
    paddingVertical: Platform.OS === 'ios' ? verticalScale(12) : verticalScale(10),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    width: '100%',
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13.5),
    color: Colors.textSecondary,
  },
  reasonChipInputSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    color: Colors.textPrimary,
    fontFamily: Fonts.medium,
  },
  rescheduleTypeChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  rescheduleTypeTextSelected: {
    fontFamily: Fonts.bold,
    color: '#4F46E5',
  },
  rescheduleReasonChipSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  rescheduleReasonTextSelected: {
    fontFamily: Fonts.bold,
    color: '#B45309',
  },
  customReasonTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(12),
    padding: scale(12),
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13.5),
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: verticalScale(60),
    marginTop: verticalScale(4),
    width: '100%',
  },
  subHeadingLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
    marginTop: verticalScale(14),
    marginBottom: verticalScale(8),
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
});

export default CategoryOrdersScreen;
