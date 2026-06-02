import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, ActivityEntry } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, Clock, XCircle, CheckCircle, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WalkthroughElement from '../../components/WalkthroughElement';
import { useTranslation } from 'react-i18next';

const OrderManagementMainScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const {
    newOrdersCount,
    acceptedOrdersCount,
    rejectedOrdersCount,
    completedOrdersCount,
    activities,
  } = useOrderManagement();

  const lastOffsetY = useRef(0);
  const handleScroll = (event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > lastOffsetY.current ? 'down' : 'up';
    const diff = Math.abs(currentOffset - lastOffsetY.current);
    
    if (currentOffset <= 0) {
      DeviceEventEmitter.emit('show-tabbar');
    } else if (diff > 10) {
      if (direction === 'down' && currentOffset > 50) {
        DeviceEventEmitter.emit('hide-tabbar');
      } else if (direction === 'up') {
        DeviceEventEmitter.emit('show-tabbar');
      }
    }
    lastOffsetY.current = currentOffset;
  };

  const [showAllActivities, setShowAllActivities] = useState(false);

  // Helper for status badge dynamic colors inside the activity stream
  const getActivityBadgeStyle = (status: ActivityEntry['status']) => {
    switch (status) {
      case 'Picked':
      case 'PICKUP_COMPLETED':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Pickup Confirmed' };
      case 'Dropped':
      case 'DROP_COMPLETED':
      case 'Completed':
        return { bg: '#ECFDF5', text: '#059669', label: 'Delivered' };
      case 'Rejected':
        return { bg: '#FEE2E2', text: '#B91C1C', label: 'Rejected' };
      case 'Accepted':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Accepted' };
      default:
        return { bg: '#F1F5F9', text: '#64748B', label: status };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader 
        title={t('tabs.orderMgmt')} 
        subtitle={t('orders.order_mgmt_subtitle')} 
        showBackButton={true} 
        showProfile={false} 
        showHelp={true} 
        helpContent="This dashboard allows you to manage all active batches. View incoming orders, check accepted routes, and monitor live deliveries."
      />
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* Top Section: 4 Premium Summary Cards using precisely tailored HSL user parameters */}
        <View style={styles.statsGrid}>
          {/* 🔵 Card 1: New Orders (Blue) */}
          <WalkthroughElement stepId="assigned_orders_card" style={{ width: '48%', height: verticalScale(125) }}>
            <TouchableOpacity
              style={[styles.summaryCardWrapper, { width: '100%', shadowColor: '#1A2980' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CategoryOrders', { category: 'new' })}
            >
              <LinearGradient
                colors={['#1A2980', '#26D0CE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientCardInner}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardTitleCustom, { color: '#E0F7FA' }]}>{t('orders.new_orders')}</Text>
                  <View style={[styles.iconBoxCustom, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Package size={scale(16)} color="#FFFFFF" strokeWidth={2.5} />
                    <View style={[styles.badgeDotIndicator, { backgroundColor: '#00E5FF' }]} />
                  </View>
                </View>
                <View>
                  <Text style={styles.countNumberWhite}>{newOrdersCount}</Text>
                  <Text style={[styles.subtitleTextCustom, { color: '#B2EBF2' }]}>{t('orders.incoming_items')}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </WalkthroughElement>

          {/* 🟣 Card 2: Accepted (Purple) */}
          <TouchableOpacity
            style={[styles.summaryCardWrapper, { width: '48%', shadowColor: '#4A00E0' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AcceptedOrders')}
          >
            <LinearGradient
              colors={['#4A00E0', '#8E2DE2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCardInner}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitleCustom, { color: '#EDE7F6' }]}>{t('orders.accepted')}</Text>
                <View style={[styles.iconBoxCustom, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Clock size={scale(16)} color="#FFFFFF" strokeWidth={2.5} />
                  <View style={[styles.badgeDotIndicator, { backgroundColor: '#D500F9' }]} />
                </View>
              </View>
              <View>
                <Text style={styles.countNumberWhite}>{acceptedOrdersCount}</Text>
                <Text style={[styles.subtitleTextCustom, { color: '#D1C4E9' }]}>{t('orders.accepted_to_process')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* 🔴 Card 3: Rejected (Red) */}
          <TouchableOpacity
            style={[styles.summaryCardWrapper, { width: '48%', shadowColor: '#cb2d3e' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrderBatchRejected')}
          >
            <LinearGradient
              colors={['#cb2d3e', '#ef473a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCardInner}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitleCustom, { color: '#FFEBEE' }]}>{t('orders.rejected')}</Text>
                <View style={[styles.iconBoxCustom, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <XCircle size={scale(16)} color="#FFFFFF" strokeWidth={2.5} />
                  <View style={[styles.badgeDotIndicator, { backgroundColor: '#FF8A80' }]} />
                </View>
              </View>
              <View>
                <Text style={styles.countNumberWhite}>{rejectedOrdersCount}</Text>
                <Text style={[styles.subtitleTextCustom, { color: '#FFCDD2' }]}>{t('orders.with_reason')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* 🟢 Card 4: Completed (Green) */}
          <TouchableOpacity
            style={[styles.summaryCardWrapper, { width: '48%', shadowColor: '#11998e' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrderBatchCompleted')}
          >
            <LinearGradient
              colors={['#11998e', '#38ef7d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCardInner}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitleCustom, { color: '#E8F5E9' }]}>{t('orders.completed')}</Text>
                <View style={[styles.iconBoxCustom, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <CheckCircle size={scale(16)} color="#FFFFFF" strokeWidth={2.5} />
                  <View style={[styles.badgeDotIndicator, { backgroundColor: '#69F0AE' }]} />
                </View>
              </View>
              <View>
                <Text style={styles.countNumberWhite}>{completedOrdersCount}</Text>
                <Text style={[styles.subtitleTextCustom, { color: '#C8E6C9' }]}>{t('orders.successfully_delivered')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Bottom Section: Recent Activity Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('orders.recent_activities')}</Text>
          <TouchableOpacity onPress={() => setShowAllActivities(!showAllActivities)}>
            <Text style={styles.viewAllLink}>
              {showAllActivities ? t('common.view_less') : t('common.view_all')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Activity Stream List */}
        <View style={styles.activityListContainer}>
          {activities.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <History size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
              <Text style={styles.emptyActivityText}>{t('orders.no_recent_activities')}</Text>
            </View>
          ) : (
            activities.slice(0, showAllActivities ? activities.length : 3).map((act) => {
              const badge = getActivityBadgeStyle(act.status);

              return (
                <TouchableOpacity
                  key={act.id}
                  style={styles.activityCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    const isDropLeg = act.status === 'Dropped' || act.status === 'Completed' || act.status === 'DROP_COMPLETED';
                    const legType = isDropLeg ? 'drop' : 'pickup';
                    navigation.navigate('ActivityOrderDetail', { batchId: act.orderId, type: legType });
                  }}
                >
                  {/* Top Row */}
                  <View style={styles.activityTopRow}>
                    <Text style={styles.orderIdText} numberOfLines={1}>{act.orderId}</Text>
                    <View style={[styles.statusBadgePill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                        {(badge as any).label || act.status}
                      </Text>
                    </View>
                  </View>

                  {/* Route Handover Path */}
                  <View style={styles.activityRouteRow}>
                    <Text style={styles.routeText} numberOfLines={1}>
                      {act.route}
                    </Text>
                  </View>

                  {/* Footer Timestamp Stats */}
                  <View style={styles.activityFooterRow}>
                    <Text style={styles.activityStatText}>{act.qty} {t('orders.items')}</Text>
                    <View style={styles.dotSpacer} />
                    <Text style={styles.activityStatText}>{act.weight}</Text>
                    <Text style={styles.timestampText}>{act.timestamp}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(32), // Added gap between navbar and cards
    paddingBottom: verticalScale(120),
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: verticalScale(14),
    marginBottom: verticalScale(28),
  },
  summaryCardWrapper: {
    height: verticalScale(125),
    borderRadius: moderateScale(22),
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: verticalScale(6) },
        shadowOpacity: 0.25,
        shadowRadius: moderateScale(12),
      },
      android: {
        elevation: 6,
      },
    }),
  },
  gradientCardInner: {
    flex: 1,
    borderRadius: moderateScale(22),
    padding: moderateScale(16),
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    right: scale(-15),
    bottom: verticalScale(-15),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  cardTitleCustom: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
  },
  iconBoxCustom: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDotIndicator: {
    position: 'absolute',
    top: scale(2),
    right: scale(2),
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  countNumberWhite: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(26),
    color: '#FFFFFF',
    marginBottom: verticalScale(2),
  },
  subtitleTextCustom: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(10.5),
    opacity: 0.9,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(14),
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  viewAllLink: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.primary,
  },
  activityListContainer: {
    gap: verticalScale(12),
  },
  emptyActivityBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    gap: verticalScale(12),
  },
  emptyActivityText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.04,
        shadowRadius: moderateScale(12),
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  orderIdText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  statusBadgePill: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(10),
  },
  statusBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
  },
  activityRouteRow: {
    marginBottom: verticalScale(10),
  },
  routeText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: Colors.textPrimary,
  },
  activityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  activityStatText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  dotSpacer: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#CBD5E1',
  },
  timestampText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textPlaceholder,
    marginLeft: 'auto',
  },
});

export default OrderManagementMainScreen;
