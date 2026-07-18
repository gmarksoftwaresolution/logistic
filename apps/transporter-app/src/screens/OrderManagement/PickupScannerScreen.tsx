import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Check, Trash2, AlertTriangle, X, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useScanSession } from '../../context/ScanSessionContext';
import { useOrderManagement } from '../../context/OrderManagementContext';
import { Colors, Fonts } from '../../constants/Colors';

function decodeQrData(data: string) {
  const trimmed = data.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed.parcelId) {
        throw new Error('Invalid QR payload');
      }
      return {
        parcelId: parsed.parcelId,
        verificationToken: parsed.verificationToken || '',
      };
    } catch (err: any) {
      throw new Error('Malformed JSON in QR: ' + err.message);
    }
  } else {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 1) {
      return {
        parcelId: parts[0],
        verificationToken: parts[1] || '',
      };
    }
    throw new Error('Invalid QR format');
  }
}

export const PickupScannerScreen: React.FC<any> = ({ route, navigation }) => {
  const { sessionId, orderIds } = route.params || {};
  const {
    activePickupSession,
    loading,
    error,
    startSession,
    scanParcel,
    removeParcel,
    confirmSessionOrder,
    cancelSession,
    clearError,
  } = useScanSession();

  const { refreshBatchesList } = useOrderManagement();
  const activeSession = activePickupSession;

  // Local optimistic scanned list & sync states
  const [localScannedItems, setLocalScannedItems] = useState<any[]>([]);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'duplicate' | 'error' | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [hasScannedAny, setHasScannedAny] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  // Initialize or resume session
  useEffect(() => {
    const initSession = async () => {
      try {
        if (!activeSession && orderIds) {
          await startSession('PICKUP', orderIds);
        }
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to initialize session');
        navigation.goBack();
      }
    };
    initSession();
  }, [sessionId, orderIds]);

  // Request camera permissions
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  // Set hasScannedAny dynamically on mount if there is already progress
  useEffect(() => {
    if (activeSession && activeSession.scanned && activeSession.scanned.length > 0) {
      setHasScannedAny(true);
    }
  }, [activeSession]);

  const triggerScanFeedback = (type: 'success' | 'duplicate' | 'error', message: string) => {
    setScanFeedback(type);
    setFeedbackMessage(message);

    if (type === 'success') {
      Vibration.vibrate(80);
    } else if (type === 'duplicate') {
      Vibration.vibrate([0, 80, 50, 80]);
    } else {
      Vibration.vibrate(300);
    }

    // Auto clear feedback after 1.5 seconds
    setTimeout(() => {
      setScanFeedback(null);
      setFeedbackMessage(null);
    }, 1500);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || !activeSession || actionLoading) return;

    // Scan throttling lock (250 ms)
    setScanned(true);
    setTimeout(() => setScanned(false), 250);

    let decoded;
    try {
      decoded = decodeQrData(data);
    } catch (err: any) {
      triggerScanFeedback('error', 'Malformed QR payload scanned.');
      return;
    }

    const { parcelId, verificationToken } = decoded;

    // Compile master expected list from session
    const allParcels = [...(activeSession.scanned || []), ...(activeSession.remaining || [])];
    const parcel = allParcels.find((p: any) => p.parcelId === parcelId);

    if (!parcel) {
      // Dynamic onboarding: parcel is not in the active session lists yet.
      // We call the backend directly.
      setHasScannedAny(true);
      triggerScanFeedback('success', `Syncing new parcel scan...`);
      try {
        await scanParcel('PICKUP', activeSession.sessionId, data);
      } catch (err: any) {
        const errMsg = err.response?.data?.message || 'Sync failed.';
        triggerScanFeedback('error', Array.isArray(errMsg) ? errMsg[0] : errMsg);
      }
      return;
    }

    // Validate verification token locally if available
    if (parcel.verificationToken && verificationToken && parcel.verificationToken !== verificationToken) {
      triggerScanFeedback('error', 'Invalid verification token.');
      return;
    }

    // Check duplicate
    const isDuplicate = localScannedItems.some(i => i.parcelId === parcelId) ||
                        (activeSession.scanned || []).some(i => i.parcelId === parcelId);

    if (isDuplicate) {
      triggerScanFeedback('duplicate', `Already scanned: ${parcel.productName}`);
      return;
    }

    // Valid scan! Optimistically add to UI list
    setHasScannedAny(true);
    triggerScanFeedback('success', `Scanned: ${parcel.productName}`);

    const newOptimisticItem = {
      ...parcel,
      pendingSync: 'syncing',
      lastScannedParcelId: parcelId
    };

    setLocalScannedItems(prev => [...prev, newOptimisticItem]);

    // Send backend request asynchronously
    try {
      await scanParcel('PICKUP', activeSession.sessionId, data);
      setLocalScannedItems(prev =>
        prev.map(item => item.parcelId === parcelId ? { ...item, pendingSync: 'synced' } : item)
      );
    } catch (err: any) {
      // Revert optimistic state and present error feedback
      setLocalScannedItems(prev => prev.filter(item => item.parcelId !== parcelId));
      const errMsg = err.response?.data?.message || 'Sync failed.';
      triggerScanFeedback('error', Array.isArray(errMsg) ? errMsg[0] : errMsg);
    }
  };

  const handleRemoveParcel = async (parcelId: string) => {
    if (!activeSession || actionLoading) return;
    setActionLoading(true);
    try {
      // Clear from local scan cache first
      setLocalScannedItems(prev => prev.filter(item => item.parcelId !== parcelId));
      await removeParcel('PICKUP', activeSession.sessionId, parcelId);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to remove parcel');
    } finally {
      setActionLoading(false);
    }
  };

  const executeConfirmOrder = async (orderId: string) => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      await confirmSessionOrder('PICKUP', activeSession.sessionId, orderId);
      await refreshBatchesList();
      
      // Filter out any locally tracked scanned items belonging to confirmed order
      setLocalScannedItems(prev => prev.filter(item => item.orderId !== orderId));
      
      Alert.alert('Success', `Order #${orderId.replace('pickup-', '').replace('drop-', '')} confirmed successfully!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Confirmation failed';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSession = () => {
    Alert.alert(
      'Cancel Scanning',
      'Are you sure you want to discard this scanning session? Scanned progress will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Discard',
          style: 'destructive',
          onPress: async () => {
            await cancelSession('PICKUP');
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Memoized grouped order cards
  const scannedGroupedOrders = React.useMemo(() => {
    if (!activeSession) return [];

    const serverScannedIds = new Set((activeSession.scanned || []).map((p: any) => p.parcelId));
    
    // Merge optimistic local scans and server scans
    const mergedScanned = [
      ...(activeSession.scanned || []).map(p => ({ ...p, pendingSync: 'synced', lastScannedParcelId: p.parcelId })),
      ...localScannedItems.filter(p => !serverScannedIds.has(p.parcelId))
    ];

    const scannedIds = new Set(mergedScanned.map(p => p.parcelId));
    const mergedRemaining = (activeSession.remaining || []).filter((p: any) => !scannedIds.has(p.parcelId));

    const ordersMap: Record<string, {
      orderId: string;
      scanned: any[];
      remaining: any[];
      lastScannedParcelId: string;
      productName: string;
    }> = {};

    const getOrderEntry = (id: string, defaultName: string) => {
      if (!ordersMap[id]) {
        ordersMap[id] = {
          orderId: id,
          scanned: [],
          remaining: [],
          lastScannedParcelId: '',
          productName: defaultName || 'Papad',
        };
      }
      return ordersMap[id];
    };

    mergedScanned.forEach(item => {
      const entry = getOrderEntry(item.orderId || '', item.productName);
      entry.scanned.push(item);
      if (item.lastScannedParcelId) {
        entry.lastScannedParcelId = item.lastScannedParcelId;
      }
    });

    mergedRemaining.forEach(item => {
      const entry = getOrderEntry(item.orderId || '', item.productName);
      entry.remaining.push(item);
    });

    return Object.values(ordersMap);
  }, [activeSession, localScannedItems]);

  // Memoized header counts summary
  const summary = React.useMemo(() => {
    if (!activeSession) return { ordersCount: 0, completedCount: 0, scanningCount: 0, scannedParcels: 0, expectedParcels: 0 };

    const groups = scannedGroupedOrders;
    const ordersCount = groups.length;
    const completedCount = groups.filter(g => g.remaining.length === 0 && g.scanned.length > 0).length;
    const scanningCount = groups.filter(g => g.remaining.length > 0 && g.scanned.length > 0).length;

    let expectedParcels = 0;
    let scannedParcels = 0;
    groups.forEach(g => {
      expectedParcels += g.scanned.length + g.remaining.length;
      scannedParcels += g.scanned.length;
    });

    return { ordersCount, completedCount, scanningCount, scannedParcels, expectedParcels };
  }, [scannedGroupedOrders, activeSession]);

  // Direct goBack navigation listener if the last order session confirms automatically
  const prevSessionRef = useRef(activeSession);
  useEffect(() => {
    if (prevSessionRef.current && !activeSession) {
      navigation.goBack();
    }
    prevSessionRef.current = activeSession;
  }, [activeSession]);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Camera permission is required to scan QR codes</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !activeSession) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading scan session...</Text>
      </View>
    );
  }

  // Viewfinder dynamic border styling based on scan feedback state
  const getViewfinderBorderColor = () => {
    if (scanFeedback === 'success') return '#10B981'; // Green
    if (scanFeedback === 'duplicate') return '#F59E0B'; // Yellow
    if (scanFeedback === 'error') return '#EF4444'; // Red
    return Colors.secondary; // Blue/default
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pickup QR Scanner</Text>
        <TouchableOpacity onPress={handleCancelSession} style={styles.closeButton}>
          <X size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Header Active Scans Summary Dashboard */}
      {hasScannedAny && activeSession && (
        <View style={styles.summaryDashboard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{summary.ordersCount}</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryDivider]}>
            <Text style={styles.summaryVal}>{summary.completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryDivider]}>
            <Text style={styles.summaryVal}>{summary.scanningCount}</Text>
            <Text style={styles.summaryLabel}>Scanning</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryDivider]}>
            <Text style={styles.summaryVal}>
              {summary.scannedParcels} / {summary.expectedParcels}
            </Text>
            <Text style={styles.summaryLabel}>Parcels</Text>
          </View>
        </View>
      )}

      {/* Viewfinder (Camera) */}
      <View style={styles.scannerWrapper}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        >
          <View style={styles.overlayContainer}>
            <View style={[styles.viewfinder, { borderColor: getViewfinderBorderColor() }]} />
            {feedbackMessage && (
              <View style={[
                styles.feedbackToast,
                scanFeedback === 'success' && styles.toastSuccess,
                scanFeedback === 'duplicate' && styles.toastDuplicate,
                scanFeedback === 'error' && styles.toastError,
              ]}>
                <Text style={styles.feedbackToastText}>{feedbackMessage}</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>

      {/* Expected & Scanned Group Cards list */}
      <ScrollView style={styles.listContainer}>
        {!hasScannedAny ? (
          <View style={styles.initialPlaceholder}>
            <Text style={styles.placeholderLabel}>----------------------------</Text>
            <Text style={styles.placeholderTitle}>Scan QR Code</Text>
            <Text style={styles.placeholderSubtitle}>Point the camera at a parcel QR code.</Text>
            <Text style={styles.placeholderLabel}>----------------------------</Text>
            <Text style={styles.placeholderPulse}>Waiting for first scan...</Text>
            <Text style={styles.placeholderLabel}>----------------------------</Text>
          </View>
        ) : (
          <View style={{ gap: 16, marginTop: 12, paddingBottom: 32 }}>
            {scannedGroupedOrders.map((orderGroup) => {
              const totalItems = orderGroup.scanned.length + orderGroup.remaining.length;
              const isCompleted = orderGroup.remaining.length === 0;

              return (
                <View key={orderGroup.orderId} style={styles.orderGroupCard}>
                  {/* Card Header */}
                  <View style={styles.orderHeaderRow}>
                    <View>
                      <Text style={styles.orderIdLabel}>Order ID</Text>
                      <Text style={styles.orderIdValue}>ORD-{orderGroup.orderId.replace('pickup-', '').replace('drop-', '')}</Text>
                    </View>
                    <View style={styles.badgeContainer}>
                      <Text style={[
                        styles.statusBadge,
                        isCompleted ? styles.badgeCompleted : styles.badgeScanning
                      ]}>
                        {isCompleted ? '✓ Completed' : 'Scanning'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Body - Details */}
                  <View style={styles.cardDetailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Last Parcel</Text>
                      <Text style={styles.detailValue}>
                        {orderGroup.lastScannedParcelId ? `P-${orderGroup.lastScannedParcelId.substring(0, 6)}` : 'None'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Product</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>{orderGroup.productName}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Progress</Text>
                      <Text style={styles.detailValue}>{orderGroup.scanned.length} / {totalItems}</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${(orderGroup.scanned.length / (totalItems || 1)) * 100}%` },
                        isCompleted && { backgroundColor: '#10B981' }
                      ]}
                    />
                  </View>

                  {/* Parcel List inside Order Card */}
                  <View style={styles.parcelList}>
                    {/* Scanned items */}
                    {orderGroup.scanned.map((item) => (
                      <View key={item.parcelId} style={styles.parcelRow}>
                        <Check size={16} color="#10B981" />
                        <Text style={styles.parcelRowName} numberOfLines={1}>{item.productName}</Text>
                        <Text style={styles.parcelRowId}>(P-{item.parcelId.substring(0, 6)})</Text>
                        
                        {/* Optimistic sync label */}
                        <Text style={[
                          styles.syncLabel,
                          item.pendingSync === 'syncing' ? styles.syncingText : styles.syncedText
                        ]}>
                          {item.pendingSync === 'syncing' ? 'Syncing...' : '✓ Synced'}
                        </Text>

                        <TouchableOpacity
                          onPress={() => handleRemoveParcel(item.parcelId)}
                          disabled={actionLoading}
                          style={styles.trashBtn}
                        >
                          <Trash2 size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Remaining items */}
                    {orderGroup.remaining.map((item) => (
                      <View key={item.parcelId} style={[styles.parcelRow, styles.parcelRowRemaining]}>
                        <RefreshCw size={14} color="#F59E0B" />
                        <Text style={[styles.parcelRowName, styles.remainingText]} numberOfLines={1}>{item.productName}</Text>
                        <Text style={styles.parcelRowId}>(P-{item.parcelId.substring(0, 6)})</Text>
                        <Text style={styles.waitingBadge}>Waiting</Text>
                      </View>
                    ))}
                  </View>

                  {/* Inline Confirmation button */}
                  {isCompleted && (
                    <TouchableOpacity
                      style={[styles.inlineConfirmBtn, actionLoading && styles.disabledBtn]}
                      onPress={() => executeConfirmOrder(orderGroup.orderId)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.inlineConfirmBtnText}>Confirm Pickup</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  summaryDashboard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  summaryVal: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scannerWrapper: {
    height: 220,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  viewfinder: {
    width: 130,
    height: 130,
    borderWidth: 3,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  feedbackToast: {
    position: 'absolute',
    bottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    maxWidth: '90%',
  },
  toastSuccess: {
    backgroundColor: '#059669',
  },
  toastDuplicate: {
    backgroundColor: '#D97706',
  },
  toastError: {
    backgroundColor: '#DC2626',
  },
  feedbackToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  initialPlaceholder: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginVertical: 10,
  },
  placeholderSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 10,
  },
  placeholderLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textPlaceholder,
  },
  placeholderPulse: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginVertical: 12,
  },
  orderGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderIdLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  orderIdValue: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeCompleted: {
    color: '#065F46',
    backgroundColor: '#D1FAE5',
  },
  badgeScanning: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
  },
  cardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: Colors.textPlaceholder,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  parcelList: {
    marginTop: 10,
    gap: 8,
  },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  parcelRowRemaining: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  parcelRowName: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  remainingText: {
    color: '#D97706',
  },
  parcelRowId: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textPlaceholder,
    marginHorizontal: 6,
  },
  syncLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginRight: 6,
  },
  syncingText: {
    color: '#3B82F6',
  },
  syncedText: {
    color: '#10B981',
  },
  waitingBadge: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trashBtn: {
    padding: 4,
  },
  inlineConfirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  inlineConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  disabledBtn: {
    backgroundColor: Colors.buttonDisabled,
  },
});
