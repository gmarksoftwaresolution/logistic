import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, BatchOrder, HUB_CONTACT } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, MapPin, ChevronDown, ChevronRight, Eye } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FloatingScannerButton } from '../../components/FloatingScannerButton/FloatingScannerButton';

type DisplayEntry = { batch: BatchOrder; type: 'pickup' | 'drop' };

const AcceptedOrdersScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { batches, refreshBatchesList } = useOrderManagement();
  const [activeTab, setActiveTab] = useState<'pickup' | 'drop'>('pickup');
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBatchesList().catch(err => console.log('Error refreshing batches on focus:', err));
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBatchesList();
    } catch (e) {
      console.error('Failed to refresh batches:', e);
    } finally {
      setRefreshing(false);
    }
  };
  const pagerRef = React.useRef<ScrollView>(null);
  const { width: screenWidth } = Dimensions.get('window');
  const scrollX = React.useRef(new Animated.Value(0)).current;

  // Automatically scroll and switch tabs if navigated with activeTab param
  React.useEffect(() => {
    if (route.params?.activeTab) {
      const tab = route.params.activeTab;
      setActiveTab(tab);
      if (tab === 'drop') {
        setTimeout(() => {
          pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
        }, 100);
      } else {
        setTimeout(() => {
          pagerRef.current?.scrollTo({ x: 0, animated: true });
        }, 100);
      }
    }
  }, [route.params?.activeTab, screenWidth]);



  const handleNavigate = (batch: BatchOrder, type: 'pickup' | 'drop') => {
    const isPickup = type === 'pickup';
    const isHubPoint = isPickup 
      ? (batch.pickupPointName === 'Gadhinglaj Hub' || batch.pickupPointName === 'Central Hub GMU')
      : (batch.dropPointName === 'Gadhinglaj Hub' || batch.dropPointName === 'Central Hub GMU');
    
    const contact = isHubPoint ? HUB_CONTACT : batch.shgContact;
    
    const queryAddress = [
      contact.address,
      (contact as any).village,
      (contact as any).pincode,
      'Maharashtra',
      'India'
    ].filter(Boolean).join(', ');

    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryAddress)}`
    );
  };

  const getCounts = (b: BatchOrder) => {
    const total = b.products.length || 1;
    return { pickup: total, drop: total };
  };

  // Route Corridor Rank Index (Order along the regional route corridor)
  const ROUTE_CORRIDOR_RANK: Record<string, number> = {
    'gadhinglaj hub': 1,
    'gadhinglaj': 2,
    'dundage': 3,
    'halkarni': 4,
    'bhadagaon': 5,
    'mahagaon': 6,
    'wagharale': 7,
    'inchanal': 8,
    'nesari': 9,
  };

  const getBatchSequenceRank = (batch: BatchOrder, locationType: 'pickup' | 'drop'): number => {
    if ((batch as any).routeSequence !== undefined) return Number((batch as any).routeSequence);
    if ((batch as any).stopOrder !== undefined) return Number((batch as any).stopOrder);
    if ((batch as any).sequence !== undefined) return Number((batch as any).sequence);

    const locName = locationType === 'pickup' 
      ? (batch.pickupPointName || batch.areaName) 
      : (batch.dropPointName || batch.areaName);

    if (!locName) return 50;

    const normalized = locName.toLowerCase().trim();
    for (const [key, rank] of Object.entries(ROUTE_CORRIDOR_RANK)) {
      if (normalized.includes(key)) return rank;
    }

    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash |= 0;
    }
    return 100 + (Math.abs(hash) % 500);
  };

  // 1. Pickups & Drops Data with Dynamic Route Corridor Sequencing
  const { sortedPickupEntries, sortedDropEntries, totalPickups, totalDrops, pickupOrderIds, dropOrderIds } = useMemo(() => {
    // 1. Pickups Data
    const pickupBatches = batches.filter((b) => b.status === 'ACCEPTED_PICKUP');
    const pickupDisplayEntries: DisplayEntry[] = [];
    pickupBatches.forEach(b => {
      pickupDisplayEntries.push({ batch: b, type: 'pickup' });
    });

    // Sort Pickup Entries by Route Corridor Execution Order:
    // Phase 1: Hub Pickups (From Gadhinglaj Hub) sorted by destination route rank
    // Phase 2: Village Pickups (From Village SHG) sorted by origin route rank
    // Same contact / location sit adjacent
    const sortedPickupEntries = [...pickupDisplayEntries].sort((a, b) => {
      const isHubA = a.batch.pickupPointName === 'Gadhinglaj Hub' || a.batch.flowType === 'gmu_to_shg';
      const isHubB = b.batch.pickupPointName === 'Gadhinglaj Hub' || b.batch.flowType === 'gmu_to_shg';

      if (isHubA !== isHubB) {
        return isHubA ? -1 : 1;
      }

      if (isHubA) {
        const destRankA = getBatchSequenceRank(a.batch, 'drop');
        const destRankB = getBatchSequenceRank(b.batch, 'drop');
        if (destRankA !== destRankB) return destRankA - destRankB;
      } else {
        const originRankA = getBatchSequenceRank(a.batch, 'pickup');
        const originRankB = getBatchSequenceRank(b.batch, 'pickup');
        if (originRankA !== originRankB) return originRankA - originRankB;
      }

      const contactA = (a.batch.shgContact?.phone || a.batch.shgContact?.name || a.batch.shgName || '').toLowerCase();
      const contactB = (b.batch.shgContact?.phone || b.batch.shgContact?.name || b.batch.shgName || '').toLowerCase();
      if (contactA !== contactB) return contactA.localeCompare(contactB);

      return (a.batch.displayId || a.batch.id).localeCompare(b.batch.displayId || b.batch.id);
    });

    // 2. Drops Data
    const dropBatches = batches.filter((b) => b.status === 'PICKUP_COMPLETED');
    const dropDisplayEntries: DisplayEntry[] = [];
    dropBatches.forEach(b => {
      dropDisplayEntries.push({ batch: b, type: 'drop' });
    });

    // Sort Drop Entries by Route Corridor Execution Order:
    // Phase 1: Hub Drops (To Gadhinglaj Hub)
    // Phase 2: Village Drops sorted by destination route rank (closest to furthest destination)
    const sortedDropEntries = [...dropDisplayEntries].sort((a, b) => {
      const isHubDropA = a.batch.dropPointName === 'Gadhinglaj Hub' || a.batch.flowType === 'shg_to_gmu';
      const isHubDropB = b.batch.dropPointName === 'Gadhinglaj Hub' || b.batch.flowType === 'shg_to_gmu';

      if (isHubDropA !== isHubDropB) {
        return isHubDropA ? -1 : 1;
      }

      const destRankA = getBatchSequenceRank(a.batch, 'drop');
      const destRankB = getBatchSequenceRank(b.batch, 'drop');
      if (destRankA !== destRankB) return destRankA - destRankB;

      const contactA = (a.batch.shgContact?.phone || a.batch.shgContact?.name || a.batch.shgName || '').toLowerCase();
      const contactB = (b.batch.shgContact?.phone || b.batch.shgContact?.name || b.batch.shgName || '').toLowerCase();
      if (contactA !== contactB) return contactA.localeCompare(contactB);

      return (a.batch.displayId || a.batch.id).localeCompare(b.batch.displayId || b.batch.id);
    });

    const totalPickups = sortedPickupEntries.length;
    const totalDrops = sortedDropEntries.length;

    const pickupOrderIds = pickupBatches
      .map(b => String(b.displayId || ''))
      .filter((id, idx, arr) => Boolean(id) && arr.indexOf(id) === idx);
    
    const dropOrderIds = dropBatches
      .map(b => String(b.displayId || ''))
      .filter((id, idx, arr) => Boolean(id) && arr.indexOf(id) === idx);

    return { sortedPickupEntries, sortedDropEntries, totalPickups, totalDrops, pickupOrderIds, dropOrderIds };
  }, [batches]);

  const renderFlatList = (
    entries: DisplayEntry[],
    tabType: 'pickup' | 'drop'
  ) => {
    return (
      <View style={{ width: screenWidth }}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Package size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
              <Text style={styles.emptyCardText}>
                {t('orders.no_accepted_tasks_message', { 
                  type: tabType === 'pickup' ? t('orders.pickup_tab', { defaultValue: 'Pickups' }) : t('orders.drop_tab', { defaultValue: 'Drops' }),
                  defaultValue: `No accepted ${tabType === 'pickup' ? 'pickups' : 'drops'} tasks found.` 
                })}
              </Text>
            </View>
          ) : (
            <View style={styles.notificationsWrapper}>
              {entries.map((entry: DisplayEntry, index: number) => {
                const { batch, type } = entry;
                const isPickup = type === 'pickup';
                const legTag = isPickup 
                  ? { text: t('orders.pickup_orders', { defaultValue: 'Pickup Order' }), color: '#2563EB', bg: '#EFF6FF' }
                  : { text: t('orders.drop_orders', { defaultValue: 'Drop Order' }), color: '#059669', bg: '#ECFDF5' };

                const { pickup: currentPickup, drop: currentDrop } = getCounts(batch);

                return (
                  <TouchableOpacity
                    key={`${batch.id}-${type}-${index}`}
                    style={styles.notificationWidgetCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id, type: type })
                    }
                  >
                    <View style={styles.widgetLeftData}>
                      <View style={styles.widgetTopRow}>
                        <Text style={styles.widgetBatchIdText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{batch.displayId || batch.id}</Text>
                      </View>

                      <Text style={styles.widgetRouteText} numberOfLines={2}>
                        {`From - ${batch.pickupPointName} To ${batch.dropPointName}`}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                        <Text style={styles.widgetTotalsText}>
                          {isPickup ? currentPickup : currentDrop} {t('orders.items')} • {batch.totalWeight}
                        </Text>
                        <View style={[styles.legTagBox, { backgroundColor: legTag.bg }]}>
                          <Text style={[styles.legTagText, { color: legTag.color }]}>
                            {legTag.text}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* View Icon Action Strip */}
                    <View style={styles.actionStrip}>
                      <TouchableOpacity
                        style={styles.modernViewBtn}
                        onPress={() =>
                          navigation.navigate('OrderBatchPickupDetail', { batchId: batch.id, type: type })
                        }
                      >
                        <Text style={styles.btnTextWhite}>{t('orders.view', { defaultValue: 'View' })}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modernNavigateBtn}
                        onPress={() => handleNavigate(batch, type)}
                      >
                        <Text style={styles.btnTextGreen}>{t('orders.navigate_short', { defaultValue: 'Navigate' })}</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('orders.accepted_orders', { defaultValue: 'Accepted Orders' })}
        subtitle={t('orders.accepted_orders_subtitle', { defaultValue: 'Route-grouped transit execution' })}
        showBackButton={true}
        showProfile={false}
        showHelp={true}
      />

      <View style={{ height: verticalScale(14) }} />

      <View style={styles.tabNavbar}>
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: (screenWidth - scale(40) - scale(8)) / 2,
              transform: [
                {
                  translateX: scrollX.interpolate({
                    inputRange: [0, screenWidth],
                    outputRange: [0, (screenWidth - scale(40) - scale(8)) / 2],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setActiveTab('pickup');
            pagerRef.current?.scrollTo({ x: 0, animated: true });
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.navTabText, activeTab === 'pickup' && styles.navTabTextActive]}>
            {t('orders.pickup_tab', { defaultValue: 'Pickups' })} ({totalPickups})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            setActiveTab('drop');
            pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.navTabText, activeTab === 'drop' && styles.navTabTextActive]}>
            {t('orders.drop_tab', { defaultValue: 'Drops' })} ({totalDrops})
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={pagerRef as any}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const page = Math.round(offsetX / screenWidth);
          setActiveTab(page === 0 ? 'pickup' : 'drop');
        }}
        style={{ flex: 1 }}
      >
        {renderFlatList(sortedPickupEntries, 'pickup')}
        {renderFlatList(sortedDropEntries, 'drop')}
      </Animated.ScrollView>

      {activeTab === 'pickup' && (
        <FloatingScannerButton
          module="PICKUP"
          orderIds={pickupOrderIds}
          navigation={navigation}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabNavbar: {
    flexDirection: 'row',
    marginHorizontal: scale(20),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(14),
    padding: scale(4),
    marginBottom: verticalScale(14),
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: scale(4),
    bottom: scale(4),
    left: scale(4),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  navTab: {
    flex: 1,
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  navTabText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(13),
    color: '#64748B',
  },
  navTabActiveText: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  navTabTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  container: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(120),
    gap: verticalScale(16),
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
    marginTop: verticalScale(20),
    gap: verticalScale(12),
  },
  emptyCardText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  notificationsWrapper: {
    gap: verticalScale(14),
  },
  notificationWidgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  widgetLeftData: {
    flex: 1,
    marginRight: scale(8),
  },
  widgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(4),
  },
  widgetBatchIdText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11.5),
    color: Colors.textSecondary,
  },
  legTagBox: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(1.5),
    borderRadius: scale(4),
  },
  legTagText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
  },
  widgetRouteText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14.5),
    color: Colors.textPrimary,
    marginBottom: verticalScale(4),
  },
  widgetTotalsText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11.5),
    color: Colors.textPlaceholder,
  },
  actionStrip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: verticalScale(12),
    paddingLeft: scale(16),
    borderLeftWidth: 1.5,
    borderLeftColor: '#F1F5F9',
    marginLeft: scale(4),
  },
  modernViewBtn: {
    width: scale(75),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  modernNavigateBtn: {
    width: scale(75),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    backgroundColor: '#ECFDF5',
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWhite: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
    color: '#FFFFFF',
  },
  btnTextGreen: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
    color: '#059669',
  },
});

export default AcceptedOrdersScreen;
