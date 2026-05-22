import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Platform, Dimensions, TouchableOpacity, Modal, DeviceEventEmitter } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Colors';
import ScreenHeader from '../components/ScreenHeader';
import { useTranslation } from 'react-i18next';
import { Wallet, Package, MapPin, TrendingUp, ArrowUpRight, ArrowDownRight, Map, Activity, CheckCircle2, Clock, Navigation, Star, ChevronDown, AlertTriangle, CheckSquare, Route, X } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '../context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC<any> = () => {
  const { t } = useTranslation();
  const { checkFirstLaunch } = useOnboarding();
  const [transporterName, setTransporterName] = useState('ABC');

  useEffect(() => {
    const loadTransporterName = async () => {
      try {
        const cached = await AsyncStorage.getItem('cached-profile-data');
        if (cached) {
          const parsed = JSON.parse(cached);
          const name = `${parsed.personalDetails?.firstName || ''} ${parsed.personalDetails?.lastName || ''}`.trim();
          if (name) {
            setTransporterName(name);
          }
        }
        
        const response = await api.get('/registration/me');
        if (response.data?.personalDetails) {
          const name = `${response.data.personalDetails.firstName || ''} ${response.data.personalDetails.lastName || ''}`.trim();
          if (name) {
            setTransporterName(name);
            await AsyncStorage.setItem('cached-profile-data', JSON.stringify(response.data));
          }
        }
      } catch (err) {
        console.error('Failed to load transporter name on Dashboard:', err);
      }
    };
    loadTransporterName();
  }, []);

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

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const [earningsFilter, setEarningsFilter] = useState<'Today' | 'Yesterday' | 'This Week' | 'Custom'>('Today');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date());

  interface AlertItem {
    id: string;
    key?: string;
    params?: Record<string, any>;
    text?: string;
    time: string;
    type: string;
  }

  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: '1', key: 'home.pickup_delayed', params: { shg: 'SHG Kagal' }, time: '10 mins ago', type: 'error' },
    { id: '2', key: 'home.shg_not_ready', params: { shg: 'SHG Shirgaon' }, time: '1 hour ago', type: 'warning' },
    { id: '3', key: 'home.route_deviation', params: { route: 'Highway 4' }, time: '2 hours ago', type: 'error' },
    { id: '4', key: 'home.traffic_delay', params: { location: 'Toll Plaza' }, time: '3 hours ago', type: 'warning' },
    { id: '5', key: 'home.verification_pending', time: '4 hours ago', type: 'error' },
  ]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getFilterLabel = (filter: string) => {
    switch(filter) {
      case 'Today': return t('orders.today');
      case 'Yesterday': return t('orders.yesterday');
      case 'This Week': return t('common.this_week', { defaultValue: 'This Week' });
      case 'Custom': return t('orders.filter_by_date');
      default: return filter;
    }
  };

  const earningsData: Record<string, any> = useMemo(() => ({
    'Today': { 
      amount: '₹ 850', 
      trend: `+5% ${t('home.vs_yesterday', { defaultValue: 'vs yesterday' })}`,
      pickupsDrops: `8 ${t('orders.pickup_orders')} • 5 ${t('orders.drop_orders')}`,
      routeDone: `70% ${t('home.route_done', { percent: '' })}`,
      shiftStatus: t('home.ongoing_shift'),
      shiftTime: `${t('home.shift', { defaultValue: 'Shift' })}: 08:00 AM - 04:00 PM`
    },
    'Yesterday': { 
      amount: '₹ 1,200', 
      trend: `-2% ${t('home.vs_day_before', { defaultValue: 'vs day before' })}`,
      pickupsDrops: `12 ${t('orders.pickup_orders')} • 12 ${t('orders.drop_orders')}`,
      routeDone: `100% ${t('home.route_done', { percent: '' })}`,
      shiftStatus: t('home.completed_shift'),
      shiftTime: `${t('home.shift', { defaultValue: 'Shift' })}: 08:00 AM - 04:00 PM`
    },
    'This Week': { 
      amount: '₹ 4,250', 
      trend: `+12% ${t('home.vs_last_week', { defaultValue: 'vs last week' })}`,
      pickupsDrops: `54 ${t('orders.pickup_orders')} • 54 ${t('orders.drop_orders')}`,
      routeDone: `100% ${t('home.route_done', { percent: '' })}`,
      shiftStatus: t('home.all_shifts_completed'),
      shiftTime: `${t('home.shift', { defaultValue: 'Shift' })}: 08:00 AM - 04:00 PM`
    },
    'Custom': { 
      amount: '₹ 5,800', 
      trend: `${t('orders.filter_by_date')}: ${customDate.toLocaleDateString()}`,
      pickupsDrops: `72 ${t('orders.pickup_orders')} • 72 ${t('orders.drop_orders')}`,
      routeDone: `100% ${t('home.route_done', { percent: '' })}`,
      shiftStatus: t('home.all_shifts_completed'),
      shiftTime: `${t('home.shift', { defaultValue: 'Shift' })}: 08:00 AM - 04:00 PM`
    },
  }), [t, customDate]);

  return (
    <SafeAreaView style={styles.safeArea}>
        <ScreenHeader 
          title={t('home.greeting', { name: transporterName })} 
          subtitle={t('home.daily_overview')} 
          showProfile={true}
          showHelp={true}
        />

      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Earnings Card (Preserved) */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.earningsCard}
        >
          <View style={styles.earningsHeader}>
            <View style={styles.earningsIconBg}>
              <Wallet size={scale(20)} color="#059669" />
            </View>
            <TouchableOpacity style={styles.earningsBadge} onPress={() => setShowDropdown(true)} activeOpacity={0.7}>
              <Text style={styles.earningsBadgeText}>{getFilterLabel(earningsFilter)}</Text>
              <ChevronDown size={scale(14)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.earningsLabel}>{t('home.total_earnings')}</Text>
          <View style={styles.earningsAmountRow}>
            <Text style={styles.earningsAmount}>{earningsData[earningsFilter].amount}</Text>
            <View style={styles.earningsFooter}>
              <TrendingUp size={scale(12)} color="#D1FAE5" />
              <Text style={styles.earningsTrendText}>{earningsData[earningsFilter].trend}</Text>
            </View>
          </View>

          {/* Separator Line */}
          <View style={styles.earningsDivider} />

          {/* Progress Rows */}
          <View style={styles.earningsProgressRow}>
            <Text style={styles.earningsProgressText}>{earningsData[earningsFilter].pickupsDrops}</Text>
            <Text style={styles.earningsProgressSubtext}>{earningsData[earningsFilter].shiftTime}</Text>
          </View>

          <View style={[styles.earningsProgressRow, { marginTop: verticalScale(4) }]}>
            <Text style={styles.earningsProgressHighlight}>{earningsData[earningsFilter].routeDone}</Text>
            <Text style={styles.earningsProgressSubtext}>{earningsData[earningsFilter].shiftStatus}</Text>
          </View>
        </LinearGradient>

        {/* Alerts Section (Moved & Styled for Production) */}
        <View style={styles.sectionHeaderLine}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
            <Text style={styles.sectionTitle}>{t('home.alerts')}</Text>
            <AlertTriangle size={scale(18)} color={alerts.length > 0 ? "#EF4444" : "#10B981"} style={{ marginTop: verticalScale(2) }} />
          </View>
        </View>

        {alerts.length > 0 ? (
          <View style={styles.alertsContainer}>
            <ScrollView 
              style={styles.alertsScrollView} 
              contentContainerStyle={{ paddingRight: scale(12) }}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
              nestedScrollEnabled={true}
            >
              {alerts.map((alert, index) => (
                <View key={alert.id}>
                  <View style={styles.alertItem}>
                    <View style={styles.alertLeft}>
                      <AlertTriangle 
                        size={scale(16)} 
                        color={alert.type === 'error' ? '#EF4444' : '#F59E0B'} 
                        style={styles.alertIcon} 
                      />
                      <View style={styles.alertContent}>
                        <Text style={styles.alertText}>{alert.key ? t(alert.key, alert.params) : alert.text}</Text>
                        <Text style={styles.alertTime}>{alert.time}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => dismissAlert(alert.id)} style={styles.alertDismissBtn} activeOpacity={0.7}>
                      <X size={scale(16)} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  {index < alerts.length - 1 && <View style={styles.alertDivider} />}
                </View>
              ))}
            </ScrollView>
            {alerts.length > 2 && (
              <View style={styles.alertScrollIndicator}>
                <Text style={styles.alertScrollIndicatorText}>{t('home.scroll_down_more', { count: alerts.length })}</Text>
                <ChevronDown size={scale(12)} color="#991B1B" style={styles.alertScrollIndicatorIcon} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.alertsEmptyContainer}>
            <Text style={styles.alertsEmptyText}>🎉 {t('home.all_caught_up')}</Text>
            <TouchableOpacity 
              style={styles.alertsResetBtn} 
              onPress={() => setAlerts([
                { id: '1', key: 'home.pickup_delayed', params: { shg: 'SHG Kagal' }, time: '10 mins ago', type: 'error' },
                { id: '2', key: 'home.shg_not_ready', params: { shg: 'SHG Shirgaon' }, time: '1 hour ago', type: 'warning' },
                { id: '3', key: 'home.route_deviation', params: { route: 'Highway 4' }, time: '2 hours ago', type: 'error' },
                { id: '4', key: 'home.traffic_delay', params: { location: 'Toll Plaza' }, time: '3 hours ago', type: 'warning' },
                { id: '5', key: 'home.verification_pending', time: '4 hours ago', type: 'error' },
              ])} 
              activeOpacity={0.7}
            >
              <Text style={styles.alertsResetText}>{t('home.reload_alerts')}</Text>
            </TouchableOpacity>
          </View>
        )}





        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.current_operations')}</Text>
        </View>

        {/* Pending Operations Grid (Preserved) */}
        <View style={styles.operationsGrid}>
          {/* Pickups Pending */}
          <View style={styles.operationCard}>
            <View style={styles.operationHeader}>
              <View style={[styles.operationIconWrapper, { backgroundColor: '#EFF6FF' }]}>
                <Package size={scale(24)} color="#3B82F6" />
                <View style={styles.operationBadge}>
                  <ArrowUpRight size={scale(12)} color="#FFFFFF" />
                </View>
              </View>
              <Text style={[styles.operationCount, { color: '#3B82F6' }]}>12</Text>
            </View>
            <Text style={styles.operationTitle}>{t('home.pickups_pending')}</Text>
            <Text style={styles.operationDesc}>{t('home.pickups_desc')}</Text>
          </View>

          {/* Drops Pending */}
          <View style={styles.operationCard}>
            <View style={styles.operationHeader}>
              <View style={[styles.operationIconWrapper, { backgroundColor: '#FFF7ED' }]}>
                <MapPin size={scale(24)} color="#F97316" />
                <View style={[styles.operationBadge, { backgroundColor: '#F97316' }]}>
                  <ArrowDownRight size={scale(12)} color="#FFFFFF" />
                </View>
              </View>
              <Text style={[styles.operationCount, { color: '#F97316' }]}>8</Text>
            </View>
            <Text style={styles.operationTitle}>{t('home.drops_pending')}</Text>
            <Text style={styles.operationDesc}>{t('home.drops_desc')}</Text>
          </View>
        </View>



        {/* Performance Analytics */}
        <View style={styles.sectionHeaderLine}>
          <Text style={styles.sectionTitle}>{t('home.performance_analytics')}</Text>
        </View>
        
        <View style={styles.analyticsGrid}>
          {/* On-Time Card */}
          <View style={styles.analyticsGridCard}>
            <TrendingUp size={scale(24)} color="#10B981" style={styles.analyticsGridIcon} />
            <Text style={styles.analyticsGridValue}>98.5%</Text>
            <Text style={styles.analyticsGridLabel}>{t('home.on_time')}</Text>
          </View>
          
          {/* Accuracy Card */}
          <View style={styles.analyticsGridCard}>
            <CheckCircle2 size={scale(24)} color="#10B981" style={styles.analyticsGridIcon} />
            <Text style={styles.analyticsGridValue}>100%</Text>
            <Text style={styles.analyticsGridLabel}>{t('home.accuracy')}</Text>
          </View>
          
          {/* Distance Card */}
          <View style={styles.analyticsGridCard}>
            <Navigation size={scale(24)} color="#3B82F6" style={styles.analyticsGridIcon} />
            <Text style={styles.analyticsGridValue}>42.8 km</Text>
            <Text style={styles.analyticsGridLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.total_distance')}</Text>
          </View>
          
          {/* Rating Card (replacing Rejections) */}
          <View style={styles.analyticsGridCard}>
            <Star size={scale(24)} color="#F59E0B" style={styles.analyticsGridIcon} />
            <Text style={styles.analyticsGridValue}>4.9</Text>
            <Text style={styles.analyticsGridLabel}>{t('home.rating')}</Text>
          </View>
        </View>



        {/* Extra padding at bottom for tab bar */}
        <View style={{ height: verticalScale(100) }} />
      </ScrollView>

      {/* Filter Dropdown Modal */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdownContainer}>
            {['Today', 'Yesterday', 'This Week', 'Custom'].map((option) => (
              <TouchableOpacity 
                key={option} 
                style={styles.dropdownOption}
                onPress={() => {
                  if (option === 'Custom') {
                    setShowDropdown(false);
                    setShowDatePicker(true);
                  } else {
                    setEarningsFilter(option as any);
                    setShowDropdown(false);
                  }
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  earningsFilter === option && styles.dropdownOptionTextActive
                ]}>{getFilterLabel(option)}</Text>
                {earningsFilter === option && <CheckCircle2 size={scale(16)} color="#10B981" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker for Custom Range */}
      {showDatePicker && (
        <DateTimePicker
          value={customDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setCustomDate(selectedDate);
              setEarningsFilter('Custom');
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    flexGrow: 1,
  },
  earningsCard: {
    borderRadius: moderateScale(20),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  earningsIconBg: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  earningsBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
  earningsLabel: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#D1FAE5',
    marginBottom: verticalScale(2),
  },
  earningsAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  earningsAmount: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(28),
    color: '#FFFFFF',
  },
  earningsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
  },
  earningsTrendText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#FFFFFF',
  },
  earningsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: verticalScale(8),
  },
  earningsProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsProgressText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  earningsProgressHighlight: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13),
    color: '#D1FAE5',
  },
  earningsProgressSubtext: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.75)',
  },
  sectionHeader: {
    marginBottom: verticalScale(12),
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    marginTop: verticalScale(8),
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  operationsGrid: {
    flexDirection: 'row',
    gap: scale(16),
    marginBottom: verticalScale(24),
  },
  operationCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: scale(16),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  operationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(16),
  },
  operationIconWrapper: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  operationBadge: {
    position: 'absolute',
    bottom: -scale(4),
    right: -scale(4),
    backgroundColor: '#3B82F6',
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  operationCount: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(28),
  },
  operationTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  operationDesc: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    lineHeight: moderateScale(14),
  },
  flowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timelineContainer: {
    paddingLeft: scale(4),
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIconCol: {
    alignItems: 'center',
    width: scale(24),
    marginRight: scale(12),
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: verticalScale(4),
  },
  currentPulse: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#3B82F6',
  },
  futureDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: verticalScale(24),
  },
  timelineVillageCompleted: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  timelineStatusCompleted: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#10B981',
    marginTop: verticalScale(2),
  },
  timelineVillageCurrent: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: '#3B82F6',
  },
  timelineStatusCurrent: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  timelineVillageFuture: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(15),
    color: '#94A3B8',
  },
  timelineStatusFuture: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#94A3B8',
    marginTop: verticalScale(2),
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: scale(12),
    marginBottom: verticalScale(24),
  },
  analyticsGridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: scale(20),
    alignItems: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  analyticsGridIcon: {
    marginBottom: verticalScale(12),
  },
  analyticsGridValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(22),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  analyticsGridLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    width: width * 0.8,
    borderRadius: moderateScale(16),
    padding: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(12),
  },
  dropdownOptionText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  dropdownOptionTextActive: {
    fontFamily: Fonts.bold,
    color: '#10B981',
  },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: verticalScale(8),
  },
  progressLabel: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
  },
  progressValue: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  progressDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: verticalScale(16),
  },
  progressRouteLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  progressRouteValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(18),
    color: '#10B981',
  },
  progressBarBg: {
    height: verticalScale(8),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(4),
    marginBottom: verticalScale(10),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: scale(4),
  },
  alertsContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: moderateScale(16),
    padding: scale(12),
    borderWidth: 1.2,
    borderColor: '#FEE2E2',
    marginBottom: verticalScale(20),
  },
  alertsScrollView: {
    maxHeight: verticalScale(200),
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: verticalScale(4),
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: scale(8),
  },
  alertIcon: {
    marginTop: verticalScale(2),
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#991B1B',
  },
  alertTime: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#F87171',
    marginTop: verticalScale(1),
  },
  alertDismissBtn: {
    padding: scale(4),
    marginLeft: scale(8),
  },
  alertDivider: {
    height: 1,
    backgroundColor: '#FCA5A5',
    opacity: 0.3,
    marginVertical: verticalScale(6),
  },
  alertScrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    marginTop: verticalScale(6),
    paddingTop: verticalScale(4),
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  alertScrollIndicatorText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#991B1B',
    opacity: 0.7,
  },
  alertScrollIndicatorIcon: {
    opacity: 0.7,
  },
  alertsEmptyContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(16),
    padding: scale(12),
    borderWidth: 1.2,
    borderColor: '#DCFCE7',
    marginBottom: verticalScale(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertsEmptyText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#15803D',
    flex: 1,
  },
  alertsResetBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
  },
  alertsResetText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
});

export default DashboardScreen;
