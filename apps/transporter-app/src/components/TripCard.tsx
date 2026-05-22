import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { ArrowRight, MapPin, Package, Navigation2, ChevronRight, CornerDownRight } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

export interface Product {
  id: string;
  name: string;
  expectedQty: number;
  completedQty: number;
  status: 'Pending' | 'Completed';
  type: 'Pickup' | 'Drop';
  proofImage?: string;
}

export interface Stop {
  id: string;
  type: 'Pickup' | 'Drop';
  locationName: string;
  address: string;
  contact: string;
  products: Product[];
  status: 'Pending' | 'Partial' | 'Completed';
}

export interface Trip {
  id: string;
  tripId: string;
  type: 'Inbound' | 'Outbound';
  status: 'Assigned' | 'In Progress' | 'Completed';
  stops: Stop[];
  totalDistance: string;
  expectedTime: string;
  totalProducts: number;
  completedProducts: number;
}

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onPress }) => {
  const activeStop = trip.stops.find(s => s.status !== 'Completed') || trip.stops[trip.stops.length - 1];
  const totalStops = trip.stops.length;
  const completedStops = trip.stops.filter(s => s.status === 'Completed').length;
  
  const isInbound = trip.type === 'Inbound';
  const themeColor = isInbound ? '#10B981' : '#3B82F6'; // Emerald for Inbound, Blue for Outbound

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header: Trip ID & Type Badge */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tripId}>{trip.tripId}</Text>
          <View style={[styles.typeBadge, { backgroundColor: `${themeColor}15` }]}>
            <View style={[styles.typeDot, { backgroundColor: themeColor }]} />
            <Text style={[styles.typeText, { color: themeColor }]}>
              {trip.type.toUpperCase()} TRIP
            </Text>
          </View>
        </View>
        <View style={styles.metrics}>
          <Text style={styles.metricText}>{trip.totalDistance}</Text>
          <View style={styles.metricDot} />
          <Text style={styles.metricText}>{trip.expectedTime}</Text>
        </View>
      </View>

      {/* Route Visualization */}
      <View style={styles.routeContainer}>
        <View style={styles.routeSummary}>
          <View style={styles.stopPoint}>
            <Text style={styles.stopLabel}>{isInbound ? 'START' : 'HUB'}</Text>
            <Text style={styles.stopName} numberOfLines={1}>
              {trip.stops[0].locationName}
            </Text>
          </View>
          <View style={styles.routeLineContainer}>
            <View style={[styles.routeLine, { borderColor: themeColor }]} />
            <ArrowRight size={scale(16)} color={themeColor} />
          </View>
          <View style={styles.stopPoint}>
            <Text style={[styles.stopLabel, { textAlign: 'right' }]}>{isInbound ? 'HUB' : 'END'}</Text>
            <Text style={[styles.stopName, { textAlign: 'right' }]} numberOfLines={1}>
              {trip.stops[totalStops - 1].locationName}
            </Text>
          </View>
        </View>

        {/* Progress Tracker (Based on Products) */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(trip.completedProducts / trip.totalProducts) * 100}%`, backgroundColor: themeColor }]} />
          </View>
          <Text style={styles.progressText}>{trip.completedProducts}/{trip.totalProducts} Products</Text>
        </View>
      </View>

      {/* Trip Status Guidance */}
      <View style={styles.footer}>
        <View style={styles.nextActionContainer}>
          <View style={[styles.actionIconBg, { backgroundColor: `${themeColor}10` }]}>
            <Package size={scale(16)} color={themeColor} />
          </View>
          <View>
            <Text style={[styles.nextLabel, { color: themeColor }]}>CURRENT STATUS</Text>
            <Text style={styles.nextValue} numberOfLines={1}>
              {trip.status === 'Assigned' ? 'Ready to Start' : `${trip.completedProducts} of ${trip.totalProducts} items processed`}
            </Text>
          </View>
        </View>
        <ChevronRight size={scale(20)} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    padding: scale(16),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(20),
  },
  tripId: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
    gap: scale(6),
  },
  typeDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  typeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(10),
    gap: scale(6),
  },
  metricText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#64748B',
  },
  metricDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  routeContainer: {
    marginBottom: verticalScale(20),
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  stopPoint: {
    flex: 1,
  },
  stopLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#94A3B8',
    marginBottom: verticalScale(2),
  },
  stopName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  routeLineContainer: {
    flex: 0.8,
    alignItems: 'center',
    paddingHorizontal: scale(10),
  },
  routeLine: {
    width: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: -8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  progressBarBg: {
    flex: 1,
    height: verticalScale(6),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: scale(3),
  },
  progressText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#64748B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  nextActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    flex: 1,
  },
  actionIconBg: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: Colors.primary,
    marginBottom: verticalScale(2),
  },
  nextValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
});

export default React.memo(TripCard);
