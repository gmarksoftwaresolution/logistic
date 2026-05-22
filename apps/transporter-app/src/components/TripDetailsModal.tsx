import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Pressable } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { X, Phone, Package, CheckCircle2, Navigation2, MapPin, LayoutGrid, ChevronRight } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { Trip, Stop } from './TripCard';
import StopDetailModal from './StopDetailModal';

interface TripDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip | null;
  onProductComplete: (stopId: string, productId: string, proofImage: string) => void;
}

const TripDetailsModal: React.FC<TripDetailsModalProps> = ({ visible, onClose, trip, onProductComplete }) => {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [stopDetailVisible, setStopDetailVisible] = useState(false);

  // Deriving the current stop from the trip prop to ensure fresh data
  const currentStop = useMemo(() => 
    trip?.stops.find(s => s.id === selectedStopId) || null
  , [trip?.stops, selectedStopId]);

  if (!trip) return null;


  const isInbound = trip.type === 'Inbound';
  const themeColor = isInbound ? '#10B981' : '#3B82F6';

  const handleStopPress = (stop: Stop) => {
    setSelectedStopId(stop.id);
    setStopDetailVisible(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed': return { bg: '#ECFDF5', text: '#059669', border: '#D1FAE5' };
      case 'Partial': return { bg: '#FFF7ED', text: '#D97706', border: '#FFEDD5' };
      default: return { bg: '#F8FAFC', text: '#64748B', border: '#F1F5F9' };
    }
  };

  const renderStopCard = (stop: Stop) => {
    const statusStyle = getStatusStyle(stop.status);
    const completedCount = stop.products.filter(p => p.status === 'Completed').length;
    const totalCount = stop.products.length;

    return (
      <TouchableOpacity 
        key={stop.id} 
        style={styles.stopCard}
        onPress={() => handleStopPress(stop)}
        activeOpacity={0.7}
      >
        <View style={styles.stopCardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{stop.status.toUpperCase()}</Text>
          </View>
          <View style={styles.actionTag}>
            <Text style={styles.actionTagText}>{stop.type}</Text>
          </View>
        </View>

        <Text style={styles.locationName}>{stop.locationName}</Text>
        
        <View style={styles.addressRow}>
          <MapPin size={scale(14)} color="#94A3B8" />
          <Text style={styles.addressText} numberOfLines={1}>{stop.address}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.progressSection}>
            <View style={styles.miniProgressBarBg}>
              <View style={[styles.miniProgressBarFill, { width: `${(completedCount / totalCount) * 100}%`, backgroundColor: themeColor }]} />
            </View>
            <Text style={styles.progressInfo}>{completedCount}/{totalCount} Items</Text>
          </View>
          <ChevronRight size={scale(18)} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
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
            <View>
              <Text style={styles.modalTitle}>{trip.tripId} Stops</Text>
              <Text style={styles.modalSubtitle}>Total {trip.stops.length} Independent Locations</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={scale(24)} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
          >
            {/* Overall Progress Widget */}
            <View style={styles.progressWidget}>
               <View style={styles.widgetHeader}>
                  <LayoutGrid size={scale(18)} color={themeColor} />
                  <Text style={styles.widgetTitle}>TOTAL TRIP PROGRESS</Text>
               </View>
               <View style={styles.widgetProgressRow}>
                  <View style={styles.largeProgressBarBg}>
                     <View style={[styles.largeProgressBarFill, { width: `${(trip.completedProducts / trip.totalProducts) * 100}%`, backgroundColor: themeColor }]} />
                  </View>
                  <Text style={styles.largeProgressText}>{Math.round((trip.completedProducts / (trip.totalProducts || 1)) * 100)}%</Text>
               </View>
               <Text style={styles.widgetSubtext}>{trip.completedProducts} of {trip.totalProducts} total products processed</Text>
            </View>

            <View style={styles.stopsGrid}>
              {trip.stops.map(stop => renderStopCard(stop))}
            </View>
          </ScrollView>

          <StopDetailModal
            visible={stopDetailVisible}
            onClose={() => setStopDetailVisible(false)}
            stop={currentStop}
            onProductComplete={(productId, proof) => onProductComplete(selectedStopId!, productId, proof)}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  backgroundPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    height: '94%',
    paddingBottom: Platform.OS === 'ios' ? verticalScale(30) : verticalScale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(24),
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  progressWidget: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    padding: scale(20),
    marginBottom: verticalScale(24),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(16),
  },
  widgetTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#64748B',
    letterSpacing: 0.5,
  },
  widgetProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
    marginBottom: verticalScale(10),
  },
  largeProgressBarBg: {
    flex: 1,
    height: verticalScale(10),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(5),
    overflow: 'hidden',
  },
  largeProgressBarFill: {
    height: '100%',
    borderRadius: scale(5),
  },
  largeProgressText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  widgetSubtext: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#94A3B8',
  },
  stopsGrid: {
    gap: verticalScale(16),
  },
  stopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(20),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
  },
  actionTag: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionTagText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#64748B',
  },
  locationName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  addressText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#94A3B8',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    flex: 1,
  },
  miniProgressBarBg: {
    width: scale(80),
    height: verticalScale(6),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    borderRadius: scale(3),
  },
  progressInfo: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#64748B',
  },
});

export default TripDetailsModal;
