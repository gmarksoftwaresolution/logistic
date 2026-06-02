import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts, Colors } from '../../constants/Colors';
import { useOrderManagement } from '../../context/OrderManagementContext';
import * as ImagePicker from 'expo-image-picker';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Camera, Check, RefreshCw, Package, ArrowLeft, CheckCircle } from 'lucide-react-native';

const DEFAULT_SAMPLE_PHOTO = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop';

type ScreenState = 'launching' | 'ready' | 'captured' | 'processing' | 'done';

const CameraCaptureScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { batchId, productId, productName, context, shgId } = route.params;
  const { batches, captureProductPhoto, completeProduct, showToast } = useOrderManagement();

  const batch = batches.find(b => b.id === batchId);
  const product = batch?.products.find(p => p.id === productId);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('launching');

  const isPickup = context === 'pickup';
  const actionLabel = isPickup ? 'Pickup Proof' : 'Delivery Proof';
  const actionColor = isPickup ? '#2563EB' : '#059669';
  const actionBg = isPickup ? '#EFF6FF' : '#ECFDF5';

  useEffect(() => {
    // Auto-launch camera on mount
    openCamera();
  }, []);

  const openCamera = async () => {
    setScreenState('launching');
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        // Permission denied — show the fallback UI with a "Confirm" button
        showToast('Camera permission denied. Use confirm button to proceed.', 'info');
        setScreenState('ready');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        setScreenState('captured');
        // Auto-submit immediately after capture
        await processCapture(uri);
      } else {
        // User canceled camera — show fallback UI
        setScreenState('ready');
      }
    } catch (error) {
      console.warn('Camera Error:', error);
      setScreenState('ready');
    }
  };

  const processCapture = async (uri: string) => {
    // satisfying 250ms snappy loader for premium mobile feel
    setScreenState('processing');
    try {
      if (batchId) {
        await captureProductPhoto(batchId, productId, context as 'pickup' | 'drop', uri);
      } else {
        completeProduct(productId, context, uri, shgId);
      }
      
      setTimeout(() => {
        setScreenState('done');
        // Navigate after brief "done" flash
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      }, 250);
    } catch (err) {
      console.error('Error processing capture:', err);
      setScreenState('captured'); // allow retry
    }
  };

  const handleConfirmWithSample = () => {
    setPhotoUri(DEFAULT_SAMPLE_PHOTO);
    processCapture(DEFAULT_SAMPLE_PHOTO);
  };

  const handleRetake = () => {
    setPhotoUri(null);
    openCamera();
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (screenState === 'done') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.doneContainer}>
          <CheckCircle size={scale(72)} color={actionColor} strokeWidth={1.5} />
          <Text style={[styles.doneTitle, { color: actionColor }]}>
            {isPickup ? 'Pickup Complete!' : 'Delivery Complete!'}
          </Text>
          <Text style={styles.doneSub}>
            {isPickup ? 'Moving to Drop section…' : 'Moving to Completed Orders…'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Processing state ──────────────────────────────────────────────────────
  if (screenState === 'processing') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.doneContainer}>
          <ActivityIndicator size="large" color={actionColor} />
          <Text style={[styles.doneSub, { marginTop: verticalScale(16) }]}>
            {isPickup ? 'Confirming pickup…' : 'Confirming delivery…'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Launching state ──────────────────────────────────────────────────────
  if (screenState === 'launching') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.doneContainer}>
          <Camera size={scale(52)} color="#64748B" strokeWidth={1.5} />
          <Text style={styles.launchingTitle}>Opening Camera…</Text>
          <ActivityIndicator size="small" color="#64748B" style={{ marginTop: verticalScale(12) }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Captured preview state ────────────────────────────────────────────────
  if (screenState === 'captured' && photoUri) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#000' }]}>
        {/* Header */}
        <View style={styles.darkHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={scale(20)} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.darkHeaderTitle}>{actionLabel}</Text>
          <View style={[styles.contextBadge, { backgroundColor: actionBg }]}>
            <Text style={[styles.contextBadgeText, { color: actionColor }]}>
              {isPickup ? 'Pickup' : 'Drop'}
            </Text>
          </View>
        </View>

        {/* Photo preview */}
        <View style={styles.previewArea}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
            <RefreshCw size={scale(16)} color="#FFF" />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: actionColor }]}
            onPress={() => processCapture(photoUri)}
          >
            <Check size={scale(18)} color="#FFF" strokeWidth={3} />
            <Text style={styles.confirmBtnText}>
              {isPickup ? 'Confirm Pickup' : 'Confirm Delivery'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Ready / fallback state (camera canceled or permission denied) ──────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <ArrowLeft size={scale(20)} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{actionLabel}</Text>
        <View style={[styles.contextBadge, { backgroundColor: actionBg }]}>
          <Text style={[styles.contextBadgeText, { color: actionColor }]}>
            {isPickup ? 'Pickup' : 'Drop'}
          </Text>
        </View>
      </View>

      {/* Order info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardIconRow}>
          <View style={[styles.infoIconCircle, { backgroundColor: actionBg }]}>
            <Package size={scale(22)} color={actionColor} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, marginLeft: scale(12) }}>
            <Text style={styles.infoCardLabel}>
              {isPickup ? 'Collecting from' : 'Delivering to'}
            </Text>
            <Text style={styles.infoCardValue} numberOfLines={1}>
              {isPickup ? (batch?.pickupPointName || 'Pickup Point') : (batch?.dropPointName || 'Drop Point')}
            </Text>
          </View>
        </View>
        {productName ? (
          <View style={styles.productRow}>
            <Text style={styles.productRowLabel}>Item:</Text>
            <Text style={styles.productRowValue}>{productName}</Text>
          </View>
        ) : null}
      </View>

      {/* Instruction area */}
      <View style={styles.instructionArea}>
        <Camera size={scale(52)} color="#CBD5E1" strokeWidth={1.5} />
        <Text style={styles.instructionTitle}>Take a photo as proof</Text>
        <Text style={styles.instructionSub}>
          {isPickup
            ? 'Photograph the items you are collecting from the seller.'
            : 'Photograph the delivered package at the delivery point.'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsArea}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: actionColor }]}
          onPress={openCamera}
          activeOpacity={0.85}
        >
          <Camera size={scale(20)} color="#FFF" strokeWidth={2.5} />
          <Text style={styles.primaryBtnText}>Open Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleConfirmWithSample}
          activeOpacity={0.8}
        >
          <Check size={scale(16)} color={actionColor} strokeWidth={2.5} />
          <Text style={[styles.skipBtnText, { color: actionColor }]}>
            {isPickup ? 'Confirm Pickup (Skip Photo)' : 'Confirm Delivery (Skip Photo)'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Done / processing overlay
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(32),
    gap: verticalScale(16),
  },
  doneTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(24),
    textAlign: 'center',
  },
  doneSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: '#64748B',
    textAlign: 'center',
  },
  launchingTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#64748B',
    marginTop: verticalScale(12),
  },
  // Dark (camera) header
  darkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    gap: scale(12),
  },
  darkHeaderTitle: {
    flex: 1,
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
  backBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Light header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: scale(12),
  },
  headerBack: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(17),
    color: Colors.textPrimary,
  },
  contextBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  contextBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
  },
  // Info card
  infoCard: {
    margin: scale(16),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    elevation: 2,
  },
  infoCardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardLabel: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#94A3B8',
  },
  infoCardValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
    marginTop: verticalScale(2),
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(10),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  productRowLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#94A3B8',
  },
  productRowValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
    flex: 1,
  },
  // Instruction
  instructionArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
    gap: verticalScale(10),
  },
  instructionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  instructionSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Actions
  actionsArea: {
    padding: scale(20),
    gap: verticalScale(12),
    paddingBottom: verticalScale(32),
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(14),
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(14),
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  skipBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
  },
  // Preview (captured photo)
  previewArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: scale(12),
    backgroundColor: '#0F172A',
    padding: scale(16),
    paddingBottom: verticalScale(24),
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: '#334155',
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
  },
  retakeBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
  },
  confirmBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#FFFFFF',
  },
});

export default CameraCaptureScreen;
