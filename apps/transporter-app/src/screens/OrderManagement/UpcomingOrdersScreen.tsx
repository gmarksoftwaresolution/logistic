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
import { Package, MapPin, ChevronRight, Phone, ArrowRight, X, Calendar, Clock } from 'lucide-react-native';
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

  const filteredOrders = upcomingOrders.filter(order => {
    if (activeTab === 'all') return true;
    return order.legType === activeTab;
  });

  const shgToHubCount = upcomingOrders.filter(o => o.legType === 'shg_to_hub').length;
  const hubToDropCount = upcomingOrders.filter(o => o.legType === 'hub_to_drop_shg').length;

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

      {/* Filter Tabs */}
      <View style={styles.tabBarContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({upcomingOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'shg_to_hub' && styles.tabButtonActive]}
          onPress={() => setActiveTab('shg_to_hub')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'shg_to_hub' && styles.tabTextActive]}>
            SHG ➔ Hub ({shgToHubCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'hub_to_drop_shg' && styles.tabButtonActive]}
          onPress={() => setActiveTab('hub_to_drop_shg')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'hub_to_drop_shg' && styles.tabTextActive]}>
            Hub ➔ Drop ({hubToDropCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
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
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Package size={scale(32)} color="#0284C7" />
            </View>
            <Text style={styles.emptyTitle}>No Upcoming Orders</Text>
            <Text style={styles.emptySubtitle}>
              New expected batch and hub transfers will appear here automatically when created.
            </Text>
          </View>
        ) : (
          filteredOrders.map(item => {
            const isPickupLeg = item.legType === 'shg_to_hub';
            return (
              <View key={item.id} style={styles.orderCard}>
                {/* Top Row: Order ID & Leg Badge */}
                <View style={styles.cardHeader}>
                  <Text style={styles.orderIdText}>{item.displayId || `#${item.orderId}`}</Text>
                  <View style={[styles.legBadge, isPickupLeg ? styles.badgeIndigo : styles.badgeCyan]}>
                    <Text style={[styles.legBadgeText, isPickupLeg ? styles.textIndigo : styles.textCyan]}>
                      {item.legTitle}
                    </Text>
                  </View>
                </View>

                {/* Route Visualizer */}
                <View style={styles.routeContainer}>
                  <View style={styles.locationNode}>
                    <Text style={styles.nodeLabel}>ORIGIN / SELLER</Text>
                    <Text style={styles.nodeName} numberOfLines={1}>{item.originAddress.name}</Text>
                    <Text style={styles.nodeSubText} numberOfLines={1}>{item.originAddress.village}, {item.originAddress.district}</Text>
                  </View>

                  <View style={styles.arrowCenter}>
                    <ArrowRight size={scale(18)} color="#94A3B8" />
                  </View>

                  <View style={styles.locationNode}>
                    <Text style={styles.nodeLabel}>DESTINATION / BUYER</Text>
                    <Text style={styles.nodeName} numberOfLines={1}>{item.destinationAddress.name}</Text>
                    <Text style={styles.nodeSubText} numberOfLines={1}>{item.destinationAddress.village}, {item.destinationAddress.district}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.viewAddressButton}
                    onPress={() => setSelectedAddressOrder(item)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={scale(12)} color="#16A34A" />
                    <Text style={styles.viewAddressText}>View Address Details</Text>
                  </TouchableOpacity>

                  {item.originAddress.phone ? (
                    <TouchableOpacity
                      style={styles.phoneButton}
                      onPress={() => handleCall(item.originAddress.phone)}
                      activeOpacity={0.7}
                    >
                      <Phone size={scale(12)} color="#0284C7" />
                      <Text style={styles.phoneText}>Call Origin</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <Package size={scale(14)} color="#64748B" />
                    <Text style={styles.footerText}>{item.totalQty} items • {item.totalWeight}</Text>
                  </View>

                  <View style={styles.footerItem}>
                    <Calendar size={scale(14)} color="#0284C7" />
                    <Text style={styles.expectedText}>Expected: {item.expectedDate}</Text>
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
                {/* Order Ref */}
                <Text style={styles.modalOrderRef}>
                  {selectedAddressOrder.displayId} ({selectedAddressOrder.legTitle})
                </Text>

                {/* Origin / Seller Address Box */}
                <View style={styles.addressBox}>
                  <View style={styles.boxHeaderRow}>
                    <Text style={styles.boxTag}>ORIGIN (PICKUP)</Text>
                    {selectedAddressOrder.originAddress.phone && (
                      <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.originAddress.phone)}>
                        <Phone size={scale(14)} color="#0284C7" />
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
                    onPress={() => handleOpenMap(selectedAddressOrder.originAddress.address)}
                  >
                    <MapPin size={scale(12)} color="#2563EB" />
                    <Text style={styles.mapLinkText}>Open in Google Maps</Text>
                  </TouchableOpacity>
                </View>

                {/* Destination / Buyer Address Box */}
                <View style={[styles.addressBox, { marginTop: verticalScale(12) }]}>
                  <View style={styles.boxHeaderRow}>
                    <Text style={[styles.boxTag, { color: '#0284C7' }]}>DESTINATION (DELIVERY)</Text>
                    {selectedAddressOrder.destinationAddress.phone && (
                      <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.destinationAddress.phone)}>
                        <Phone size={scale(14)} color="#0284C7" />
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
                    onPress={() => handleOpenMap(selectedAddressOrder.destinationAddress.address)}
                  >
                    <MapPin size={scale(12)} color="#2563EB" />
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
    backgroundColor: Colors.background,
  },
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    gap: scale(8),
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(12),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0284C7',
  },
  tabText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11.5),
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
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
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
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
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: verticalScale(3) },
        shadowOpacity: 0.05,
        shadowRadius: moderateScale(8),
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
    marginBottom: verticalScale(12),
  },
  orderIdText: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  legBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  badgeIndigo: { backgroundColor: '#EEF2FF' },
  badgeCyan: { backgroundColor: '#E0F2FE' },
  legBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
  },
  textIndigo: { color: '#4F46E5' },
  textCyan: { color: '#0284C7' },

  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: verticalScale(12),
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
    fontSize: moderateScale(13),
    color: '#1E293B',
    marginTop: verticalScale(2),
  },
  nodeSubText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(11),
    color: '#64748B',
    marginTop: verticalScale(1),
  },
  arrowCenter: {
    paddingHorizontal: scale(8),
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(12),
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
    backgroundColor: '#F0F9FF',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  phoneText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#0284C7',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  footerText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#64748B',
  },
  expectedText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#0284C7',
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
    color: '#0284C7',
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
    color: '#4F46E5',
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
    color: '#2563EB',
  },
  closeButton: {
    backgroundColor: '#1E293B',
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
