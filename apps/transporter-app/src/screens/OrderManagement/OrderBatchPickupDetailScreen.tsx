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
  Animated,
  Alert,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, FlowType, HUB_CONTACT, BatchOrder } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale, cleanPersonName } from '../../utils/responsive';
import { Check, CheckCircle, XCircle, Package, MapPin, Phone, User, X, ArrowRight, ChevronDown, ChevronRight, Info, AlertTriangle } from 'lucide-react-native';
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
  const { batches, rejectProductItem, rerouteBatchToHub, finalizePickup, finalizeDrop, generateDropHandoverCode, showToast, refreshBatchesList } = useOrderManagement();
  const { currentStep, isActive } = useOnboarding();

  const [rejectingProductId, setRejectingProductId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [orderParcels, setOrderParcels] = useState<any[]>([]);
  const [activeScanningParcel, setActiveScanningParcel] = useState<any>(null);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<'scanning' | 'success'>('scanning');
  const scanLaserAnim = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Code-based Handover state
  const [showVerificationSheet, setShowVerificationSheet] = useState(false);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '']);
  const [generatedCode, setGeneratedCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [failureMessage, setFailureMessage] = useState('');
  const [verifiedProductIds, setVerifiedProductIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedGmuDropProductIds, setSelectedGmuDropProductIds] = useState<string[]>([]);



  // Scanner state variables
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannerError, setScannerError] = useState('');
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showScannerModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [showScannerModal]);

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const handleVerifyScannedBarcode = async () => {
    if (!batch) return;
    const expected = batch.handoverCode || '1234';
    if (manualBarcode.trim() !== expected) {
      setScannerError('Barcode mismatch! Please scan or enter the correct barcode.');
      return;
    }

    setScannerError('');
    setShowScannerModal(false);
    setIsFinalizing(true);
    try {
      await finalizePickup(batch.id, expected);
      setSuccessMessage('Pickup Completed Successfully');
      setShowSuccessDialog(true);
    } catch (err: any) {
      console.error('Error finalizing GMU batch:', err);
      setFailureMessage(err.response?.data?.message || err.message || 'Pickup failed');
      setShowFailureDialog(true);
    } finally {
      setIsFinalizing(false);
    }
  };

  const modalScrollRef = useRef<ScrollView>(null);

  const handleVerifyPickupCode = async () => {
    if (!batch || !selectedProductId) return;
    const selectedProd = batch.products.find(p => p.id === selectedProductId);
    const expectedCode = selectedProd?.verificationCode || '1234';
    setVerifiedCode(expectedCode);

    // Mark ALL products in the batch as verified
    const allProdIds = batch.products.map(p => p.id);
    setVerifiedProductIds(allProdIds);

    setShowVerificationSheet(false);
    showToast('Batch verified successfully', 'success');
  };

  const handleVerifyDeliveryCode = async () => {
    if (!batch || !selectedProductId) return;
    const entered = otpCode.join('');
    const expectedCode = batch.handoverCode || '1234';
    if (entered === expectedCode) {
      setVerifiedCode(entered);

      // Mark ALL products in the batch as verified
      const allProdIds = batch.products.map(p => p.id);
      setVerifiedProductIds(allProdIds);

      setShowVerificationSheet(false);
      showToast('Batch verified successfully', 'success');
    } else {
      setFailureMessage('Invalid Verification Code');
      setShowFailureDialog(true);
    }
  };

  const handleQrScanSimulated = () => {
    // Find the first matching parcel that is not yet verified
    const pendingParcel = (displayProducts || [])
      .map(p => orderParcels.find(op => op.productId === (p as any).productId))
      .find(op => op && op.parcelStatus !== 'VERIFIED');
    
    if (pendingParcel) {
      setActiveScanningParcel(pendingParcel);
      setScannerModalVisible(true);
    } else {
      Alert.alert("All Products Verified", "There are no pending products left to verify in this batch.");
    }
  };

  const handleFinalBatchConfirm = async () => {
    if (!batch) return;
    setIsFinalizing(true);
    try {
      const codeToSubmit = type === 'pickup' ? (batch.handoverCode || '1234') : (verifiedCode || '1234');
      if (type === 'pickup') {
        await finalizePickup(batch.id, codeToSubmit);
        setSuccessMessage('Pickup Completed Successfully');
      } else {
        await finalizeDrop(batch.id, codeToSubmit);
        setSuccessMessage('Delivery Completed Successfully');
      }
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Error finalizing GMU batch:', err);
    } finally {
      setIsFinalizing(false);
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

  const handleGmuConfirm = async () => {
    if (!batch) return;
    setIsFinalizing(true);
    try {
      if (type === 'pickup') {
        await finalizePickup(batch.id);
        setSuccessMessage('Pickup Completed Successfully');
      } else {
        await finalizeDrop(batch.id);
        setSuccessMessage('Delivery Completed Successfully');
      }
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Error finalizing GMU batch:', err);
    } finally {
      setIsFinalizing(false);
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
      if (foundBatch.handoverCode) {
        setGeneratedCode(foundBatch.handoverCode);
      }
    }
  }, [foundBatch]);

  // Poll server for fresh batch details (like handover code) while screen is open
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBatchesList().catch(err => console.log('Error refreshing batches list in details:', err));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const batch = localBatch;



  const fetchOrderParcels = async () => {
    if (!batch || !batch.displayId) return;
    try {
      let res = await api.get(`/qr/order/${batch.displayId}`);
      if (!res.data || res.data.length === 0) {
        try {
          await api.post('/qr/generate', { orderId: batch.displayId });
          res = await api.get(`/qr/order/${batch.displayId}`);
        } catch (genErr) {
          console.warn("Auto-generating QR codes failed:", genErr);
        }
      }
      if (res.data) {
        setOrderParcels(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch parcels for order:", err);
    }
  };

  useEffect(() => {
    fetchOrderParcels();
  }, [batch?.displayId]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (scannerModalVisible) {
      scanLaserAnim.setValue(0);
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLaserAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLaserAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      scanLaserAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [scannerModalVisible]);

  useEffect(() => {
    if (scannerModalVisible) {
      setScanned(false);
      setScanningStatus('scanning');
      if (!permission || !permission.granted) {
        requestPermission();
      }
    }
  }, [scannerModalVisible, permission]);

  const handleBarcodeScanned = async ({ type: qrType, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScanningStatus('success');

    // Play haptic feedback
    try {
      Vibration.vibrate(100);
    } catch (e) {
      console.log('Vibration error:', e);
    }

    try {
      let parcelId = '';
      let verificationToken = '';

      if (data.trim().startsWith('{')) {
        const parsed = JSON.parse(data.trim());
        parcelId = parsed.parcelId;
        verificationToken = parsed.verificationToken;
      } else {
        const parts = data.trim().split(/\s+/);
        if (parts.length >= 2) {
          parcelId = parts[0];
          verificationToken = parts[1];
        }
      }

      if (!parcelId || !verificationToken) {
        Alert.alert('Invalid QR Code', 'This QR code does not contain a valid parcel ID and verification token.');
        setScanned(false);
        setScanningStatus('scanning');
        return;
      }

      // Verify that the scanned parcel belongs to the product we clicked on
      if (activeScanningParcel && activeScanningParcel.parcelId !== parcelId) {
        Alert.alert(
          'Wrong Product Scanned',
          `Please scan the QR code specifically for "${activeScanningParcel.productName || 'this item'}".`
        );
        setScanned(false);
        setScanningStatus('scanning');
        return;
      }

      const res = await api.post('/qr/verify', {
        parcelId,
        verificationToken,
        userRole: 'TRANSPORTER',
        legType: type === 'drop' ? 'delivery' : 'pickup'
      });

      showToast(res.data?.message || 'Product verified successfully via QR!', 'success');
      await fetchOrderParcels();
      if (refreshBatchesList) {
        await refreshBatchesList();
      }

      setTimeout(() => {
        setScannerModalVisible(false);
        setActiveScanningParcel(null);
        setScanned(false);
      }, 1200);

    } catch (err: any) {
      console.error('Verification error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to verify QR code.';
      Alert.alert('Verification Failed', msg);
      setScanned(false);
      setScanningStatus('scanning');
    }
  };

  const laserTranslateY = scanLaserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

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

    const finalReason = rejectReasonText.trim();

    if (!finalReason) return;

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
  const isParcelVerifiedForTransporter = (product: any) => {
    if (isCurrentLegCompleted) return true;
    const matchingParcel = orderParcels.find((p: any) => p.productId === (product as any).productId);
    if (!matchingParcel) return false;
    
    const status = matchingParcel.parcelStatus;
    const isPickupFlow = batch.flowType !== 'gmu_to_shg';
    
    if (type === 'pickup') {
      if (isPickupFlow) {
        // Step 3: Transporter pickup from SHG
        return status === 'IN_TRANSIT_TO_HUB' || 
               status === 'HUB_RECEIVED' || 
               status === 'DELIVERED' || 
               status === 'COMPLETED' || 
               status === 'VERIFIED';
      } else {
        // Step 7: Transporter pickup from GMU Hub
        return status === 'IN_TRANSIT_TO_BUYER' || 
               status === 'PARCEL_AT_DROP_SHG' || 
               status === 'DELIVERED' || 
               status === 'COMPLETED' || 
               status === 'VERIFIED';
      }
    } else {
      if (isPickupFlow) {
        // Step 4: Transporter delivery to GMU Hub
        return status === 'HUB_RECEIVED' || 
               status === 'DELIVERED' || 
               status === 'COMPLETED' || 
               status === 'VERIFIED';
      } else {
        // Step 8: Transporter delivery to Drop SHG
        return status === 'PARCEL_AT_DROP_SHG' || 
               status === 'DELIVERED' || 
               status === 'COMPLETED' || 
               status === 'VERIFIED';
      }
    }
  };

  const verifiedCount = displayProducts.filter(p => {
    return verifiedProductIds.includes(p.id) || isParcelVerifiedForTransporter(p);
  }).length;

  // Contextual Contact Logic matching precisely with user requirements
  const isPickup = type === 'pickup';
  const isRTOBatch = batch.products.some(p => (p as any).isRTO) || batch.isRTO || false;
  const isHubPoint = isPickup
    ? (batch.pickupPointName === 'Gadhinglaj Hub' || batch.pickupPointName === 'Central Hub GMU')
    : (batch.dropPointName === 'Gadhinglaj Hub' || batch.dropPointName === 'Central Hub GMU' || isRTOBatch);

  const displayContact = isRTOBatch ? batch.shgContact : (isHubPoint ? HUB_CONTACT : batch.shgContact);
  const isSHG = !isHubPoint;

  const sectionTitle = type === 'pickup'
    ? t('orders.items_for_collection', { defaultValue: 'Items for Collection' })
    : type === 'drop'
      ? t('orders.items_for_handover', { defaultValue: 'Items for Handover' })
      : t('orders.associated_shipment_products', { defaultValue: 'Associated Shipment Products' });

  // Auto-populate verified lists if items are already completed on load
  useEffect(() => {
    if (!batch) return;
    const completedIds = displayProducts
      .filter(p => {
        const isPicked = p.status === 'picked';
        const isCompleted = p.status === 'completed';
        const isItemVerified = isParcelVerifiedForTransporter(p);
        return type === 'pickup' ? (isPicked || isCompleted || isItemVerified) : (isCompleted || isItemVerified);
      })
      .map(p => p.id);

    if (completedIds.length > 0) {
      setVerifiedProductIds(prev => {
        const hasNew = completedIds.some(id => !prev.includes(id));
        if (!hasNew) return prev;
        const next = [...prev];
        completedIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  }, [batch?.id, type]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={type === 'pickup' ? t('orders.collection_details', { defaultValue: 'Collection Details' }) : t('orders.delivery_details', { defaultValue: 'Delivery Details' })}
        subtitle={`${t('orders.batch', { defaultValue: 'Batch' })} ${batch.displayId || batch.id} • ${batch.areaName}`}
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
              <Text style={styles.summaryBatchId} numberOfLines={1} adjustsFontSizeToFit>{batch.displayId || batch.id}</Text>
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
            {isRTOBatch && (() => {
              const rtoProducts = batch.products.filter(p => (p as any).isRTO);
              const isPlural = rtoProducts.length > 1;
              const noteText = isPlural
                ? t('orders.note_address_updated_plural', { defaultValue: 'Address updated. The products should be returned to the updated address. The items should be delivered in 48 hours to the updated address.' })
                : t('orders.note_address_updated_singular', { defaultValue: 'Address updated. The product should be returned to the updated address. The item should be delivered in 48 hours to the updated address.' });
              return (
                <View style={styles.contactUpdateNote}>
                  <Info size={scale(14)} color="#D97706" />
                  <Text style={styles.contactUpdateNoteText}>{noteText}</Text>
                </View>
              );
            })()}
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
                      <Text style={styles.contactItemValue} numberOfLines={1}>{cleanPersonName(displayContact.name)}</Text>
                    </View>
                  </View>

                  {!!(displayContact as any).shgName && (
                    <View style={styles.contactGridItem}>
                      <View style={styles.contactIconCircle}>
                        <User size={scale(14)} color={Colors.primary} />
                      </View>
                      <View style={styles.contactDetailCol}>
                        <Text style={styles.contactItemLabel}>{t('orders.shg_name', { defaultValue: 'SHG Name' })}</Text>
                        <Text style={styles.contactItemValue} numberOfLines={1}>{(displayContact as any).shgName}</Text>
                      </View>
                    </View>
                  )}

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

                  {!!(displayContact as any).taluka && (
                    <View style={styles.contactGridItem}>
                      <View style={styles.contactIconCircle}>
                        <MapPin size={scale(14)} color={Colors.primary} />
                      </View>
                      <View style={styles.contactDetailCol}>
                        <Text style={styles.contactItemLabel}>{t('orders.taluka', { defaultValue: 'Taluka' })}</Text>
                        <Text style={styles.contactItemValue} numberOfLines={1}>{(displayContact as any).taluka}</Text>
                      </View>
                    </View>
                  )}

                  {!!(displayContact as any).district && (
                    <View style={styles.contactGridItem}>
                      <View style={styles.contactIconCircle}>
                        <MapPin size={scale(14)} color={Colors.primary} />
                      </View>
                      <View style={styles.contactDetailCol}>
                        <Text style={styles.contactItemLabel}>{t('orders.district', { defaultValue: 'District' })}</Text>
                        <Text style={styles.contactItemValue} numberOfLines={1}>{(displayContact as any).district}</Text>
                      </View>
                    </View>
                  )}

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

            {/* Handover Progress Bar */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: scale(12),
              padding: scale(12),
              marginHorizontal: scale(16),
              marginBottom: scale(16),
              borderWidth: 1,
              borderColor: '#F1F5F9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(6) }}>
                <Text style={{ fontFamily: Fonts.bold, fontSize: moderateScale(11), color: '#073318' }}>Handover Progress</Text>
                <Text style={{ fontFamily: Fonts.bold, fontSize: moderateScale(11), color: '#073318' }}>{verifiedCount} of {displayProducts.length} verified</Text>
              </View>
              <View style={{ height: scale(6), backgroundColor: '#F1F5F9', borderRadius: scale(3), overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: '#10B981', borderRadius: scale(3), width: `${(verifiedCount / Math.max(1, displayProducts.length)) * 100}%` }} />
              </View>
            </View>

            <View style={styles.boxContentPadding}>
              <View style={styles.productsWrapper}>
              {displayProducts.map((product) => {
                const isPicked = product.status === 'picked';
                const isCompleted = product.status === 'completed';
                const isRejected = product.status === 'rejected';
                const isActionDone = type === 'pickup' ? (isPicked || isCompleted) : isCompleted;

                const isGmuDrop = false;

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

                    {/* Checkbox for GMU Drop */}
                    {isGmuDrop && !isCurrentLegCompleted && !isBatchRejected && !isRejected && (
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => {
                          setSelectedGmuDropProductIds(prev =>
                            prev.includes(product.id)
                              ? prev.filter(id => id !== product.id)
                              : [...prev, product.id]
                          );
                        }}
                      >
                        <View
                          style={[
                            styles.checkboxCircle,
                            selectedGmuDropProductIds.includes(product.id) && styles.checkboxSelected,
                          ]}
                        >
                          {selectedGmuDropProductIds.includes(product.id) && (
                            <Check size={scale(12)} color="#FFFFFF" strokeWidth={3.5} />
                          )}
                        </View>
                      </TouchableOpacity>
                    )}

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

                      <Text style={styles.productNameText}>{product.name}</Text>

                      <View style={styles.specsRow}>
                        <Text style={styles.specInlineText}>{product.qty} {t('orders.items', { defaultValue: 'items' })} • {product.weight}</Text>
                      </View>

                      {isRejected && product.rejectReason && (
                        <View style={styles.rejectNarrative}>
                          <XCircle size={scale(14)} color="#DC2626" style={{ marginTop: scale(2) }} />
                          <Text style={styles.rejectText}>{product.rejectReason}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.sideActionStrip}>
                      {(() => {
                        const matchingParcel = orderParcels.find((p: any) => p.productId === (product as any).productId);
                        const getTransporterVerified = () => {
                          if (isCurrentLegCompleted) return true;
                          if (verifiedProductIds.includes(product.id)) return true;
                          return isParcelVerifiedForTransporter(product);
                        };
                        const isVerified = getTransporterVerified();

                        if (isBatchRejected) {
                          return (
                            <View style={styles.successIconBox}>
                              <XCircle size={scale(24)} color="#EF4444" strokeWidth={2.5} />
                            </View>
                          );
                        }

                        if (isVerified) {
                          return (
                            <View style={styles.verifiedBadge}>
                              <CheckCircle size={scale(14)} color="#059669" strokeWidth={2.5} />
                              <Text style={styles.verifiedBadgeText}>Verified</Text>
                            </View>
                          );
                        }

                        if (isRejected) {
                          return (
                            <View style={styles.successIconBox}>
                              <XCircle size={scale(24)} color="#EF4444" />
                            </View>
                          );
                        }

                        if (matchingParcel) {
                          return (
                            <TouchableOpacity
                              onPress={() => {
                                setActiveScanningParcel(matchingParcel);
                                setScannerModalVisible(true);
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: scale(4),
                                backgroundColor: '#073318',
                                paddingHorizontal: scale(10),
                                paddingVertical: verticalScale(6),
                                borderRadius: scale(8),
                              }}
                            >
                              <Text style={{
                                fontFamily: Fonts.bold,
                                fontSize: moderateScale(11),
                                color: '#FFFFFF',
                              }}>Scan QR</Text>
                            </TouchableOpacity>
                          );
                        }

                        if (true) {
                          return (
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: scale(4),
                              backgroundColor: '#F1F5F9',
                              paddingHorizontal: scale(8),
                              paddingVertical: verticalScale(4),
                              borderRadius: scale(8),
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                            }}>
                              <Text style={{
                                fontFamily: Fonts.bold,
                                fontSize: moderateScale(11),
                                color: '#64748B',
                              }}>Pending</Text>
                            </View>
                          );
                        }

                        return null;
                      })()}
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
          ) : (
            <View style={{ gap: verticalScale(12) }}>
              {verifiedCount >= displayProducts.length && (
                <TouchableOpacity
                  style={[
                    styles.primaryConfirmBtn,
                    type === 'pickup' ? styles.bgPickup : styles.bgDrop,
                    isFinalizing && styles.btnDisabled
                  ]}
                  disabled={isFinalizing}
                  onPress={handleFinalBatchConfirm}
                >
                  <CheckCircle size={scale(18)} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.primaryConfirmBtnText}>
                    {isFinalizing
                      ? 'Confirming...'
                      : type === 'pickup'
                        ? 'Confirm Pickup'
                        : 'Confirm Delivery'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.primaryConfirmBtn, { backgroundColor: '#073318', marginTop: verticalScale(4) }]}
                onPress={handleQrScanSimulated}
              >
                <Text style={styles.primaryConfirmBtnText}>Scan QR Code (Simulated)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomRejectBtn}
                onPress={() => setRejectingProductId('all')}
              >
                <XCircle size={scale(16)} color="#DC2626" style={{ marginRight: scale(6) }} />
                <Text style={styles.bottomRejectBtnText}>{type === 'pickup' ? 'Reject Collection' : 'Reject Delivery'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Scanner Modal */}
      <Modal
        visible={scannerModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setScannerModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'space-between', padding: scale(24) }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: verticalScale(8) }}>
            <TouchableOpacity
              onPress={() => setScannerModalVisible(false)}
              style={{
                width: scale(44),
                height: scale(44),
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: scale(22),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <X size={scale(24)} color="#FFFFFF" />
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: moderateScale(18),
                color: '#FFFFFF',
                textAlign: 'center',
                flex: 1,
                marginRight: scale(44),
              }}
            >
              Verify Products
            </Text>
          </View>

          {/* Viewfinder Area */}
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, marginVertical: verticalScale(16) }}>
            <View style={{ width: scale(260), height: scale(260), position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
              {/* Corner brackets */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: scale(32), height: scale(32), borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#059669', borderTopLeftRadius: scale(12) }} />
              <View style={{ position: 'absolute', top: 0, right: 0, width: scale(32), height: scale(32), borderTopWidth: 4, borderRightWidth: 4, borderColor: '#059669', borderTopRightRadius: scale(12) }} />
              <View style={{ position: 'absolute', bottom: 0, left: 0, width: scale(32), height: scale(32), borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#059669', borderBottomLeftRadius: scale(12) }} />
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: scale(32), height: scale(32), borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#059669', borderBottomRightRadius: scale(12) }} />

              {/* Central scanning grid area / transparent frame */}
              <View style={{ width: scale(240), height: scale(240), backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: scale(8), overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                {(permission && permission.granted) ? (
                  <CameraView
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />
                ) : (
                  <View style={{ padding: scale(16), alignItems: 'center' }}>
                    <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: moderateScale(12), marginBottom: verticalScale(8) }}>Camera permission required</Text>
                    <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#059669', paddingHorizontal: scale(12), paddingVertical: verticalScale(6), borderRadius: scale(8) }}>
                      <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: moderateScale(11) }}>Grant</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {scanningStatus === 'scanning' ? (
                  <>
                    <Animated.View
                      style={{
                        transform: [{ translateY: laserTranslateY }],
                        width: '100%',
                        height: 3,
                        backgroundColor: '#EF4444',
                        position: 'absolute',
                        top: 0,
                        elevation: 5,
                      }}
                    />
                  </>
                ) : (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,150,105,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: scale(64), height: scale(64), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: scale(32), alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(12) }}>
                      <Check size={scale(32)} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    <Text style={{ color: '#FFFFFF', fontSize: moderateScale(16), fontFamily: Fonts.bold }}>Scan Successful</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Instruction Text */}
            <Text style={{ fontSize: moderateScale(14), fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.7)', marginTop: verticalScale(32), textAlign: 'center', paddingHorizontal: scale(24) }}>
              {scanningStatus === 'scanning' ? 'Align the barcode/QR code within the frame to verify products' : 'Product verified successfully!'}
            </Text>
          </View>

          {/* Bottom actions */}
          <View style={{ paddingBottom: verticalScale(32), alignItems: 'center', justifyContent: 'center' }}>
            {scanningStatus === 'scanning' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(24), borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ fontSize: moderateScale(13), fontFamily: Fonts.bold, color: '#FFFFFF' }}>Scanning Products...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5EC', paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(24), borderWidth: 1, borderColor: '#D5EFE0' }}>
                <CheckCircle size={scale(16)} color="#073318" />
                <Text style={{ fontSize: moderateScale(13), fontFamily: Fonts.bold, color: '#073318', marginLeft: scale(4) }}>Verification Completed</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <Text style={styles.modalTitle}>
                    {type === 'pickup' ? 'Reject Pickup' : 'Reject Delivery'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                  <X size={scale(20)} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.modalSubtitle}>Specify reason for failing this shipment action</Text>

                <View style={[styles.chipsContainer, { flexDirection: 'column', width: '100%' }]}>
                  {(() => {
                    let chips: string[] = [];
                    if (type === 'pickup') {
                      const entityName = isHubPoint ? 'GMU' : 'SHG';
                      chips = [
                        'Vehicle Problem',
                        `${entityName} Not Reachable`,
                        `${entityName} Not Available`
                      ];
                    } else {
                      // type === 'drop'
                      if (isHubPoint) {
                        // Drop destination is GMU Hub
                        chips = ['GMU Not Available', 'Transporter Emergency'];
                      } else {
                        // Drop destination is SHG
                        chips = [
                          'SHG Not Available',
                          'SHG Not Reachable',
                          'Vehicle Issue from Transporter'
                        ];
                      }
                    }

                    return chips.map((chip) => {
                      return (
                        <TouchableOpacity
                          key={chip}
                          style={[
                            styles.reasonChip,
                            { width: '100%' },
                            rejectReasonText === chip && styles.reasonChipSelected
                          ]}
                          onPress={() => {
                            setRejectReasonText(chip);
                          }}
                        >
                          <Text style={[styles.reasonChipText, rejectReasonText === chip && styles.reasonChipTextSelected]}>
                            {chip}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>

                {type === 'drop' && isHubPoint && (rejectReasonText === 'GMU Not Available' || rejectReasonText === 'Transporter Emergency') ? (
                  <View style={{ marginTop: verticalScale(10), gap: verticalScale(14) }}>
                    {/* Inline contact card for Hub Manager */}
                    <View style={[
                      styles.masterSectionBox,
                      {
                        borderWidth: 1.5,
                        borderColor: rejectReasonText === 'Transporter Emergency' ? '#DC2626' : Colors.primary,
                        marginBottom: 0
                      }
                    ]}>
                      <View style={[
                        styles.boxHeaderRow,
                        {
                          backgroundColor: rejectReasonText === 'Transporter Emergency' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(178, 213, 52, 0.08)'
                        }
                      ]}>
                        <View style={styles.boxHeaderLeft}>
                          {rejectReasonText === 'Transporter Emergency' ? (
                            <AlertTriangle size={scale(18)} color="#DC2626" strokeWidth={2.5} />
                          ) : (
                            <User size={scale(18)} color={Colors.primary} strokeWidth={2.5} />
                          )}
                          <Text style={[
                            styles.boxTitleText,
                            rejectReasonText === 'Transporter Emergency' && { color: '#DC2626' }
                          ]}>
                            {rejectReasonText === 'Transporter Emergency' ? 'Emergency Support' : 'Hub Manager Contact'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.boxContentPadding}>
                        <View style={{ gap: verticalScale(8) }}>
                          <Text style={{ fontFamily: Fonts.bold, fontSize: moderateScale(14), color: Colors.textPrimary }}>
                            {cleanPersonName(HUB_CONTACT.name)}
                          </Text>
                          <Text style={{ fontFamily: Fonts.medium, fontSize: moderateScale(12), color: Colors.textSecondary }}>
                            Phone: {HUB_CONTACT.phone}
                          </Text>
                          <Text style={{ fontFamily: Fonts.medium, fontSize: moderateScale(12), color: Colors.textSecondary }} numberOfLines={2}>
                            Address: {HUB_CONTACT.address}
                          </Text>
                          <Text style={{ fontFamily: Fonts.semiBold, fontSize: moderateScale(11.5), color: '#DC2626', marginTop: verticalScale(6) }}>
                            {rejectReasonText === 'Transporter Emergency'
                              ? 'Emergency Alert: Since you have already picked up this shipment, you cannot cancel it now. In case of an emergency, please contact the Hub Manager immediately to report your emergency and obtain a safe resolution.'
                              : 'Note: Rejection is not permitted at this stage. Please contact the hub manager to complete delivery. If the manager is not reachable or not answering the phone, please try again after some time.'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.confirmRejectBtn,
                        { backgroundColor: rejectReasonText === 'Transporter Emergency' ? '#DC2626' : Colors.primary }
                      ]}
                      onPress={() => {
                        Linking.openURL(`tel:${HUB_CONTACT.phone.replace(/\s+/g, '')}`);
                      }}
                    >
                      <Text style={styles.confirmRejectText}>Call Hub Manager</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmRejectBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}
                      onPress={handleCloseModal}
                    >
                      <Text style={[styles.confirmRejectText, { color: Colors.textSecondary }]}>Close</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.confirmRejectBtn,
                      !rejectReasonText && styles.btnDisabled
                    ]}
                    disabled={!rejectReasonText}
                    onPress={handleConfirmReject}
                  >
                    <Text style={styles.confirmRejectText}>Confirm Reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Verification Bottom Sheet Modal */}
      <VerificationBottomSheet
        visible={showVerificationSheet}
        onClose={() => setShowVerificationSheet(false)}
        title={
          type === 'pickup'
            ? `Pickup Verification`
            : `Delivery Verification`
        }
        subtitle={
          type === 'pickup'
            ? `Share this code with the ${isHubPoint ? 'Hub' : 'SHG'} to confirm pickup.`
            : isHubPoint
              ? `Enter the 4-digit delivery code generated on the Hub app.`
              : `Enter the 4-digit code shown on the SHG app.`
        }
      >
        {type === 'pickup' ? (
          <View style={{ gap: verticalScale(16) }}>
            <CodeDisplayCard code={batch.products.find(p => p.id === selectedProductId)?.verificationCode || ''} />
            {isHubPoint && type === 'pickup' && (
              <TouchableOpacity
                style={styles.verifyCodeActionBtn}
                onPress={handleVerifyPickupCode}
              >
                <Text style={styles.verifyCodeActionBtnText}>Confirm Verify</Text>
              </TouchableOpacity>
            )}
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

      {/* Barcode Scanner Simulator Modal */}
      <Modal
        visible={showScannerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScannerModal(false)}
      >
        <SafeAreaView style={styles.scannerModalContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Barcode Scanner</Text>
            <TouchableOpacity onPress={() => setShowScannerModal(false)} style={styles.scannerCloseBtn}>
              <X size={scale(24)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.scannerBody}>
            <Text style={styles.scannerInstruction}>
              Align the barcode of the parcel inside the frame below.
            </Text>

            <View style={styles.scannerWindow}>
              {/* Corner brackets for target frame */}
              <View style={[styles.cornerBracket, styles.topLeftBracket]} />
              <View style={[styles.cornerBracket, styles.topRightBracket]} />
              <View style={[styles.cornerBracket, styles.bottomLeftBracket]} />
              <View style={[styles.cornerBracket, styles.bottomRightBracket]} />

              {/* Animated laser line */}
              <Animated.View style={[styles.scannerLaser, { transform: [{ translateY }] }]} />
            </View>

            <Text style={styles.expectedCodeText}>
              Expected Barcode: {batch.handoverCode || 'N/A'}
            </Text>

            <View style={styles.scannerInputBox}>
              <TextInput
                style={styles.scannerInput}
                placeholder="Enter barcode manually..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={manualBarcode}
                onChangeText={setManualBarcode}
              />
              <TouchableOpacity
                style={styles.simulateScanBtn}
                onPress={() => setManualBarcode(batch.handoverCode || '')}
              >
                <Text style={styles.simulateScanBtnText}>Fill Barcode</Text>
              </TouchableOpacity>
            </View>

            {scannerError ? (
              <Text style={styles.scannerErrorText}>{scannerError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.scannerVerifyBtn, !manualBarcode && styles.btnDisabled]}
              disabled={!manualBarcode}
              onPress={handleVerifyScannedBarcode}
            >
              <CheckCircle size={scale(18)} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.scannerVerifyBtnText}>Verify and Complete Pickup</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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
  bottomRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    backgroundColor: '#FEF2F2',
    marginTop: verticalScale(4),
  },
  bottomRejectBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#DC2626',
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
  inlineVerifyBtn: {
    backgroundColor: '#073318',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: scale(85),
  },
  inlineVerifyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#059669',
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: scale(14),
    paddingRight: scale(2),
  },
  checkboxCircle: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    borderColor: '#CBD5E1', // slate-300
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  checkboxVerified: {
    borderColor: '#10B981', // emerald-500
  },
  checkboxSelected: {
    borderColor: '#059669', // emerald-600
    backgroundColor: '#059669',
  },
  scannerModalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  scannerTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: '#FFFFFF',
  },
  scannerCloseBtn: {
    padding: scale(4),
  },
  scannerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
    paddingBottom: verticalScale(40),
  },
  scannerInstruction: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: verticalScale(30),
  },
  scannerWindow: {
    width: scale(240),
    height: scale(240),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    position: 'relative',
    marginBottom: verticalScale(30),
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: scale(20),
    height: scale(20),
    borderColor: Colors.primary,
  },
  topLeftBracket: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRightBracket: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeftBracket: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRightBracket: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerLaser: {
    width: '90%',
    height: 3,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
    top: 20,
  },
  expectedCodeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#FFFFFF',
    marginBottom: verticalScale(20),
  },
  scannerInputBox: {
    flexDirection: 'row',
    width: '100%',
    gap: scale(10),
    marginBottom: verticalScale(16),
  },
  scannerInput: {
    flex: 1,
    height: verticalScale(46),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
  },
  simulateScanBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  simulateScanBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#FFFFFF',
  },
  scannerErrorText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#F87171',
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  scannerVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    width: '100%',
    height: verticalScale(48),
    backgroundColor: Colors.primary,
    borderRadius: moderateScale(12),
    marginTop: verticalScale(10),
  },
  scannerVerifyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#073318',
  },
});

export default OrderBatchPickupDetailScreen;

