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
import { useOrderManagement } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, ArrowRight, CheckCircle, History } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const OrderBatchCompletedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { batches } = useOrderManagement();

  // Filter based on new lifecycle statuses
  const pickupCompleted = batches.filter((b) => 
    b.status === 'PICKUP_COMPLETED' || b.status === 'DROP_COMPLETED'
  );
  const dropCompleted = batches.filter((b) => b.status === 'DROP_COMPLETED');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('orders.completed_orders')}
        subtitle={t('orders.completed_orders_subtitle')}
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      <View style={{ height: verticalScale(14) }} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Prominent link to full consolidated history table */}
        <TouchableOpacity
          style={styles.historyLinkCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Order History')}
        >
          <View style={styles.historyCardLeft}>
            <View style={styles.historyIconCircle}>
              <History size={scale(20)} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.historyCardTitle}>{t('orders.view_order_history_master')}</Text>
              <Text style={styles.historyCardSub}>{t('orders.explore_complete_historical_ledger')}</Text>
            </View>
          </View>
          <ArrowRight size={scale(18)} color={Colors.primary} />
        </TouchableOpacity>

        {/* Pickup Completed Section */}
        <Text style={styles.sectionHeadingText}>{t('orders.pickup_completed_orders_count', { count: pickupCompleted.length })}</Text>
        {pickupCompleted.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
            <Text style={styles.emptyCardText}>{t('orders.no_pickup_completions')}</Text>
          </View>
        ) : (
          pickupCompleted.map((batch) => (
            <TouchableOpacity
              key={`${batch.id}-p`}
              style={styles.premiumBatchCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id, type: 'pickup' })}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.idGroup}>
                  <Text style={styles.batchIdText}>{batch.id}</Text>
                  <View style={[styles.successPill, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[styles.successPillText, { color: '#2563EB' }]}>{t('orders.status_pickup_completed')}</Text>
                  </View>
                </View>
                <CheckCircle size={scale(18)} color="#2563EB" strokeWidth={3} />
              </View>

              <Text style={styles.shgNameText}>{batch.shgName}</Text>
              
              <View style={styles.routeRow}>
                <Text style={styles.routeText} numberOfLines={1}>
                  {batch.flowType === 'gmu_to_shg' 
                    ? `Gadhinglaj Hub > ${batch.dropPointName}`
                    : `${batch.pickupPointName} > Gadhinglaj Hub`}
                </Text>
              </View>

              <View style={styles.metricsStrip}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValueText}>{batch.pickupCount}</Text>
                  <Text style={styles.metricLabelText}>{t('orders.items_label')}</Text>
                </View>
                <View style={styles.metricLine} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricValueText}>{batch.totalWeight}</Text>
                  <Text style={styles.metricLabelText}>{t('orders.weight_label')}</Text>
                </View>
                <View style={styles.metricLine} />
                <View style={styles.metricItem}>
                  <Text style={styles.timestampText}>{batch.timestamp || t('orders.just_now')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: verticalScale(20) }} />

        {/* Drop Completed Section */}
        <Text style={styles.sectionHeadingText}>{t('orders.drop_completed_orders_count', { count: dropCompleted.length })}</Text>
        {dropCompleted.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
            <Text style={styles.emptyCardText}>{t('orders.no_drop_completions')}</Text>
          </View>
        ) : (
          dropCompleted.map((batch) => (
            <TouchableOpacity
              key={`${batch.id}-d`}
              style={styles.premiumBatchCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id, type: 'drop' })}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.idGroup}>
                  <Text style={styles.batchIdText}>{batch.id}</Text>
                  <View style={[styles.successPill, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.successPillText, { color: '#059669' }]}>{t('orders.status_drop_completed')}</Text>
                  </View>
                </View>
                <CheckCircle size={scale(18)} color="#10B981" strokeWidth={3} />
              </View>

              <Text style={styles.shgNameText}>{batch.shgName}</Text>
              
              <View style={styles.routeRow}>
                <Text style={styles.routeText} numberOfLines={1}>
                  {batch.flowType === 'shg_to_gmu'
                    ? `${batch.pickupPointName} > Gadhinglaj Hub`
                    : `Gadhinglaj Hub > ${batch.dropPointName}`}
                </Text>
              </View>

              <View style={styles.metricsStrip}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValueText}>{batch.dropCount || batch.totalQty}</Text>
                  <Text style={styles.metricLabelText}>{t('orders.items_label')}</Text>
                </View>
                <View style={styles.metricLine} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricValueText}>{batch.totalWeight}</Text>
                  <Text style={styles.metricLabelText}>{t('orders.weight_label')}</Text>
                </View>
                <View style={styles.metricLine} />
                <View style={styles.metricItem}>
                  <Text style={styles.timestampText}>{batch.timestamp || t('orders.just_now')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(120),
    gap: verticalScale(16),
  },
  historyLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(12),
      },
      android: {
        elevation: 3,
      },
    }),
    marginBottom: verticalScale(8),
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  historyIconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  historyCardTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: '#166534',
  },
  historyCardSub: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#15803D',
    marginTop: verticalScale(2),
  },
  sectionHeadingText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
    marginTop: verticalScale(4),
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginTop: verticalScale(12),
    gap: verticalScale(12),
  },
  emptyCardText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  premiumBatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  batchIdText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  successPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  successPillText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: '#059669',
    textTransform: 'uppercase',
  },
  shgNameText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  routeRow: {
    marginBottom: verticalScale(12),
  },
  routeText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: Colors.textPrimary,
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(10),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValueText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  metricLabelText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: Colors.textPlaceholder,
  },
  metricLine: {
    width: 1,
    height: verticalScale(16),
    backgroundColor: '#E2E8F0',
    marginHorizontal: scale(4),
  },
  timestampText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(9),
    color: Colors.textPlaceholder,
  },
});

export default OrderBatchCompletedScreen;
