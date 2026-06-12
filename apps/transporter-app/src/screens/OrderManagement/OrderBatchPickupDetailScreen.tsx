import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, FlowType, HUB_CONTACT, BatchOrder } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { CheckCircle, XCircle, Package, MapPin, Phone, User, X, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WalkthroughElement from '../../components/WalkthroughElement';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTranslation } from 'react-i18next';
import {
  GenerateCodeButton,
  EnterCodeButton,
  VerificationBottomSheet,
  OTPInputWidget,
  VerificationStatusBadge,
  CodeDisplayCard,
  VerificationSuccessDialog,
  VerificationFailureDialog,
} from '../../components/VerificationComponents';

const OrderBatchPickupDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { batchId, type: initialType } = route.params;
  const { batches, rejectProductItem, rerouteBatchToHub, finalizePickup, finalizeDrop } = useOrderManagement();
  const { currentStep, isActive } = useOnboarding();

  const [rejectingProductId, setRejectingProductId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Code-based Handover state
  const [showVerificationSheet, setShowVerificationSheet] = useState(false);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '']);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [failureMessage, setFailureMessage] = useState('');

  const modalScrollRef = useRef<ScrollView>(null);

  const handleVerifyPickupCode = async () => {
    if (!batch) return;
    const entered = otpCode.join('');
    if (entered === '1234') {
      setShowVerificationSheet(false);
      setSuccessMessage('Pickup Verified Successfully');
      setShowSuccessDialog(true);
      try {
        await finalizePickup(batch.id);
      } catch (err) {
        console.error('Error finalizing pickup:', err);
      }
    } else {
      setFailureMessage('Invalid Verification Code');
      setShowFailureDialog(true);
    }
  };

  const handleVerifyDeliveryCode = async () => {
    if (!batch) return;
    const entered = otpCode.join('');
    if (entered === '5678') {
      setShowVerificationSheet(false);
      setSuccessMessage('Delivery Verified Successfully');
      setShowSuccessDialog(true);
      try {
        await finalizeDrop(batch.id);
      } catch (err) {
        console.error('Error finalizing drop:', err);
      }
    } else {
      setFailureMessage('Invalid Verification Code');
      setShowFailureDialog(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    if (type === 'pickup') {
      navigation.navigate('AcceptedOrders', { activeTab: 'drop' });
    } else {
      navigation.replace('OrderBatchCompleted');
    }
  };

  const scrollRef = useRef<ScrollView>(null);

  const foundBatch = batches.find((b) => b.id === batchId) ||
    (batchId.startsWith('pickup-')
      ? batches.find((b) => b.id === `drop-${batchId.replace('pickup-', '')}`)
      : batches.find((b) => b.id === `pickup-${batchId.replace('drop-', '')}`));

  const [localBatch, setLocalBatch] = useState<BatchOrder | undefined>(foundBatch);

  useEffect(() => {
    if (foundBatch) {
      setLocalBatch(foundBatch);
    }
  }, [foundBatch]);

  const batch = localBatch;

  // Preserve the original context type so the user stays in the pickup/drop flow they navigated from
  const type = initialType;



  // Unified visual scroll choreography: scrolls to top for Map steps, scrolls to bottom for Capture steps
  useEffect(() => {
    if (!isActive || !scrollRef.current) return;

    let timer: any;
    if (currentStep?.id === 'upload_proof' || currentStep?.id === 'upload_proof_drop') {
      timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 400); // Wait for transition animation
    } else if (currentStep?.id === 'navigation_map' || currentStep?.id === 'navigation_map_drop') {
      timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 400);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActive, currentStep]);

  if (!batch) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title={t('orders.pickup_detail', { defaultValue: 'Pickup Detail' })} subtitle={t('orders.batch_not_found', { defaultValue: 'Order Batch Not Found' })} showBackButton={true} />
        <View style={styles.notFoundBox}>
          <Text style={styles.notFoundText}>{t('orders.batch_not_active', { defaultValue: 'Requested batch record is no longer active.' })}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleCloseModal = () => {
    setRejectingProductId(null);
    setRejectReasonText('');
  };

  const handleConfirmReject = () => {
    if (!rejectingProductId) return;
    if (!rejectReasonText.trim()) return;
    const finalReason = rejectReasonText.trim();

    if (type === 'drop') {
      rerouteBatchToHub(batch.id, rejectingProductId, finalReason);
      handleCloseModal();
    } else {
      rejectProductItem(batch.id, rejectingProductId, type || 'pickup', finalReason);
      handleCloseModal();
      navigation.goBack();
    }
  };

  const handleNavigate = () => {
    const queryAddress = [
      displayContact.address,
      (displayContact as any).village,
      (displayContact as any).pincode,
      'Maharashtra',
      'India'
    ].filter(Boolean).join(', ');

    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryAddress)}`
    );
  };

  const reasonChips = type === 'pickup'
    ? [
      t('orders.reason_item_broken', { defaultValue: 'Package item broken' }),
      t('orders.reason_tolerance_error', { defaultValue: 'Weight tolerance error' }),
      t('orders.reason_tag_stripped', { defaultValue: 'Security tag stripped' }),
    ]
    : [
      t('orders.reason_missing_parcel', { defaultValue: 'Item missing in source parcel' }),
      t('orders.reason_consignee_absent', { defaultValue: 'Consignee absent' }),
      t('orders.reason_label_mismatch', { defaultValue: 'Packaging label mismatch' }),
    ];

  const displayProducts = type === 'drop'
    ? batch.products.filter(p => p.legType === 'drop' || p.status === 'picked' || p.status === 'completed')
    : type === 'pickup'
      ? (batch.flowType === 'gmu_to_shg'
        ? batch.products.filter(p => p.legType === 'drop')
        : batch.products.filter(p => p.legType === 'pickup'))
      : batch.products;

  const isPickupLegCompleted = batch.status === 'PICKUP_COMPLETED' || batch.status === 'DROP_COMPLETED';
  const isDropLegCompleted = batch.status === 'DROP_COMPLETED';
  const isCurrentLegCompleted = type === 'pickup' ? isPickupLegCompleted : isDropLegCompleted;
  const isBatchRejected = batch.status === 'rejected';

  const canConfirm = displayProducts.length > 0 && !isCurrentLegCompleted && !isBatchRejected;

  // Contextual Contact Logic matching precisely with user requirements
  const isPickup = type === 'pickup';
  const isHubPoint = isPickup
    ? (batch.pickupPointName === 'Gadhinglaj Hub' || batch.pickupPointName === 'Central Hub GMU')
    : (batch.dropPointName === 'Gadhinglaj Hub' || batch.dropPointName === 'Central Hub GMU');

  const displayContact = isHubPoint ? HUB_CONTACT : batch.shgContact;
  const isSHG = !isHubPoint;
  const isRTOBatch = batch.products.some(p => (p as any).isRTO);

  const sectionTitle = type === 'pickup'
    ? t('orders.items_for_collection', { defaultValue: 'Items for Collection' })
    : type === 'drop'
      ? t('orders.items_for_handover', { defaultValue: 'Items for Handover' })
      : t('orders.associated_shipment_products', { defaultValue: 'Associated Shipment Products' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={type === 'pickup' ? t('orders.collection_details', { defaultValue: 'Collection Details' }) : t('orders.delivery_details', { defaultValue: 'Delivery Details' })}
        subtitle={`${t('orders.batch', { defaultValue: 'Batch' })} ${batch.id} • ${batch.areaName}`}
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Master Summary Card */}
        <LinearGradient
          colors={[Colors.primary, '#065F46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.masterSummaryCard}
        >
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryIconBox}>
              <Package size={scale(18)} color="#FFFFFF" />
            </View>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.summaryBatchId} numberOfLines={1} adjustsFontSizeToFit>{batch.id}</Text>
              <Text style={styles.summaryAreaTag}>{batch.areaName} {t('orders.transit', { defaultValue: 'Transit' })}</Text>
            </View>
            <View style={styles.summaryStatusPill}>
              <Text style={styles.summaryStatusText}>{t('orders.status_' + batch.status.toLowerCase(), { defaultValue: batch.status }).toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <WalkthroughElement stepId={type === 'pickup' ? 'navigation_map' : 'navigation_map_drop'}>
            <View style={styles.routeDisplayRow}>
              <View style={styles.routePointCol}>
                <Text style={styles.routeLabel}>{t('orders.from', { defaultValue: 'FROM' })}</Text>
                <Text style={styles.routeNameText} numberOfLines={1}>
                  {type === 'pickup' ? batch.pickupPointName : (batch.flowType === 'shg_to_gmu' ? batch.pickupPointName : 'Gadhinglaj Hub')}
                </Text>
              </View>
              <View style={styles.routeArrowBox}>
                <ArrowRight size={scale(16)} color="rgba(255, 255, 255, 0.6)" />
              </View>
              <View style={styles.routePointCol}>
                <Text style={styles.routeLabel}>{t('orders.to', { defaultValue: 'TO' })}</Text>
                <Text style={styles.routeNameText} numberOfLines={1}>
                  {type === 'pickup' ? (batch.flowType === 'shg_to_gmu' ? 'Gadhinglaj Hub' : batch.dropPointName) : batch.dropPointName}
                </Text>
              </View>
            </View>
          </WalkthroughElement>

          <View style={styles.metricsStrip}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValueText}>{batch.totalQty}</Text>
              <Text style={styles.metricLabelText}>{t('orders.items', { defaultValue: 'Items' })}</Text>
            </View>
            <View style={styles.metricLine} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValueText}>{batch.totalWeight}</Text>
              <Text style={styles.metricLabelText}>{t('orders.total_weight', { defaultValue: 'Total Weight' })}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Section A: Contact Master Box */}
        <View style={styles.masterSectionBox}>
          <View style={styles.boxHeaderRow}>
            <View style={styles.boxHeaderLeft}>
              <MapPin size={scale(18)} color={Colors.primary} strokeWidth={2.5} />
              <Text style={styles.boxTitleText}>{isSHG ? t('orders.shg_contact_detail', { defaultValue: 'SHG Contact Detail' }) : t('orders.gmu_contact_detail', { defaultValue: 'GMU Contact Detail' })}</Text>
            </View>
            <TouchableOpacity style={styles.contactActionBtn}>
              <Phone size={scale(14)} color={Colors.primary} />
              <Text style={styles.contactActionText}>{t('orders.call', { defaultValue: 'Call' })}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.boxContentPadding}>
            {isRTOBatch && (
              <View style={styles.contactUpdateNote}>
                <Info size={scale(14)} color="#D97706" />
                <Text style={styles.contactUpdateNoteText}>
                  {t('orders.note_address_updated', { defaultValue: 'Note: Address updated to return hub.' })}
                </Text>
              </View>
            )}
            {(() => {
              const addressPincode = displayContact.address?.match(/\d{6}/)?.[0];
              const resolvedVillage = (displayContact as any).village || batch.areaName || 'Nesari';
              const resolvedPincode = (displayContact as any).pincode || addressPincode || '416504';
              return (
                <View style={styles.contactGrid}>
                  <View style={styles.contactGridItem}>
                    <View style={styles.contactIconCircle}>
                      <User size={scale(14)} color={Colors.primary} />
                    </View>
                    <View style={styles.contactDetailCol}>
                      <Text style={styles.contactItemLabel}>{t('orders.person_name', { defaultValue: 'Person Name' })}</Text>
                      <Text style={styles.contactItemValue} numberOfLines={1}>{displayContact.name}</Text>
                    </View>
                  </View>

                  <View style={styles.contactGridItem}>
                    <View style={styles.contactIconCircle}>
                      <Phone size={scale(14)} color={Colors.primary} />
                    </View>
                    <View style={styles.contactDetailCol}>
                      <Text style={styles.contactItemLabel}>{t('orders.phone_number', { defaultValue: 'Phone Number' })}</Text>
                      <Text style={styles.contactItemValue} numberOfLines={1}>{displayContact.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.contactGridItem}>
                    <View style={styles.contactIconCircle}>
                      <MapPin size={scale(14)} color={Colors.primary} />
                    </View>
                    <View style={styles.contactDetailCol}>
                      <Text style={styles.contactItemLabel}>{t('orders.village', { defaultValue: 'Village' })}</Text>
                      <Text style={styles.contactItemValue} numberOfLines={1}>{resolvedVillage}</Text>
                    </View>
                  </View>

                  <View style={styles.contactGridItem}>
                    <View style={styles.contactIconCircle}>
                      <MapPin size={scale(14)} color={Colors.primary} />
                    </View>
                    <View style={styles.contactDetailCol}>
                      <Text style={styles.contactItemLabel}>{t('orders.pincode', { defaultValue: 'Pincode' })}</Text>
                      <Text style={styles.contactItemValue} numberOfLines={1}>{resolvedPincode}</Text>
                    </View>
                  </View>

                  <View style={[styles.contactGridItem, { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: scale(10) }}>
                      <View style={styles.contactIconCircle}>
                        <MapPin size={scale(14)} color={Colors.primary} />
                      </View>
                      <View style={styles.contactDetailCol}>
                        <Text style={styles.contactItemLabel}>{t('orders.full_address', { defaultValue: 'Full Address' })}</Text>
                        <Text style={styles.contactItemValue} numberOfLines={2}>{displayContact.address}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.addressNavigateBtn} onPress={handleNavigate}>
                      <Text style={styles.addressNavigateBtnText}>{t('orders.navigate', { defaultValue: 'Navigate' })}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Section B: Items Master Box */}
        <View style={styles.masterSectionBox}>
          <View style={styles.boxHeaderRow}>
            <View style={styles.boxHeaderLeft}>
              <Package size={scale(18)} color={Colors.primary} strokeWidth={2.5} />
              <Text style={styles.boxTitleText}>{sectionTitle}</Text>
            </View>
            <View style={styles.boxHeaderRight}>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{displayProducts.length} {t('orders.tasks', { defaultValue: 'Tasks' })}</Text>
              </View>
              <View style={styles.headerChevronBox}>
                <ChevronDown size={scale(16)} color={Colors.textSecondary} />
              </View>
            </View>
          </View>

          <View style={styles.boxContentPadding}>
            <View style={styles.productsWrapper}>
              {displayProducts.map((product) => {
                const isPicked = product.status === 'picked';
                const isCompleted = product.status === 'completed';
                const isRejected = product.status === 'rejected';
                const isActionDone = type === 'pickup' ? (isPicked || isCompleted) : isCompleted;

                return (
                  <View
                    key={product.id}
                    style={[
                      styles.premiumProductCard,
                      (isRejected || isBatchRejected) && { borderColor: '#EF4444' },
                      (product as any).isRTO && { borderColor: '#F59E0B' },
                    ]}
                  >
                    <View style={styles.productSideAccent} />
                    <View style={styles.productBody}>
                      <View style={styles.productHeaderRow}>
                        <View style={styles.productTitleBox}>
                          <Text style={styles.productOrderId}>#{product.id.split('-').pop()}</Text>
                          {isRejected || isBatchRejected ? (
                            <View style={[styles.legBadge, { backgroundColor: '#FEF2F2' }]}>
                              <Text style={[styles.legBadgeText, { color: '#DC2626' }]}>
                                {t('orders.rejected', { defaultValue: 'Rejected' })}
                              </Text>
                            </View>
                          ) : (product as any).isRTO ? (
                            <View style={[styles.legBadge, { backgroundColor: '#FEF3C7' }]}>
                              <Text style={[styles.legBadgeText, { color: '#D97706' }]}>
                                {t('orders.return_to_hub', { defaultValue: 'Return to Hub' })}
                              </Text>
                            </View>
                          ) : isActionDone ? (
                            <View
                              style={[
                                styles.legBadge,
                                type === 'pickup' ? { backgroundColor: '#EFF6FF' } : { backgroundColor: '#ECFDF5' }
                              ]}
                            >
                              <Text
                                style={[
                                  styles.legBadgeText,
                                  type === 'pickup' ? { color: '#2563EB' } : { color: '#059669' }
                                ]}
                              >
                                {type === 'pickup' ? t('orders.picked', { defaultValue: 'Picked' }) : t('orders.delivered', { defaultValue: 'Delivered' })}
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.legBadge,
                                type === 'drop' && { backgroundColor: '#ECFDF5' }
                              ]}
                            >
                              <Text
                                style={[
                                  styles.legBadgeText,
                                  type === 'drop' && { color: '#059669' }
                                ]}
                              >
                                {type === 'drop' ? t('orders.drop_orders', { defaultValue: 'Drop Order' }) : t('orders.pickup_orders', { defaultValue: 'Pickup Order' })}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <Text style={styles.productNameText} numberOfLines={1}>{product.name}</Text>

                      <View style={styles.specsRow}>
                        <Text style={styles.specInlineText}>{product.qty} {t('orders.items', { defaultValue: 'items' })} • {product.weight}</Text>
                      </View>

                      {isRejected && product.rejectReason && (
                        <View style={styles.rejectNarrative}>
                          <XCircle size={scale(14)} color="#DC2626" style={{ marginTop: scale(2) }} />
                          <Text style={styles.rejectText}>{product.rejectReason}</Text>
                        </View>
                      )}

                      {(product as any).isRTO && (
                        <View style={styles.rtoNarrative}>
                          <MapPin size={scale(14)} color="#D97706" style={{ marginTop: scale(2) }} />
                          <Text style={styles.rtoText}>
                            {t('orders.address_updated_note', { defaultValue: 'Address updated: Return the picked product to the hub.' })}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.sideActionStrip}>
                      {isBatchRejected ? (
                        <View style={styles.successIconBox}>
                          <XCircle size={scale(24)} color="#EF4444" strokeWidth={2.5} />
                        </View>
                      ) : isCurrentLegCompleted ? (
                        <View style={styles.successIconBox}>
                          <CheckCircle size={scale(24)} color="#10B981" strokeWidth={2.5} />
                        </View>
                      ) : isRejected ? (
                        <View style={styles.successIconBox}>
                          <XCircle size={scale(24)} color="#EF4444" />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionIconButton, styles.rejectIconButton]}
                          onPress={() => setRejectingProductId(product.id)}
                        >
                          <Text style={styles.btnTextRed}>{t('orders.reject', { defaultValue: 'Reject' })}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {isBatchRejected && (
          <View style={styles.rejectedFooterContainer}>
            <View style={styles.rejectedBottomBanner}>
              <View style={styles.rejectedBannerHeader}>
                <XCircle size={scale(18)} color="#DC2626" strokeWidth={2.5} />
                <Text style={styles.rejectedBannerTitle}>
                  {t('orders.rejected_reason', { defaultValue: 'Rejection Reason' })}
                </Text>
              </View>
              <Text style={styles.rejectedBannerText}>
                {batch.rejectReason || t('orders.standard_non_compliance', { defaultValue: 'Standard non-compliance' })}
              </Text>
            </View>
          </View>
        )}

        {/* Verification Flow Button or Status Indicators */}
        <View style={styles.inlineFooterContainer}>
          {isCurrentLegCompleted ? (
            <VerificationStatusBadge status={type === 'pickup' ? 'pickup_verified' : 'delivery_verified'} />
          ) : isBatchRejected ? (
            <View style={styles.rejectedBannerContainer}>
              <Text style={styles.rejectedBannerTextHeader}>Batch Rejected</Text>
            </View>
          ) : type === 'pickup' ? (
            <GenerateCodeButton
              text="Generate Pickup Code"
              onPress={() => {
                setOtpCode(['', '', '', '']);
                setShowVerificationSheet(true);
              }}
            />
          ) : (
            <EnterCodeButton
              text="Enter Delivery Code"
              onPress={() => {
                setOtpCode(['', '', '', '']);
                setShowVerificationSheet(true);
              }}
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!rejectingProductId}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView
              ref={modalScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: verticalScale(20) }}
            >
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{t('orders.reject_item', { defaultValue: 'Reject Item' })}</Text>
                <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                  <X size={scale(20)} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>{t('orders.provide_reject_reason', { defaultValue: 'Please provide a reason for rejecting this item action.' })}</Text>

              <View style={styles.chipsContainer}>
                {reasonChips.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.reasonChip, rejectReasonText === chip && styles.reasonChipSelected]}
                    onPress={() => {
                      setRejectReasonText(prev => prev === chip ? '' : chip);
                    }}
                  >
                    <Text style={[styles.reasonChipText, rejectReasonText === chip && styles.reasonChipTextSelected]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View>
                <TextInput
                  style={styles.reasonInput}
                  placeholder={t('orders.or_enter_custom_reason', { defaultValue: 'Or enter custom reason...' })}
                  placeholderTextColor={Colors.textPlaceholder}
                  multiline
                  numberOfLines={3}
                  value={rejectReasonText}
                  onChangeText={setRejectReasonText}
                />

                <TouchableOpacity
                  style={[
                    styles.confirmRejectBtn,
                    !rejectReasonText.trim() && styles.btnDisabled
                  ]}
                  onPress={handleConfirmReject}
                  disabled={!rejectReasonText.trim()}
                >
                  <Text style={styles.confirmRejectText}>{t('orders.confirm_rejection', { defaultValue: 'Confirm Rejection' })}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Verification Bottom Sheet Modal */}
      <VerificationBottomSheet
        visible={showVerificationSheet}
        onClose={() => setShowVerificationSheet(false)}
        title={type === 'pickup' ? 'Pickup Verification Code' : 'Verify Delivery'}
        subtitle={
          type === 'pickup'
            ? 'Generate a verification code and share it with Hub to confirm pickup.'
            : 'Enter the 4-digit delivery code generated by SHG.'
        }
      >
        {type === 'pickup' ? (
          <View style={{ gap: verticalScale(16) }}>
            <CodeDisplayCard code="1234" />
            <View style={styles.demoEntryDivider} />
            <Text style={styles.demoEntryLabel}>Hub Code Entry (Demo Mode)</Text>
            <OTPInputWidget code={otpCode} onChangeCode={setOtpCode} />
            <TouchableOpacity
              style={styles.verifyCodeActionBtn}
              onPress={handleVerifyPickupCode}
            >
              <Text style={styles.verifyCodeActionBtnText}>Verify Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: verticalScale(16) }}>
            <OTPInputWidget code={otpCode} onChangeCode={setOtpCode} />
            <TouchableOpacity
              style={styles.verifyCodeActionBtn}
              onPress={handleVerifyDeliveryCode}
            >
              <Text style={styles.verifyCodeActionBtnText}>Verify Delivery</Text>
            </TouchableOpacity>
          </View>
        )}
      </VerificationBottomSheet>

      {/* Handover Success and Failure Dialogs */}
      <VerificationSuccessDialog
        visible={showSuccessDialog}
        message={successMessage}
        onClose={handleSuccessClose}
      />

      <VerificationFailureDialog
        visible={showFailureDialog}
        message={failureMessage}
        onClose={() => setShowFailureDialog(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: scale(20), paddingTop: verticalScale(12), paddingBottom: verticalScale(120) },
  notFoundBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24) },
  notFoundText: { fontFamily: Fonts.bold, fontSize: moderateScale(15), color: Colors.textPlaceholder },
  masterSummaryCard: { borderRadius: moderateScale(20), padding: moderateScale(16), marginBottom: verticalScale(16), elevation: 6 },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(12) },
  summaryIconBox: { width: scale(36), height: scale(36), borderRadius: scale(12), backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryTitleCol: { flex: 1, marginLeft: scale(10), marginRight: scale(20) },
  summaryBatchId: { fontFamily: Fonts.extraBold, fontSize: moderateScale(16), color: '#FFFFFF' },
  summaryAreaTag: { fontFamily: Fonts.bold, fontSize: moderateScale(11), color: 'rgba(255, 255, 255, 0.7)' },
  summaryStatusPill: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8) },
  summaryStatusText: { fontFamily: Fonts.bold, fontSize: moderateScale(10), color: '#FFFFFF', letterSpacing: 0.5 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginBottom: verticalScale(12) },
  routeDisplayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: verticalScale(14) },
  routePointCol: { flex: 1 },
  routeLabel: { fontFamily: Fonts.bold, fontSize: moderateScale(9), color: 'rgba(255, 255, 255, 0.5)', marginBottom: verticalScale(2) },
  routeNameText: { fontFamily: Fonts.extraBold, fontSize: moderateScale(14), color: '#FFFFFF' },
  routeArrowBox: { width: scale(40), alignItems: 'center' },
  metricsStrip: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: scale(10), paddingVertical: verticalScale(10) },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValueText: { fontFamily: Fonts.extraBold, fontSize: moderateScale(15), color: '#FFFFFF' },
  metricLabelText: { fontFamily: Fonts.bold, fontSize: moderateScale(10), color: 'rgba(255, 255, 255, 0.6)' },
  metricLine: { width: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  masterSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(16),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  boxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  boxHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  boxHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  boxTitleText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
  },
  headerChevronBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxContentPadding: {
    padding: moderateScale(16),
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  contactActionText: { fontFamily: Fonts.bold, fontSize: moderateScale(12), color: Colors.primary },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), rowGap: verticalScale(14) },
  contactGridItem: { width: '48%', flexDirection: 'row', alignItems: 'center' },
  contactIconCircle: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  contactDetailCol: { flex: 1, marginLeft: scale(10) },
  contactItemLabel: { fontFamily: Fonts.bold, fontSize: moderateScale(10), color: Colors.textSecondary, marginBottom: verticalScale(2) },
  contactItemValue: { fontFamily: Fonts.extraBold, fontSize: moderateScale(12), color: Colors.textPrimary },

  itemCountBadge: { backgroundColor: '#F7FEE7', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8), borderWidth: 1, borderColor: '#D9F99D' },
  itemCountText: { fontFamily: Fonts.bold, fontSize: moderateScale(11), color: '#3F6212' },

  productsWrapper: { gap: verticalScale(12) },
  premiumProductCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(18),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  productSideAccent: { width: scale(4), height: '100%' },
  productBody: { flex: 1, padding: moderateScale(12) },
  productHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: verticalScale(8) },
  productTitleBox: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  productOrderId: { fontFamily: Fonts.extraBold, fontSize: moderateScale(14), color: Colors.primary },
  legBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: scale(6), paddingVertical: verticalScale(2), borderRadius: scale(4) },
  legBadgeText: { fontFamily: Fonts.bold, fontSize: moderateScale(9), color: '#2563EB' },
  productNameText: { fontFamily: Fonts.bold, fontSize: moderateScale(14), color: Colors.textPrimary, marginBottom: verticalScale(4) },
  statusBadge: { paddingHorizontal: scale(6), paddingVertical: verticalScale(2), borderRadius: scale(4) },
  statusBadgeText: { fontFamily: Fonts.bold, fontSize: moderateScale(9), textTransform: 'uppercase' },
  specsRow: { flexDirection: 'row', alignItems: 'center' },
  specInlineText: { fontFamily: Fonts.medium, fontSize: moderateScale(12), color: Colors.textSecondary },

  proofContainer: { marginTop: verticalScale(10), borderRadius: scale(10), overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  proofImage: { width: '100%', height: verticalScale(100) },
  rejectNarrative: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(6), marginTop: verticalScale(10), backgroundColor: '#FEF2F2', padding: scale(6), borderRadius: scale(6) },
  rejectText: { fontFamily: Fonts.bold, fontSize: moderateScale(10), color: '#DC2626', flex: 1 },
  rtoNarrative: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(6), marginTop: verticalScale(10), backgroundColor: '#FEF3C7', padding: scale(6), borderRadius: scale(6) },
  rtoText: { fontFamily: Fonts.bold, fontSize: moderateScale(10), color: '#D97706', flex: 1 },

  sideActionStrip: { paddingRight: scale(12), paddingLeft: scale(4), alignItems: 'center', justifyContent: 'center', gap: verticalScale(14) },
  actionIconButton: { flexDirection: 'row', gap: scale(4), paddingHorizontal: scale(10), paddingVertical: verticalScale(6), borderRadius: scale(6), backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', minWidth: scale(65) },
  rejectIconButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    minWidth: scale(70),
  },
  btnTextWhite: { fontFamily: Fonts.bold, fontSize: moderateScale(10.5), color: '#FFFFFF' },
  btnTextRed: { fontFamily: Fonts.bold, fontSize: moderateScale(12), color: '#DC2626' },
  successIconBox: { alignItems: 'center', justifyContent: 'center' },
  capturedButtonReplacementImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(8),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', paddingHorizontal: scale(20) },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: moderateScale(24), padding: moderateScale(24), maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: verticalScale(8) },
  modalTitle: { fontFamily: Fonts.extraBold, fontSize: moderateScale(20), color: Colors.textPrimary },
  closeBtn: { padding: scale(4) },
  modalSubtitle: { fontFamily: Fonts.medium, fontSize: moderateScale(14), color: Colors.textSecondary, marginBottom: verticalScale(20) },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: verticalScale(20) },
  reasonChip: { backgroundColor: '#F8FAFC', paddingHorizontal: scale(14), paddingVertical: verticalScale(10), borderRadius: scale(12), borderWidth: 1.5, borderColor: '#F1F5F9' },
  reasonChipSelected: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  reasonChipText: { fontFamily: Fonts.bold, fontSize: moderateScale(12), color: Colors.textSecondary },
  reasonChipTextSelected: { color: '#DC2626' },
  reasonInput: { backgroundColor: '#F8FAFC', borderRadius: scale(16), padding: scale(16), fontFamily: Fonts.medium, fontSize: moderateScale(14), color: Colors.textPrimary, borderWidth: 1.5, borderColor: '#F1F5F9', textAlignVertical: 'top', marginBottom: verticalScale(24) },
  confirmRejectBtn: { backgroundColor: '#EF4444', height: verticalScale(54), borderRadius: scale(16), alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { backgroundColor: '#CBD5E1' },
  confirmRejectText: { fontFamily: Fonts.bold, fontSize: moderateScale(15), color: '#FFFFFF' },
  addressNavigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  addressNavigateBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  retakeIconButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    paddingVertical: verticalScale(3),
    paddingHorizontal: scale(6),
    borderRadius: scale(6),
    minWidth: scale(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextRetake: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: '#2563EB',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderTopWidth: 1.5,
    borderTopColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inlineFooterContainer: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(4),
  },
  primaryConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    height: verticalScale(54),
    borderRadius: scale(16),
    elevation: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#073318',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryConfirmBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
  bgPickup: {
    backgroundColor: '#073318', // Brand Deep Green
  },
  bgDrop: {
    backgroundColor: '#073318', // Brand Deep Green
  },
  rejectedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  rejectedBannerTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14),
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rejectedBannerText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#991B1B',
    lineHeight: 18,
  },
  rejectedBottomBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderLeftWidth: scale(4),
    borderLeftColor: '#DC2626',
    borderRadius: scale(12),
    padding: moderateScale(16),
    gap: verticalScale(8),
    elevation: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  rejectedFooterContainer: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(32), // Extra bottom spacing to cleanly prevent any overlay clipping!
  },


  contactUpdateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  contactUpdateNoteText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
    color: '#D97706',
  },
  demoEntryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: verticalScale(10),
  },
  demoEntryLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#64748B',
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  verifyCodeActionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(14),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(8),
  },
  verifyCodeActionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#FFFFFF',
  },
  rejectedBannerContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  rejectedBannerTextHeader: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#DC2626',
  },
});

export default OrderBatchPickupDetailScreen;

