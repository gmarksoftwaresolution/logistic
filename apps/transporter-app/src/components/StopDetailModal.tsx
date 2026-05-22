import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { X, Phone, Package, CheckCircle2, Camera, MapPin, AlertCircle } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import * as ImagePicker from 'expo-image-picker';
import { Stop, Product } from './TripCard';

interface StopDetailModalProps {
  visible: boolean;
  onClose: () => void;
  stop: Stop | null;
  onProductComplete: (productId: string, proofImage: string) => void;
}

// Memoized Product Item for Performance
const ProductItem = React.memo(({ 
  product, 
  onAction, 
  isProcessing 
}: { 
  product: Product; 
  onAction: (p: Product) => void; 
  isProcessing: boolean 
}) => {
  const isDone = product.status === 'Completed';

  return (
    <View style={[styles.productRow, isDone && styles.completedRow]}>
      <View style={{ flex: 2 }}>
        <Text style={[styles.productName, isDone && styles.completedText]}>{product.name}</Text>
        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>{product.type}</Text>
        </View>
      </View>
      
      <View style={{ flex: 1.2, alignItems: 'center' }}>
        <Text style={styles.qtyText}>
          {product.expectedQty} / <Text style={{ color: isDone ? '#10B981' : Colors.textPrimary }}>{product.completedQty}</Text>
        </Text>
      </View>

      <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
        {isDone ? (
          <View style={styles.doneContainer}>
            {product.proofImage && (
              <Image 
                source={{ uri: product.proofImage }} 
                style={styles.proofThumbnail} 
              />
            )}
            <View style={styles.doneBadge}>
              <CheckCircle2 size={scale(16)} color="#10B981" />
              <Text style={styles.doneText}>Done</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.actionBtn, 
              { backgroundColor: product.type === 'Pickup' ? '#10B981' : '#3B82F6' },
              isProcessing && { opacity: 0.7 }
            ]}
            onPress={() => onAction(product)}
            disabled={isProcessing}
            activeOpacity={0.6}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Camera size={scale(14)} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>{product.type}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const StopDetailModal: React.FC<StopDetailModalProps> = ({ visible, onClose, stop, onProductComplete }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Pre-request permissions when modal becomes visible
  useEffect(() => {
    if (visible) {
      (async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Camera permission not granted');
        }
      })();
    }
  }, [visible]);

  const handleCaptureProof = useCallback(async (product: Product) => {
    try {
      setProcessingId(product.id);
      
      // Final permission check before launch
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable camera permissions in your settings.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        // removed allowsEditing for better stability across devices
      });

      if (!result.canceled) {
        onProductComplete(product.id, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera Error:', error);
      Alert.alert('Camera Error', 'The camera could not be opened. This might be due to device restrictions or a missing camera.');
    } finally {
      setProcessingId(null);
    }
  }, [onProductComplete]);

  if (!stop) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#10B981';
      case 'Partial': return '#F59E0B';
      default: return '#94A3B8';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backgroundPressable} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <View style={styles.headerInfo}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(stop.status) }]} />
              <View>
                <Text style={styles.modalTitle}>{stop.locationName}</Text>
                <Text style={styles.modalSubtitle}>{stop.type} Location • {stop.products.length} Products</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={scale(24)} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MapPin size={scale(18)} color="#64748B" />
                <Text style={styles.infoText}>{stop.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Phone size={scale(18)} color="#64748B" />
                <Text style={styles.infoText}>{stop.contact}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Product Inventory</Text>
            
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>PRODUCT</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>QTY (E/C)</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>ACTION</Text>
            </View>

            {stop.products.map((product) => (
              <ProductItem 
                key={product.id}
                product={product}
                onAction={handleCaptureProof}
                isProcessing={processingId === product.id}
              />
            ))}

            {stop.status === 'Completed' && (
              <View style={styles.completionBanner}>
                <CheckCircle2 size={scale(24)} color="#10B981" />
                <Text style={styles.completionBannerText}>All products processed successfully!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  backgroundPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    height: '90%',
    paddingBottom: verticalScale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(24),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  statusIndicator: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#64748B',
  },
  closeBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: scale(20),
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: verticalScale(24),
    gap: verticalScale(12),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  infoText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: '#475569',
    flex: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
    marginBottom: verticalScale(16),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
    marginBottom: verticalScale(8),
  },
  tableHeaderCell: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#64748B',
    letterSpacing: 0.5,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  completedRow: {
    backgroundColor: '#F0FDF430',
  },
  productName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  completedText: {
    color: '#10B981',
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  typeTag: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeTagText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#64748B',
  },
  qtyText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    width: scale(80),
    height: verticalScale(34),
    borderRadius: scale(8),
  },
  actionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#FFFFFF',
  },
  doneContainer: {
    alignItems: 'flex-end',
    gap: verticalScale(4),
  },
  proofThumbnail: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    width: scale(80),
    justifyContent: 'flex-end',
  },
  doneText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#10B981',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: scale(16),
    borderRadius: scale(16),
    marginTop: verticalScale(32),
    gap: scale(12),
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  completionBannerText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#065F46',
    flex: 1,
  },
});

export default StopDetailModal;
