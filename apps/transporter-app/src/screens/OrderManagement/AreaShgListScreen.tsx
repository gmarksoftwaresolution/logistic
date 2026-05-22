import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, ShgEntity } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Phone, MapPin, ChevronRight, Check } from 'lucide-react-native';

const AreaShgListScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { routeId, areaName } = route.params;
  const { routes, acceptShg, acceptAllRouteShgs } = useOrderManagement();

  // Find corresponding route object
  const currentRoute = routes.find((r) => r.id === routeId);
  const shgs: ShgEntity[] = currentRoute?.shgs || [];

  const hasUnacceptedShgs = shgs.some((s) => s.status === 'new');

  const getStatusBadgeStyles = (status: ShgEntity['status']) => {
    switch (status) {
      case 'accepted':
        return { bg: '#ECFDF5', text: '#059669', label: 'Accepted' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#059669', label: 'Completed' };
      default:
        return { bg: '#EFF6FF', text: '#2563EB', label: 'New Assignment' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={areaName}
        subtitle="Select SHG to process orders"
        showBackButton={true}
      />

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerInfoBox}>
          <MapPin size={scale(18)} color={Colors.primary} />
          <Text style={styles.headerInfoText}>
            Showing active Self Help Groups in {areaName} region
          </Text>
        </View>

        {/* Global Batch Action Trigger */}
        {hasUnacceptedShgs && (
          <TouchableOpacity
            style={styles.batchAcceptBtn}
            activeOpacity={0.85}
            onPress={() => acceptAllRouteShgs(routeId)}
          >
            <Check size={scale(16)} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.batchAcceptBtnText}>Accept All Route SHGs</Text>
          </TouchableOpacity>
        )}

        {shgs.map((shg) => {
          const isAccepted = shg.status !== 'new';
          const badge = getStatusBadgeStyles(shg.status);

          return (
            <TouchableOpacity
              key={shg.id}
              style={[
                styles.shgCard,
                { borderLeftColor: isAccepted ? '#10B981' : '#3B82F6' },
              ]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ShgDetail', {
                  shgId: shg.id,
                  shgName: shg.name,
                })
              }
            >
              {/* Card Header Row */}
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                    {badge.label}
                  </Text>
                </View>

                <View style={styles.mobileRow}>
                  <Phone size={scale(12)} color={Colors.textSecondary} />
                  <Text style={styles.mobileText}>{shg.mobile}</Text>
                </View>
              </View>

              {/* SHG Name */}
              <Text style={styles.shgName}>{shg.name}</Text>

              {/* Counts Grid */}
              <View style={styles.countsBox}>
                <View style={styles.countItem}>
                  <Text style={styles.countNum}>{shg.pickupCount}</Text>
                  <Text style={styles.countLabel}>Products to Pick Up</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.countItem}>
                  <Text style={styles.countNum}>{shg.dropCount}</Text>
                  <Text style={styles.countLabel}>Products to Drop</Text>
                </View>
              </View>

              {/* Footer row with Action Button inside */}
              <View style={styles.footerRow}>
                <View style={styles.exploreWrapper}>
                  <Text style={styles.exploreText}>Tap card to view items</Text>
                  <ChevronRight size={scale(14)} color={Colors.textPlaceholder} />
                </View>

                {/* Tapping the button itself intercepts to Accept */}
                {!isAccepted ? (
                  <TouchableOpacity
                    style={styles.acceptButton}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      e.stopPropagation(); // prevent card container press
                      acceptShg(shg.id);
                    }}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.acceptedLabelBox}>
                    <Check size={scale(14)} color="#10B981" strokeWidth={3} />
                    <Text style={styles.acceptedLabelText}>Accepted ✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    padding: scale(16),
    paddingBottom: verticalScale(120),
    gap: verticalScale(16),
  },
  headerInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    padding: scale(12),
    borderRadius: scale(10),
    gap: scale(8),
    marginBottom: verticalScale(4),
  },
  headerInfoText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    flex: 1,
  },
  batchAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981', // Clean premium emerald
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    gap: scale(6),
    marginBottom: verticalScale(4),
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  batchAcceptBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13.5),
    color: '#FFFFFF',
  },
  shgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: scale(5),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
  },
  statusBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  mobileText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  shgName: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(17),
    color: Colors.textPrimary,
    marginBottom: verticalScale(14),
  },
  countsBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(10),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  countItem: {
    flex: 1,
    alignItems: 'center',
  },
  countNum: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.primary,
    marginBottom: verticalScale(2),
  },
  countLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
  },
  divider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: verticalScale(12),
  },
  exploreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
  },
  exploreText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textPlaceholder,
  },
  acceptButton: {
    backgroundColor: '#2ECC71', // Primary green requested
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  acceptedLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: scale(4),
  },
  acceptedLabelText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#10B981',
  },
});

export default AreaShgListScreen;
