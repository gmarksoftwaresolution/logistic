import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Colors';
import ScreenHeader from '../../components/ScreenHeader';
import { useOrderManagement, UpcomingOrder } from '../../context/OrderManagementContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { Package, MapPin, Phone, X, Calendar, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export const UpcomingOrdersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { upcomingOrders, refreshUpcomingOrders } = useOrderManagement();
  const [activeTab, setActiveTab] = useState<'all' | 'shg_to_hub' | 'hub_to_drop_shg'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAddressOrder, setSelectedAddressOrder] = useState<UpcomingOrder | null>(null);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshUpcomingOrders().catch(err => console.log('Error refreshing upcoming orders on focus:', err));
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUpcomingOrders();
    } catch (e) {
      console.error('Failed to refresh upcoming orders:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const safeUpcomingOrders = Array.isArray(upcomingOrders) ? upcomingOrders : [];

  const filteredOrders = safeUpcomingOrders.filter(order => {
    if (activeTab === 'all') return true;
    return order.legType === activeTab;
  });

  const shgToHubCount = safeUpcomingOrders.filter(o => o.legType === 'shg_to_hub').length;
  const hubToDropCount = safeUpcomingOrders.filter(o => o.legType === 'hub_to_drop_shg').length;

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleOpenMap = (address: string) => {
    if (!address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={t('orders.upcoming') || 'Upcoming Orders'}
        subtitle="Expected batch & hub deliveries"
        showBackButton={true}
        showProfile={false}
        showHelp={true}
        helpContent="View all expected future orders, including seller pickup locations to Central Hub and Hub deliveries to buyer SHGs."
      />

      {/* Filter Tabs - Pill Container Style matching SHG App */}
      <View style={styles.tabBarContainer}>
        <TouchableOpacity
          style={[styles.tabButton, styles.tabButtonAll, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]} numberOfLines={1}>
            All
          </Text>
          <View style={[styles.badgePill, activeTab === 'all' ? styles.badgePillActive : styles.badgePillInactive]}>
            <Text style={[styles.badgeText, activeTab === 'all' ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {safeUpcomingOrders.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, styles.tabButtonPickup, activeTab === 'shg_to_hub' && styles.tabButtonActive]}
          onPress={() => setActiveTab('shg_to_hub')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'shg_to_hub' && styles.tabTextActive]} numberOfLines={1}>
            SHG ➔ Hub
          </Text>
          <View style={[styles.badgePill, activeTab === 'shg_to_hub' ? styles.badgePillActive : styles.badgePillInactive]}>
            <Text style={[styles.badgeText, activeTab === 'shg_to_hub' ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {shgToHubCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, styles.tabButtonDrop, activeTab === 'hub_to_drop_shg' && styles.tabButtonActive]}
          onPress={() => setActiveTab('hub_to_drop_shg')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'hub_to_drop_shg' && styles.tabTextActive]} numberOfLines={1}>
            Hub ➔ Drop
          </Text>
          <View style={[styles.badgePill, activeTab === 'hub_to_drop_shg' ? styles.badgePillActive : styles.badgePillInactive]}>
            <Text style={[styles.badgeText, activeTab === 'hub_to_drop_shg' ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {hubToDropCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#073318']}
            tintColor="#073318"
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Package size={scale(32)} color="#16A34A" />
            </View>
            <Text style={styles.emptyTitle}>No Upcoming Orders</Text>
            <Text style={styles.emptySubtitle}>
              New expected batch and hub transfers will appear here automatically when created.
            </Text>
          </View>
        ) : (
          filteredOrders.map(item => {
            const fullDestinationStr = [
              item.destinationAddress.address,
              item.destinationAddress.village,
              item.destinationAddress.district,
              item.destinationAddress.pincode
            ].filter(Boolean).join(', ');

            const contactPhone = item.destinationAddress.phone || item.originAddress.phone;

            return (
              <View key={item.id} style={styles.orderCard}>
                {/* Top Row: Order ID Only */}
                <View style={styles.cardHeader}>
                  <Text style={styles.orderIdText}>{item.displayId || `#${item.orderId}`}</Text>
                </View>

                {/* Origin & Destination Route Visualizer */}
                <View style={styles.routeContainer}>
                  <View style={styles.locationNode}>
                    <Text style={styles.nodeLabel}>ORIGIN</Text>
                    <Text style={styles.nodeName} numberOfLines={1}>{item.originAddress.name}</Text>
                    <Text style={styles.nodeSubText} numberOfLines={1}>
                      {[item.originAddress.village, item.originAddress.district].filter(Boolean).join(', ')}
                    </Text>
                  </View>

                  <View style={styles.arrowCenter}>
                    <ArrowRight size={scale(14)} color="#94A3B8" />
                  </View>

                  <View style={styles.locationNode}>
                    <Text style={styles.nodeLabel}>DESTINATION</Text>
                    <Text style={styles.nodeName} numberOfLines={1}>{item.destinationAddress.name}</Text>
                    <Text style={styles.nodeSubText} numberOfLines={1}>
                      {[item.destinationAddress.village, item.destinationAddress.district].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                </View>

                {/* Action Row */}
                <View style={styles.actionRow}>
                  <View style={styles.actionButtonsGroup}>
                    <TouchableOpacity
                      style={styles.viewAddressButton}
                      onPress={() => setSelectedAddressOrder(item)}
                      activeOpacity={0.7}
                    >
                      <MapPin size={scale(11)} color="#16A34A" />
                      <Text style={styles.viewAddressText}>View Address Details</Text>
                    </TouchableOpacity>

                    {contactPhone ? (
                      <TouchableOpacity
                        style={styles.phoneButton}
                        onPress={() => handleCall(contactPhone)}
                        activeOpacity={0.7}
                      >
                        <Phone size={scale(11)} color="#047857" />
                        <Text style={styles.phoneText}>Call Contact</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Location Pin Button - Opens Google Maps for Destination Address */}
                  <TouchableOpacity
                    style={styles.locationIconButton}
                    onPress={() => handleOpenMap(fullDestinationStr || item.destinationAddress.name)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={scale(16)} color="#16A34A" />
                  </TouchableOpacity>
                </View>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerItemPill}>
                    <Package size={scale(11)} color="#16A34A" />
                    <Text style={styles.footerTextGreen}>{item.totalQty} items • {item.totalWeight}</Text>
                  </View>

                  <View style={styles.footerItemPillDark}>
                    <Calendar size={scale(11)} color="#047857" />
                    <Text style={styles.expectedTextGreen}>Expected: {item.expectedDate}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Address Details Modal */}
      {selectedAddressOrder && (
        <Modal
          visible={!!selectedAddressOrder}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedAddressOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Address Details</Text>
                <TouchableOpacity onPress={() => setSelectedAddressOrder(null)}>
                  <X size={scale(20)} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: verticalScale(400) }}>
                <Text style={styles.modalOrderRef}>
                  {selectedAddressOrder.displayId} ({selectedAddressOrder.legTitle})
                </Text>

                {/* Destination / Buyer Address Box */}
                <View style={styles.addressBox}>
                  <View style={styles.boxHeaderRow}>
                    <Text style={[styles.boxTag, { color: '#047857' }]}>DESTINATION (DELIVERY)</Text>
                    {selectedAddressOrder.destinationAddress.phone && (
                      <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.destinationAddress.phone)}>
                        <Phone size={scale(14)} color="#047857" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.addressName}>{selectedAddressOrder.destinationAddress.name}</Text>
                  <Text style={styles.addressFull}>{selectedAddressOrder.destinationAddress.address}</Text>
                  <Text style={styles.addressMeta}>
                    Village: {selectedAddressOrder.destinationAddress.village} • Taluka: {selectedAddressOrder.destinationAddress.taluka}
                  </Text>
                  <Text style={styles.addressMeta}>
                    District: {selectedAddressOrder.destinationAddress.district} • Pincode: {selectedAddressOrder.destinationAddress.pincode}
                  </Text>
                  <TouchableOpacity
                    style={styles.mapLink}
                    onPress={() => handleOpenMap([selectedAddressOrder.destinationAddress.address, selectedAddressOrder.destinationAddress.village, selectedAddressOrder.destinationAddress.district].filter(Boolean).join(', '))}
                  >
                    <MapPin size={scale(12)} color="#16A34A" />
                    <Text style={styles.mapLinkText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </View>

                {/* Origin / Seller Address Box */}
                <View style={[styles.addressBox, { marginTop: verticalScale(12) }]}>
                  <View style={styles.boxHeaderRow}>
                    <Text style={styles.boxTag}>ORIGIN (PICKUP)</Text>
                    {selectedAddressOrder.originAddress.phone && (
                      <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.originAddress.phone)}>
                        <Phone size={scale(14)} color="#047857" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.addressName}>{selectedAddressOrder.originAddress.name}</Text>
                  <Text style={styles.addressFull}>{selectedAddressOrder.originAddress.address}</Text>
                  <Text style={styles.addressMeta}>
                    Village: {selectedAddressOrder.originAddress.village} • Taluka: {selectedAddressOrder.originAddress.taluka}
                  </Text>
                  <Text style={styles.addressMeta}>
                    District: {selectedAddressOrder.originAddress.district} • Pincode: {selectedAddressOrder.originAddress.pincode}
                  </Text>
                  <TouchableOpacity
                    style={styles.mapLink}
                    onPress={() => handleOpenMap([selectedAddressOrder.originAddress.address, selectedAddressOrder.originAddress.village, selectedAddressOrder.originAddress.district].filter(Boolean).join(', '))}
                  >
                    <MapPin size={scale(12)} color="#16A34A" />
                    <Text style={styles.mapLinkText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedAddressOrder(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: moderateScale(28),
    padding: scale(4),
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    gap: scale(2),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(4) },
        shadowOpacity: 0.04,
        shadowRadius: moderateScale(10),
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabButton: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(4),
    borderRadius: moderateScale(22),
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonAll: {
    flex: 0.7,
  },
  tabButtonPickup: {
    flex: 1.1,
  },
  tabButtonDrop: {
    flex: 1.25,
  },
  tabButtonActive: {
    backgroundColor: '#073318',
    ...Platform.select({
      ios: {
        shadowColor: '#073318',
        shadowOffset: { width: 0, height: verticalScale(3) },
        shadowOpacity: 0.15,
        shadowRadius: moderateScale(4),
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.extraBold,
  },
  badgePill: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(1),
    borderRadius: moderateScale(12),
    marginLeft: scale(3),
  },
  badgePillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgePillInactive: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: moderateScale(10),
    fontFamily: Fonts.extraBold,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeTextInactive: {
    color: '#64748B',
  },
  scrollContainer: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(100),
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(20),
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  emptyTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(16),
    color: '#1E293B',
    marginBottom: verticalScale(4),
  },
  emptySubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: verticalScale(18),
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(18),
    padding: moderateScale(12),
    marginBottom: verticalScale(10),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(3) },
        shadowOpacity: 0.03,
        shadowRadius: moderateScale(6),
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
  },
  orderIdText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14),
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  locationNode: {
    flex: 1,
  },
  nodeLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(9),
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  nodeName: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(13.5),
    color: '#073318',
    marginTop: verticalScale(1),
  },
  nodeSubText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#64748B',
    marginTop: verticalScale(1),
  },
  arrowCenter: {
    paddingHorizontal: scale(6),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flexWrap: 'wrap',
    flex: 1,
  },
  viewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#F0FDF4',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  viewAddressText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#16A34A',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  phoneText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#047857',
  },
  locationIconButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: '#F0FDF4',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
  },
  footerTextGreen: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#15803D',
  },
  footerItemPillDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
  },
  expectedTextGreen: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#047857',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(17),
    color: '#1E293B',
  },
  modalOrderRef: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#073318',
    marginBottom: verticalScale(14),
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  boxTag: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(10),
    color: '#073318',
    letterSpacing: 0.5,
  },
  addressName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#1E293B',
    marginBottom: verticalScale(4),
  },
  addressFull: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#475569',
    marginBottom: verticalScale(6),
    lineHeight: verticalScale(18),
  },
  addressMeta: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#64748B',
    marginBottom: verticalScale(2),
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: verticalScale(8),
  },
  mapLinkText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
    color: '#16A34A',
  },
  closeButton: {
    backgroundColor: '#073318',
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    marginTop: verticalScale(16),
  },
  closeButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
});

export default UpcomingOrdersScreen;
