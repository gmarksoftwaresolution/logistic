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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, BatchOrder, HUB_CONTACT } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, MapPin, ChevronDown, ChevronRight, Eye } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type DisplayEntry = { batch: BatchOrder; type: 'pickup' | 'drop' };

const AcceptedOrdersScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { batches } = useOrderManagement();
  const [activeTab, setActiveTab] = useState<'pickup' | 'drop'>('pickup');
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

  // Track accordion expansion states per area.
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({
    nesari: true,
    wagrale: true,
    'Gadhinglaj Hub': true,
    Mahagaon: true,
  });

  const toggleAreaExpand = (areaName: string) => {
    setExpandedAreas((prev) => ({
      ...prev,
      [areaName]: prev[areaName] === undefined ? false : !prev[areaName],
    }));
  };

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
    const pickup = b.products.filter(p => p.status === 'pending').length;
    const drop = b.products.filter(p => p.status === 'picked').length;
    return { pickup, drop };
  };

  // 1. Pickups Data
  const { pickupAreas, dropAreas, pickupGroupedEntries, dropGroupedEntries, totalPickups, totalDrops } = useMemo(() => {
    // 1. Pickups Data
    const pickupBatches = batches.filter((b) => b.status === 'ACCEPTED_PICKUP');
    const pickupDisplayEntries: { batch: BatchOrder; type: 'pickup' | 'drop' }[] = [];
    pickupBatches.forEach(b => {
      if (b.products.some(p => p.status === 'pending')) {
        pickupDisplayEntries.push({ batch: b, type: 'pickup' });
      }
    });

    const pickupGroupedEntries: Record<string, typeof pickupDisplayEntries> = {};
    pickupDisplayEntries.forEach((entry) => {
      let displayArea = entry.batch.areaName;
      if (entry.batch.flowType === 'gmu_to_shg') displayArea = 'Gadhinglaj Hub';
      if (!pickupGroupedEntries[displayArea]) pickupGroupedEntries[displayArea] = [];
      pickupGroupedEntries[displayArea].push(entry);
    });

    // 2. Drops Data
    const dropBatches = batches.filter((b) => b.status === 'PICKUP_COMPLETED');
    
    const dropDisplayEntries: { batch: BatchOrder; type: 'pickup' | 'drop' }[] = [];
    dropBatches.forEach(b => {
      dropDisplayEntries.push({ batch: b, type: 'drop' });
    });

    const dropGroupedEntries: Record<string, typeof dropDisplayEntries> = {};
    dropDisplayEntries.forEach((entry) => {
      let displayArea = entry.batch.areaName;
      if (entry.batch.flowType === 'shg_to_gmu') displayArea = 'Gadhinglaj Hub';
      if (!dropGroupedEntries[displayArea]) dropGroupedEntries[displayArea] = [];
      dropGroupedEntries[displayArea].push(entry);
    });

    const ORDERED_AREAS = ['Nesari', 'Wagharale', 'Mahagaon', 'Halkarni', 'Gadhinglaj Hub', 'Gadhinglaj'];
    const allFoundPickupAreas = Object.keys(pickupGroupedEntries);
    const pickupAreas = Array.from(new Set([...ORDERED_AREAS.filter(a => pickupGroupedEntries[a]), ...allFoundPickupAreas]));

    const allFoundDropAreas = Object.keys(dropGroupedEntries);
    const dropAreas = Array.from(new Set([...ORDERED_AREAS.filter(a => dropGroupedEntries[a]), ...allFoundDropAreas]));

    const totalPickups = pickupBatches.filter(b => b.products.some(p => p.status === 'pending')).length;
    const totalDrops = dropBatches.length;

    return { pickupAreas, dropAreas, pickupGroupedEntries, dropGroupedEntries, totalPickups, totalDrops };
  }, [batches]);

  const renderAreaList = (
    tabAreas: string[],
    tabGroupedEntries: Record<string, DisplayEntry[]>,
    tabType: 'pickup' | 'drop'
  ) => {
    return (
      <View style={{ width: screenWidth }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {tabAreas.length === 0 ? (
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
            tabAreas.map((areaName) => {
              const areaEntries = tabGroupedEntries[areaName];
              const isExpanded = expandedAreas[areaName] !== false;

              return (
                <View key={areaName} style={styles.areaAccordionBlock}>
                  <View style={styles.areaAccentBar} />
                  
                  <TouchableOpacity
                    style={styles.areaHeaderRow}
                    activeOpacity={0.8}
                    onPress={() => toggleAreaExpand(areaName)}
                  >
                    <View style={styles.headerLeftCol}>
                      <MapPin size={scale(18)} color={Colors.primary} strokeWidth={2.5} />
                      <Text style={styles.areaTitleText} numberOfLines={1}>
                        {areaName}
                      </Text>
                    </View>

                    <View style={styles.headerRightCol}>
                      <View style={styles.assignedBadgePill}>
                        <Text style={styles.assignedBadgeText}>{areaEntries.length} {t('orders.tasks')}</Text>
                      </View>
                      <View style={styles.chevronBox}>
                        {isExpanded ? (
                          <ChevronDown size={scale(18)} color={Colors.textSecondary} />
                        ) : (
                          <ChevronRight size={scale(18)} color={Colors.textSecondary} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.accordionBody}>
                      <View style={styles.notificationsWrapper}>
                        {areaEntries.map((entry: DisplayEntry, index: number) => {
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
                                  <Text style={styles.widgetBatchIdText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{batch.id}</Text>
                                </View>

                                <Text style={styles.widgetRouteText} numberOfLines={1}>
                                  {`${batch.pickupPointName} > ${batch.dropPointName}`}
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
                    </View>
                  )}
                </View>
              );
            })
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
        {renderAreaList(pickupAreas, pickupGroupedEntries, 'pickup')}
        {renderAreaList(dropAreas, dropGroupedEntries, 'drop')}
      </Animated.ScrollView>
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
  areaAccordionBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  areaAccentBar: {
    width: scale(4),
    height: '100%',
    backgroundColor: Colors.primary,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  areaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: scale(20),
    paddingRight: scale(16),
    paddingVertical: verticalScale(16),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginRight: scale(8),
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  areaTitleText: {
    flex: 1,
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  assignedBadgePill: {
    backgroundColor: 'rgba(178, 213, 52, 0.12)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(178, 213, 52, 0.3)',
  },
  assignedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: Colors.primary,
  },
  chevronBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
    backgroundColor: '#FFFFFF',
  },
  notificationsWrapper: {
    gap: verticalScale(20),
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
