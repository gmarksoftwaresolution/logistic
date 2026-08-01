import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
  SectionList,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Colors';
import ScreenHeader from '../components/ScreenHeader';
import WalkthroughElement from '../components/WalkthroughElement';
import { useOrderManagement, ActivityEntry, BatchOrder } from '../context/OrderManagementContext';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale, moderateScale, cleanPersonName } from '../utils/responsive';
import { Search, MapPin, Package, Clock, Filter, XCircle, CheckCircle, History as HistoryIcon, X, ChevronRight, Hash, Phone, User, Globe, AlertCircle, TrendingUp, Calendar, ChevronLeft } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

const formatDateToHuman = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  let startDay = date.getDay();
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
};

const OrderHistoryScreen = () => {
  const { t } = useTranslation();
  const { activities, batches } = useOrderManagement();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [detailsBatch, setDetailsBatch] = useState<BatchOrder | null>(null);
  const [detailsActivityStatus, setDetailsActivityStatus] = useState<string | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<string[]>(['All']);
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customSelectedDate, setCustomSelectedDate] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const pagerRef = useRef<ScrollView>(null);
  const tabListRef = useRef<FlatList>(null);
  const isProgrammatic = useRef(false);

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

  const filters = ['All', 'Picked Up', 'Dropped', 'Rejected'];

  const selectTab = (index: number) => {
    const filter = filters[index];
    
    // Guard to avoid duplicate state updates and stutters
    if (selectedFilter === filter) return;
    
    setSelectedFilter(filter);
    setVisitedTabs((prev) => prev.includes(filter) ? prev : [...prev, filter]);
    
    // Auto-scroll the tab list to center the selected tab
    try {
      tabListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    } catch (e) {
      // Fallback in case items are not fully layed out yet
    }
  };

  const groupedActivitiesPerFilter = useMemo(() => {
    const result: Record<string, Record<string, ActivityEntry[]>> = {};
    
    const today = new Date();
    const todayStr = formatDateToHuman(today);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToHuman(yesterday);

    const customStr = customSelectedDate ? formatDateToHuman(customSelectedDate) : '';

    filters.forEach((filter) => {
      const filtered = activities.filter((act) => {
        // Only show Picked, Dropped, Completed, and Rejected history items. Exclude Accepted.
        const isValidHistoryStatus = 
          act.status === 'Accepted' ||
          act.status === 'Picked' || 
          act.status === 'Dropped' || 
          act.status === 'Completed' ||
          act.status === 'Rejected';

        if (!isValidHistoryStatus) return false;

        const matchesSearch = 
          act.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          act.route.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = 
          filter === 'All' || 
          (filter === 'Picked Up' && (act.status === 'Picked' || act.status === 'Dropped' || act.status === 'Completed')) ||
          (filter === 'Dropped' && (act.status === 'Dropped' || act.status === 'Completed')) ||
          (filter === 'Rejected' && act.status === 'Rejected');

        // Check date filter prefix
        const actDate = act.timestamp.split(',')[0].trim();
        let matchesDate = true;
        if (dateFilterType === 'today') {
          matchesDate = actDate === todayStr;
        } else if (dateFilterType === 'yesterday') {
          matchesDate = actDate === yesterdayStr;
        } else if (dateFilterType === 'custom' && customSelectedDate) {
          matchesDate = actDate === customStr;
        }

        return matchesSearch && matchesFilter && matchesDate;
      });

      const groups: Record<string, ActivityEntry[]> = {};
      filtered.forEach(act => {
        const datePart = act.timestamp.split(',')[0];
        if (!groups[datePart]) groups[datePart] = [];
        groups[datePart].push(act);
      });
      result[filter] = groups;
    });

    return result;
  }, [activities, searchQuery, dateFilterType, customSelectedDate]);

  const batchesMap = useMemo(() => {
    const map: Record<string, BatchOrder> = {};
    batches.forEach(b => {
      map[b.id] = b;
    });
    return map;
  }, [batches]);

  const renderFilteredList = (filter: string) => {
    const isVisited = visitedTabs.includes(filter);
    if (!isVisited) {
      return <View key={filter} style={{ width: screenWidth }} />;
    }

    const grouped = groupedActivitiesPerFilter[filter] || {};
    const dateSecs = Object.keys(grouped);

    const sections = dateSecs.map((date) => ({
      title: date,
      data: grouped[date],
    }));

    return (
      <View key={filter} style={{ width: screenWidth, paddingHorizontal: scale(20) }}>
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => renderActivityCard({ item })}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.dateSection}>
              <Text style={styles.dateHeader}>{title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <HistoryIcon size={scale(42)} color="#94A3B8" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>{t('orders.no_history_records')}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || filter !== 'All' || dateFilterType !== 'all'
                  ? t('orders.history_empty_subtitle_with_filters')
                  : t('orders.history_empty_subtitle_default')}
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderCalendarGrid = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const days = getDaysInMonth(year, month);
    
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <View style={styles.calendarContainer}>
        {/* Calendar Nav Header */}
        <View style={styles.calendarNavRow}>
          <TouchableOpacity onPress={() => {
            setCalendarDate(new Date(year, month - 1, 1));
          }} style={styles.calendarNavBtn}>
            <ChevronLeft size={scale(16)} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.calendarMonthText}>{monthNames[month]} {year}</Text>
          <TouchableOpacity onPress={() => {
            setCalendarDate(new Date(year, month + 1, 1));
          }} style={styles.calendarNavBtn}>
            <ChevronRight size={scale(16)} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Day Name Headers */}
        <View style={styles.weekDaysRow}>
          {dayNames.map((name, i) => (
            <Text key={i} style={styles.weekDayLabel}>{name}</Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.emptyDayCell} />;
            }
            
            const isSelected = customSelectedDate && 
              day.getDate() === customSelectedDate.getDate() &&
              day.getMonth() === customSelectedDate.getMonth() &&
              day.getFullYear() === customSelectedDate.getFullYear() &&
              dateFilterType === 'custom';

            const isToday = new Date(2026, 4, 18).getDate() === day.getDate() &&
              new Date(2026, 4, 18).getMonth() === day.getMonth() &&
              new Date(2026, 4, 18).getFullYear() === day.getFullYear();

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCellBtn,
                  isSelected && styles.dayCellBtnSelected,
                  isToday && !isSelected && styles.dayCellBtnToday,
                ]}
                onPress={() => {
                  setCustomSelectedDate(day);
                  setDateFilterType('custom');
                  setShowDateModal(false);
                }}
              >
                <Text style={[
                  styles.dayCellText,
                  isSelected && styles.dayCellTextSelected,
                  isToday && !isSelected && styles.dayCellTextToday,
                ]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const getActivityBadgeStyle = (status: ActivityEntry['status']) => {
    switch (status) {
      case 'Picked':
        return { bg: '#EFF6FF', text: '#2563EB', icon: <Package size={scale(11)} color="#2563EB" />, label: t('orders.picked', { defaultValue: 'Picked' }) };
      case 'Dropped':
      case 'Completed':
        return { bg: '#ECFDF5', text: '#059669', icon: <CheckCircle size={scale(11)} color="#059669" />, label: t('orders.dropped', { defaultValue: 'Dropped' }) };
      case 'Accepted':
        return { bg: '#F0FDF4', text: '#16A34A', icon: <Clock size={scale(11)} color="#16A34A" />, label: t('orders.accepted', { defaultValue: 'Accepted' }) };
      case 'Rejected':
        return { bg: '#FEF2F2', text: '#DC2626', icon: <XCircle size={scale(11)} color="#DC2626" />, label: t('orders.reject', { defaultValue: 'Rejected' }) };
      default:
        return { bg: '#F1F5F9', text: '#64748B', icon: <Package size={scale(11)} color="#64748B" />, label: status };
    }
  };

  const renderActivityCard = ({ item }: { item: ActivityEntry }) => {
    const displayStatus = (selectedFilter === 'Picked Up') ? 'Picked' : item.status;
    const badge = getActivityBadgeStyle(displayStatus);
    const batch = batchesMap[item.orderId];

    const cardContent = (
      <TouchableOpacity 
        style={styles.activityCard} 
        activeOpacity={0.7}
        onPress={() => {
          if (batch) {
            setDetailsBatch(batch);
            setDetailsActivityStatus(displayStatus);
          }
        }}
      >
        {/* Top Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>{t('orders.order_id')}</Text>
            <Text 
              style={styles.orderIdValue} 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8}
            >
              {batch?.displayId || item.orderId}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            {badge.icon}
            <Text style={[styles.statusText, { color: badge.text }]}>{(badge as any).label || item.status}</Text>
          </View>
        </View>

        {/* SHG Info */}
        <View style={styles.shgInfoRow}>
          <View style={styles.shgIconBox}>
            <User size={scale(12)} color={Colors.primary} />
          </View>
          <Text style={styles.shgNameText}>{batch?.shgName || 'Standard SHG'}</Text>
          <View style={styles.flowBadge}>
            <Text style={styles.flowBadgeText}>
              {batch?.flowType === 'shg_to_gmu' ? 'SHG → Hub' : batch?.flowType === 'gmu_to_shg' ? 'Hub → SHG' : 'SHG ↔ SHG'}
            </Text>
          </View>
        </View>

        {/* Route Info */}
        <View style={styles.routeContainer}>
          <MapPin size={scale(16)} color={Colors.primary} strokeWidth={2.5} />
          <Text style={styles.routeText} numberOfLines={2}>{item.route}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom Stats & Timestamp */}
        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>{item.qty} {t('orders.items')}</Text>
            <View style={styles.dot} />
            <Text style={styles.statLabel}>{item.weight}</Text>
          </View>
          <Text style={styles.timestampText}>{item.timestamp}</Text>
        </View>
      </TouchableOpacity>
    );

    const isFirstActivity = activities.length > 0 && item.id === activities[0].id;
    if (isFirstActivity) {
      return (
        <WalkthroughElement stepId="recent_delivered_order">
          {cardContent}
        </WalkthroughElement>
      );
    }
    return cardContent;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader 
        title={t('history.title')} 
        subtitle={t('history.subtitle')} 
        showBackButton={true} 
        showProfile={false}
        showHelp={true}
        helpContent="This screen shows your complete delivery history. You can search for specific orders using the search bar or filter by status using the tabs above. Tap a card to see more details about that specific batch."
      />
      
      <View style={styles.mainContainer}>
        {/* Padded Header Wrapper */}
        <View style={{ paddingHorizontal: scale(20) }}>
          {/* Search And Date Filter Button Row */}
          <View style={styles.searchAndFilterRow}>
            <View style={[styles.searchContainer, { flex: 1, marginTop: 0 }]}>
              <Search size={scale(18)} color={Colors.textPlaceholder} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('history.search_placeholder')}
                placeholderTextColor={Colors.textPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <X size={scale(18)} color={Colors.textPlaceholder} />
                </TouchableOpacity>
              )}
            </View>
            {dateFilterType === 'all' ? (
              <TouchableOpacity 
                style={styles.calendarFilterBtn} 
                onPress={() => setShowDateModal(true)}
              >
                <Calendar size={scale(16)} color={Colors.textSecondary} />
                <Text style={styles.calendarBtnText}>{t('orders.filter', { defaultValue: 'Filter' })}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.calendarFilterBtn, styles.calendarResetBtnActive]} 
                onPress={() => {
                  setDateFilterType('all');
                  setCustomSelectedDate(null);
                }}
              >
                <X size={scale(16)} color="#DC2626" strokeWidth={2.5} />
                <Text style={styles.calendarBtnTextActive}>{t('orders.reset_filter', { defaultValue: 'Reset' })}</Text>
              </TouchableOpacity>
            )}
          </View>


          {/* Filter Tabs */}
          <View style={styles.filterOuterWrapper}>
            <FlatList
              ref={tabListRef}
              horizontal
              data={filters}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterListContent}
              initialNumToRender={4}
              renderItem={({ item, index }) => {
                const getFilterLabel = (filter: string) => {
                  switch (filter) {
                    case 'All': return t('orders.all_time', { defaultValue: 'All Time' });
                    case 'Picked Up': return t('orders.picked_up', { defaultValue: 'Picked Up' });
                    case 'Dropped': return t('orders.dropped', { defaultValue: 'Dropped' });
                    case 'Rejected': return t('orders.reject', { defaultValue: 'Rejected' });
                    default: return filter;
                  }
                };
                return (
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      selectedFilter === item && styles.filterTabActive,
                    ]}
                    onPress={() => {
                      isProgrammatic.current = true;
                      selectTab(index);
                      pagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
                    }}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        selectedFilter === item && styles.filterTabTextActive,
                      ]}
                    >
                      {getFilterLabel(item)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>

        {/* Swipeable Horizontal ScrollView Pager */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            if (isProgrammatic.current) {
              return;
            }
            const offsetX = e.nativeEvent.contentOffset.x;
            const page = Math.round(offsetX / screenWidth);
            if (page >= 0 && page < filters.length) {
              const filter = filters[page];
              if (selectedFilter !== filter) {
                selectTab(page);
              }
            }
          }}
          onMomentumScrollEnd={() => {
            if (isProgrammatic.current) {
              isProgrammatic.current = false;
            }
          }}
          style={{ flex: 1 }}
        >
          {filters.map((filter) => renderFilteredList(filter))}
        </ScrollView>
      </View>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDateModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.detailsModalContent, { height: 'auto', paddingBottom: verticalScale(30) }]}
          >
            {/* Header */}
            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.detailsTitle}>{t('orders.filter_by_date')}</Text>
                <Text style={styles.detailsBatchId}>
                  {dateFilterType === 'all' && t('orders.showing_all_history')}
                  {dateFilterType === 'today' && `${t('orders.today')} (May 18, 2026)`}
                  {dateFilterType === 'yesterday' && `${t('orders.yesterday')} (May 17, 2026)`}
                  {dateFilterType === 'custom' && customSelectedDate && formatDateToHuman(customSelectedDate)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDateModal(false)} style={styles.closeModalBtn}>
                <X size={scale(18)} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Presets Row */}
            <View style={styles.datePresetsContainer}>
              <TouchableOpacity 
                style={[styles.datePresetChip, dateFilterType === 'all' && styles.datePresetChipActive]}
                onPress={() => {
                  setDateFilterType('all');
                  setCustomSelectedDate(null);
                  setShowDateModal(false);
                }}
              >
                <Text style={[styles.datePresetText, dateFilterType === 'all' && styles.datePresetTextActive]}>
                  {t('orders.all_time')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.datePresetChip, dateFilterType === 'today' && styles.datePresetChipActive]}
                onPress={() => {
                  setDateFilterType('today');
                  setCustomSelectedDate(new Date());
                  setShowDateModal(false);
                }}
              >
                <Text style={[styles.datePresetText, dateFilterType === 'today' && styles.datePresetTextActive]}>
                  {t('orders.today')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.datePresetChip, dateFilterType === 'yesterday' && styles.datePresetChipActive]}
                onPress={() => {
                  setDateFilterType('yesterday');
                  const yest = new Date();
                  yest.setDate(yest.getDate() - 1);
                  setCustomSelectedDate(yest);
                  setShowDateModal(false);
                }}
              >
                <Text style={[styles.datePresetText, dateFilterType === 'yesterday' && styles.datePresetTextActive]}>
                  {t('orders.yesterday')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Premium Monthly Calendar */}
            {renderCalendarGrid()}

            {/* Modal Reset Button */}
            {dateFilterType !== 'all' && (
              <TouchableOpacity 
                style={styles.modalResetBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setDateFilterType('all');
                  setCustomSelectedDate(null);
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.modalResetBtnText}>{t('orders.reset_filter')}</Text>
              </TouchableOpacity>
            )}

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* History Details Modal */}
      <Modal
        visible={!!detailsBatch}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsBatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            {/* Modal Header */}
            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.detailsTitle}>{t('orders.order_details')}</Text>
                <Text style={styles.detailsBatchId}>#{detailsBatch?.displayId || detailsBatch?.id}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeModalBtn} 
                onPress={() => setDetailsBatch(null)}
              >
                <X size={scale(22)} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsScroll}>
              {/* Route Summary Card in Modal */}
              <View style={styles.modalSummaryCard}>
                <View style={styles.summaryRow}>
                  <MapPin size={scale(18)} color={Colors.primary} strokeWidth={2.5} />
                  <Text style={styles.summaryRouteText}>
                    {detailsBatch?.pickupPointName} → {detailsBatch?.dropPointName}
                  </Text>
                </View>
                <View style={styles.summaryFooter}>
                  <View style={styles.summaryPill}>
                    <Hash size={scale(12)} color={Colors.primary} />
                    <Text style={styles.summaryPillText}>{detailsBatch?.products.length} {t('orders.items')}</Text>
                  </View>
                  <View style={[styles.summaryPill, { backgroundColor: '#F0FDF4' }]}>
                    <Package size={scale(12)} color="#16A34A" />
                    <Text style={[styles.summaryPillText, { color: '#16A34A' }]}>{detailsBatch?.totalWeight}</Text>
                  </View>
                </View>
              </View>

              {/* Pickup Point Info */}
              {(selectedFilter === 'All' || selectedFilter === 'Picked Up' || selectedFilter === 'Rejected') && (
                <>
                  <View style={styles.itemsListTitleRow}>
                    <Text style={styles.itemsListTitle}>{t('orders.pickup_point', { defaultValue: 'Pickup Point' })}</Text>
                    <View style={styles.contactIconBox}>
                      <MapPin size={scale(14)} color={Colors.primary} />
                    </View>
                  </View>

                  <View style={styles.contactDetailsCard}>
                    <View style={styles.contactRow}>
                      <User size={scale(18)} color={Colors.textSecondary} />
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          {detailsBatch?.flowType === 'gmu_to_shg' ? 'Prasad Patil (Hub Manager)' : cleanPersonName(detailsBatch?.shgContact.name)}
                        </Text>
                        <Text style={styles.contactRole}>
                          {detailsBatch?.flowType === 'gmu_to_shg' ? 'Hub Manager' : t('orders.shg_lead', { defaultValue: 'SHG Lead Representative' })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.contactRow}>
                      <Phone size={scale(18)} color={Colors.textSecondary} />
                      <Text style={styles.contactPhone}>
                        {detailsBatch?.flowType === 'gmu_to_shg' ? '+91 9123456789' : detailsBatch?.shgContact.phone}
                      </Text>
                    </View>
                    <View style={styles.contactRow}>
                      <MapPin size={scale(18)} color={Colors.textSecondary} />
                      <Text style={styles.contactAddress}>
                        {detailsBatch?.flowType === 'gmu_to_shg' ? 'Gadhinglaj Central GMU Hub, Near MIDC Area, Gadhinglaj' : detailsBatch?.shgContact.address}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Delivery Point Info */}
              {(selectedFilter === 'All' || selectedFilter === 'Dropped' || selectedFilter === 'Rejected') && (
                <>
                  <View style={styles.itemsListTitleRow}>
                    <Text style={styles.itemsListTitle}>{t('orders.delivery_point', { defaultValue: 'Delivery Point' })}</Text>
                    <View style={styles.contactIconBox}>
                      <MapPin size={scale(14)} color={Colors.primary} />
                    </View>
                  </View>

                  <View style={styles.contactDetailsCard}>
                    <View style={styles.contactRow}>
                      <User size={scale(18)} color={Colors.textSecondary} />
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          {detailsBatch?.flowType === 'shg_to_gmu' ? 'Prasad Patil (Hub Manager)' : cleanPersonName(detailsBatch?.shgContact.name)}
                        </Text>
                        <Text style={styles.contactRole}>
                          {detailsBatch?.flowType === 'shg_to_gmu' ? 'Hub Manager' : t('orders.shg_lead', { defaultValue: 'SHG Lead Representative' })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.contactRow}>
                      <Phone size={scale(18)} color={Colors.textSecondary} />
                      <Text style={styles.contactPhone}>
                        {detailsBatch?.flowType === 'shg_to_gmu' ? '+91 9123456789' : detailsBatch?.shgContact.phone}
                      </Text>
                    </View>
                    <View style={styles.contactRow}>
                      <MapPin size={scale(18)} color={Colors.textSecondary} />
                      <Text style={styles.contactAddress}>
                        {detailsBatch?.flowType === 'shg_to_gmu' ? 'Gadhinglaj Central GMU Hub, Near MIDC Area, Gadhinglaj' : detailsBatch?.shgContact.address}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <Text style={styles.itemsListTitle}>{t('orders.product_details')}</Text>
              
              {/* Products List */}
              {detailsBatch?.products.map((product, index) => {
                const getProductDisplayStatus = () => {
                  if (product.status?.toLowerCase() === 'rejected') {
                    return { key: 'orders.rejected', defaultText: 'Rejected', color: '#DC2626', bg: '#FEF2F2' };
                  }
                  if (detailsActivityStatus === 'Dropped' || detailsActivityStatus === 'Completed') {
                    return { key: 'orders.dropped', defaultText: 'Dropped', color: '#059669', bg: '#ECFDF5' };
                  }
                  if (detailsActivityStatus === 'Picked') {
                    return { key: 'orders.picked', defaultText: 'Picked', color: '#059669', bg: '#ECFDF5' };
                  }
                  if (detailsActivityStatus === 'Accepted') {
                    return { key: 'orders.accepted', defaultText: 'Accepted', color: '#16A34A', bg: '#F0FDF4' };
                  }
                  
                  const isSuccess = product.status === 'completed' || product.status === 'picked';
                  return {
                    key: `orders.${product.status}`,
                    defaultText: product.status,
                    color: isSuccess ? '#059669' : '#64748B',
                    bg: isSuccess ? '#ECFDF5' : '#F1F5F9'
                  };
                };

                const prodStatus = getProductDisplayStatus();

                return (
                  <View key={product.id || index} style={styles.itemRow}>
                    <View style={styles.itemIconBox}>
                      <Package size={scale(18)} color={Colors.primary} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{product.name}</Text>
                      <Text style={styles.itemMeta}>{product.qty} {t('orders.units', { defaultValue: 'Units' })} • {product.weight}</Text>
                    </View>
                    <View style={[styles.itemStatusBadge, { backgroundColor: prodStatus.bg }]}>
                      <Text style={[styles.itemStatusText, { color: prodStatus.color }]}>
                        {t(prodStatus.key, { defaultValue: prodStatus.defaultText }).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.modalBottomSpacer} />
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeFullBtn} 
              onPress={() => setDetailsBatch(null)}
            >
              <Text style={styles.closeFullBtnText}>{t('orders.close_details')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    height: verticalScale(48),
    marginTop: verticalScale(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: scale(10),
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    paddingVertical: 0, // Ensure no vertical padding cuts off text
  },
  clearSearchBtn: {
    padding: scale(4),
  },
  filterOuterWrapper: {
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  filterListContent: {
    paddingRight: scale(20),
  },
  filterTab: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(12),
    backgroundColor: '#FFFFFF',
    marginRight: scale(10),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  dateSection: {
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
  },
  dateHeader: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14),
    color: Colors.textPlaceholder,
    textTransform: 'uppercase',
    letterSpacing: moderateScale(1),
    marginBottom: verticalScale(12),
    paddingLeft: scale(4),
  },
  listContent: {
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(120),
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(18),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(14),
  },
  orderIdContainer: {
    flex: 1,
    marginRight: scale(12),
    gap: verticalScale(2),
  },
  orderIdLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: Colors.textPlaceholder,
    textTransform: 'uppercase',
  },
  orderIdValue: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16.5),
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(8),
    gap: scale(4),
    flexShrink: 0,
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9.5),
  },
  shgInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    gap: scale(8),
  },
  shgIconBox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shgNameText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
  },
  flowBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
    marginLeft: 'auto',
  },
  flowBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: Colors.textPlaceholder,
    textTransform: 'uppercase',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(14),
  },
  routeText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    lineHeight: moderateScale(20),
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: verticalScale(14),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  timestampText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textPlaceholder,
  },
  emptyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginTop: verticalScale(40),
    gap: verticalScale(12),
  },
  emptyTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: '#64748B',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(32),
    borderTopRightRadius: moderateScale(32),
    height: '85%',
    padding: moderateScale(24),
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  detailsTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(22),
    color: Colors.textPrimary,
  },
  detailsBatchId: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.primary,
    marginTop: verticalScale(2),
  },
  closeModalBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsScroll: {
    paddingBottom: verticalScale(40),
  },
  modalSummaryCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    marginBottom: verticalScale(24),
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  summaryRouteText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
  },
  summaryFooter: {
    flexDirection: 'row',
    gap: scale(10),
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
    gap: scale(6),
  },
  summaryPillText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  itemsListTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  contactIconBox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: verticalScale(24),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: verticalScale(14),
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  contactRole: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: Colors.textPlaceholder,
  },
  contactPhone: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.primary,
  },
  contactAddress: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    lineHeight: moderateScale(18),
  },
  itemsListTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
    marginBottom: verticalScale(16),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemIconBox: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(12),
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    marginBottom: verticalScale(2),
  },
  itemMeta: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  itemStatusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  itemStatusText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
  },
  modalBottomSpacer: {
    height: verticalScale(40),
  },
  closeFullBtn: {
    backgroundColor: Colors.primary,
    height: verticalScale(54),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(10),
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  closeFullBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(16),
  },
  calendarFilterBtn: {
    minWidth: scale(88),
    paddingHorizontal: scale(12),
    height: verticalScale(48),
    borderRadius: moderateScale(14),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  calendarBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
  },
  calendarBtnTextActive: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#DC2626',
  },
  datePresetsContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(16),
    marginTop: verticalScale(8),
  },
  datePresetChip: {
    flex: 1,
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(12),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePresetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  datePresetText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  datePresetTextActive: {
    color: '#FFFFFF',
  },
  calendarContainer: {
    marginTop: verticalScale(8),
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  calendarNavBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarMonthText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  weekDayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textPlaceholder,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellBtn: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(2),
  },
  dayCellBtnSelected: {
    backgroundColor: Colors.primary,
    borderRadius: scale(18),
  },
  dayCellBtnToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: scale(18),
  },
  dayCellText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
  },
  dayCellTextToday: {
    color: Colors.primary,
  },
  emptyDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(14),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(14),
  },
  activeFilterDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  activeFilterText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textPrimary,
  },
  calendarResetBtnActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  modalResetBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    height: verticalScale(48),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(16),
  },
  modalResetBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#DC2626',
  },
});

export default OrderHistoryScreen;
