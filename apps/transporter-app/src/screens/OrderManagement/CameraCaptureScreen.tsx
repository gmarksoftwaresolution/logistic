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
import { Camera, Check, RefreshCw, ArrowLeft, Image as ImageIcon } from 'lucide-react-native';

const DEFAULT_SAMPLE_PHOTO = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop';

const CameraCaptureScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { batchId, productId, productName, context, shgId } = route.params;
  const { batches, captureProductPhoto, completeProduct, showToast } = useOrderManagement();

  const batch = batches.find(b => b.id === batchId);
  const product = batch?.products.find(p => p.id === productId);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    launchSystemCamera();
  }, []);

  const launchSystemCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showToast('Permission Required', 'error');
        setPhotoUri(DEFAULT_SAMPLE_PHOTO);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedUri = result.assets[0].uri;
        setPhotoUri(capturedUri);
        
        // AUTO-SUBMIT: Proceed immediately after system camera 'OK'
        // High-speed auto-submit
        setIsProcessing(true);
        setTimeout(() => {
          if (batchId) {
            captureProductPhoto(batchId, productId, context as 'pickup' | 'drop', capturedUri);
          } else {
            completeProduct(productId, context, capturedUri, shgId);
          }
          setIsProcessing(false);
          navigation.goBack();
        }, 300);
      }
    } catch (error) {
      console.warn('Camera Error:', error);
      // Fallback for unexpected errors
    }
  };

  const simulateCapture = () => {
    setPhotoUri(DEFAULT_SAMPLE_PHOTO);
    setIsProcessing(true);
    setTimeout(() => {
      if (batchId) {
        captureProductPhoto(batchId, productId, context as 'pickup' | 'drop', DEFAULT_SAMPLE_PHOTO);
      } else {
        completeProduct(productId, context, DEFAULT_SAMPLE_PHOTO, shgId);
      }
      setIsProcessing(false);
      navigation.goBack();
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#10B981" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  topHeaderOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  headerTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  headerMainTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(17),
    color: '#FFFFFF',
  },
  captureContextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    marginTop: verticalScale(4),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  idBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  orderIdText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  legTypePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  legTypePillText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#2563EB',
  },
  cardRouteText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: '#1E293B',
    marginBottom: verticalScale(8),
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSpecsText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#64748B',
  },
  productNamePill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
    maxWidth: '50%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productNamePillText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#475569',
  },
  viewfinderArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedPreview: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  instructionTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#F8FAFC',
    marginTop: verticalScale(16),
    textAlign: 'center',
  },
  instructionSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#94A3B8',
    marginTop: verticalScale(6),
    textAlign: 'center',
    lineHeight: 18,
  },
  frameCornerTopLeft: {
    position: 'absolute',
    top: verticalScale(40),
    left: scale(30),
    width: scale(30),
    height: scale(30),
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2ECC71',
  },
  frameCornerTopRight: {
    position: 'absolute',
    top: verticalScale(40),
    right: scale(30),
    width: scale(30),
    height: scale(30),
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2ECC71',
  },
  frameCornerBottomLeft: {
    position: 'absolute',
    bottom: verticalScale(40),
    left: scale(30),
    width: scale(30),
    height: scale(30),
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2ECC71',
  },
  frameCornerBottomRight: {
    position: 'absolute',
    bottom: verticalScale(40),
    right: scale(30),
    width: scale(30),
    height: scale(30),
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2ECC71',
  },
  bottomBar: {
    backgroundColor: '#0F172A',
    paddingVertical: verticalScale(24),
    paddingHorizontal: scale(20),
    borderTopWidth: 1,
    borderTopColor: '#334155',
    minHeight: verticalScale(110),
    justifyContent: 'center',
  },
  uploadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: verticalScale(10),
  },
  uploadingText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#2ECC71',
  },
  confirmationRow: {
    flexDirection: 'row',
    gap: scale(14),
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  retakeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  confirmButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2ECC71',
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  confirmText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  captureControlsRow: {
    alignItems: 'center',
    position: 'relative',
  },
  shutterOuter: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#2ECC71',
  },
  simButton: {
    position: 'absolute',
    right: 0,
    top: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
    gap: scale(4),
    borderWidth: 1,
    borderColor: '#334155',
  },
  simButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(10),
    color: '#94A3B8',
  },
});

export default CameraCaptureScreen;
