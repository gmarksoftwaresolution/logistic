import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { Phone, Clock, Box, ArrowRight, MapPin, ChevronRight, Navigation } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface TaskCardProps {
  task: {
    orderId: string;
    category: string;
    status: string;
    shgName: string;
    address: string;
    phone: string;
    pickupCount: number;
    dropCount: number;
    time: string;
  };
  onViewDetails: () => void;
  onAccept: () => void;
  onReject: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onViewDetails, onAccept, onReject }) => {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onViewDetails}
      activeOpacity={0.9}
    >
      {/* Top Section: Order ID & Status */}
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>{task.orderId}</Text>
          <View style={[styles.statusBadge, task.status === 'Accepted' && { backgroundColor: '#E0F2FE' }]}>
            <View style={[styles.statusDot, task.status === 'Accepted' && { backgroundColor: '#0EA5E9' }]} />
            <Text style={[styles.statusText, task.status === 'Accepted' && { color: '#0EA5E9' }]}>{task.status.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewLink} onPress={onViewDetails}>
          <Text style={styles.viewLinkText}>DETAILS</Text>
          <ChevronRight size={scale(12)} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Middle Section: Route Visualization (Perfectly Aligned) */}
      <View style={styles.routeSection}>
        {/* Pickup Row */}
        <View style={styles.timelineRow}>
          <View style={styles.dotColumn}>
            <View style={styles.pickupDot} />
            <View style={styles.dottedLine} />
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>PICKUP</Text>
            <Text style={styles.locationTitle}>{task.shgName}</Text>
            <Text style={styles.locationSubtitle} numberOfLines={1}>{task.address}</Text>
          </View>
        </View>

        {/* Drop Row */}
        <View style={[styles.timelineRow, { marginTop: verticalScale(12) }]}>
          <View style={styles.dotColumn}>
            <View style={styles.dropDot} />
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>DROP</Text>
            <Text style={styles.locationTitle}>Central Hub Warehouse</Text>
            <Text style={styles.locationSubtitle}>Sector 12, Logistics Park</Text>
          </View>
        </View>

        {/* Phone Action */}
        <TouchableOpacity style={styles.phoneButton} onPress={() => {}}>
          <Phone size={scale(14)} color={Colors.primary} fill={Colors.primary} />
          <Text style={styles.phoneButtonText}>{task.phone}</Text>
        </TouchableOpacity>
      </View>

      {/* Info Grid: Load & Time */}
      <View style={styles.infoGrid}>
        <View style={styles.infoChip}>
          <View style={[styles.iconBg, { backgroundColor: '#F0F9F4' }]}>
            <Box size={scale(16)} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.chipLabel}>LOAD</Text>
            <Text style={styles.chipValue}>{task.pickupCount}P | {task.dropCount}D</Text>
          </View>
        </View>

        <View style={styles.infoChip}>
          <View style={[styles.iconBg, { backgroundColor: '#FFF7ED' }]}>
            <Clock size={scale(16)} color="#F97316" />
          </View>
          <View>
            <Text style={styles.chipLabel}>EST. TIME</Text>
            <Text style={styles.chipValue}>{task.time}</Text>
          </View>
        </View>
      </View>

      {/* Footer: Actions */}
      <View style={styles.footer}>
        {task.status === 'Accepted' ? (
          <TouchableOpacity 
            style={[styles.primaryBtn, { flex: 1 }]} 
            onPress={() => Alert.alert("Start Pickup", "Starting pickup sequence...")}
          >
            <Text style={styles.primaryBtnText}>Start Pickup</Text>
            <ArrowRight size={scale(18)} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onReject}>
              <Text style={styles.secondaryBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={onAccept}>
              <Text style={styles.primaryBtnText}>Accept Task</Text>
              <ArrowRight size={scale(18)} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: scale(14),
    marginBottom: verticalScale(12),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  orderId: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    gap: scale(5),
  },
  statusDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
    backgroundColor: Colors.success,
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: Colors.success,
    letterSpacing: 0.4,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    backgroundColor: Colors.primary + '08',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
  },
  viewLinkText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: verticalScale(12),
  },
  routeSection: {
    marginBottom: verticalScale(14),
  },
  timelineRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  dotColumn: {
    alignItems: 'center',
    width: scale(10),
    paddingTop: verticalScale(4), // Aligns dot with "PICKUP/DROP" text
  },
  pickupDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  dropDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#FFEDD5',
  },
  dottedLine: {
    width: 1.5,
    height: verticalScale(40), // Spans between the two dots
    backgroundColor: '#F1F5F9',
    marginTop: verticalScale(4),
  },
  addressBlock: {
    flex: 1,
    gap: verticalScale(0),
  },
  addressLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  locationTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: Colors.textPrimary,
  },
  locationSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(14),
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(16),
  },
  infoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: '#F8FAFC',
    padding: scale(8),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBg: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: '#94A3B8',
  },
  chipValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    gap: scale(10),
  },
  secondaryBtn: {
    flex: 1,
    height: verticalScale(44),
    borderRadius: scale(12),
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#64748B',
    includeFontPadding: false,
  },
  primaryBtn: {
    flex: 2,
    height: verticalScale(44),
    borderRadius: scale(12),
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});

export default React.memo(TaskCard);
