import React, { useState, useContext, useEffect } from 'react';
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
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, MainTabParamList, OrdersStackParamList } from "../navigation/types";
import { LanguageContext } from '../context/LanguageContext';
import { useOrders } from '../context/OrderContext';
import { SharedHeader } from '../components/SharedHeader';
import { Feather, Ionicons } from '@expo/vector-icons';

type Props = CompositeScreenProps<
  NativeStackScreenProps<OrdersStackParamList, 'UpcomingOrders'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export interface SHGUpcomingOrder {
  id: string;
  orderId: string;
  displayId: string;
  legType: 'pickup' | 'drop';
  legTitle: string;
  status: string;
  statusText: string;
  totalQty: number;
  totalWeight: string;
  originAddress: {
    name: string;
    phone: string;
    address: string;
    village: string;
    taluka: string;
    district: string;
    pincode: string;
  };
  destinationAddress: {
    name: string;
    phone: string;
    address: string;
    village: string;
    taluka: string;
    district: string;
    pincode: string;
  };
  createdAt?: string;
  expectedDate?: string;
}

export const UpcomingOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const context = useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;
  const { upcomingOrders, refreshUpcomingOrders } = useOrders();
  const [activeTab, setActiveTab] = useState<'all' | 'pickup' | 'drop'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAddressOrder, setSelectedAddressOrder] = useState<SHGUpcomingOrder | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (refreshUpcomingOrders) {
        refreshUpcomingOrders().catch(err => console.log('Error refreshing SHG upcoming orders on focus:', err));
      }
    });
    return unsubscribe;
  }, [navigation, refreshUpcomingOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (refreshUpcomingOrders) await refreshUpcomingOrders();
    } catch (e) {
      console.error('Failed to refresh SHG upcoming orders:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const safeUpcomingOrders: SHGUpcomingOrder[] = Array.isArray(upcomingOrders) ? upcomingOrders : [];

  const filteredOrders = safeUpcomingOrders.filter(order => {
    if (activeTab === 'all') return true;
    return order.legType === activeTab;
  });

  const pickupCount = safeUpcomingOrders.filter(o => o.legType === 'pickup').length;
  const dropCount = safeUpcomingOrders.filter(o => o.legType === 'drop').length;

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleOpenMap = (address: string) => {
    if (!address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader
          title={t("overview_upcoming") || "Upcoming Orders"}
          subtitle="Expected future requests in your village"
          navigation={navigation}
        />

        {/* Filter Tabs */}
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
            style={[styles.tabButton, styles.tabButtonPickup, activeTab === 'pickup' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pickup')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'pickup' && styles.tabTextActive]} numberOfLines={1}>
              Seller Pickups
            </Text>
            <View style={[styles.badgePill, activeTab === 'pickup' ? styles.badgePillActive : styles.badgePillInactive]}>
              <Text style={[styles.badgeText, activeTab === 'pickup' ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {pickupCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonDrop, activeTab === 'drop' && styles.tabButtonActive]}
            onPress={() => setActiveTab('drop')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'drop' && styles.tabTextActive]} numberOfLines={1}>
              Buyer Deliveries
            </Text>
            <View style={[styles.badgePill, activeTab === 'drop' ? styles.badgePillActive : styles.badgePillInactive]}>
              <Text style={[styles.badgeText, activeTab === 'drop' ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {dropCount}
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
                <Feather name="archive" size={32} color="#16A34A" />
              </View>
              <Text style={styles.emptyTitle}>No Upcoming Orders</Text>
              <Text style={styles.emptySubtitle}>
                Future expected pickup and delivery requests matching your village location will appear here automatically when created in GMU Hub.
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
                  {/* Top Row: Order ID Only (Header badge removed) */}
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
                      <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
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
                        <Ionicons name="location-outline" size={11} color="#16A34A" />
                        <Text style={styles.viewAddressText}>View Address Details</Text>
                      </TouchableOpacity>

                      {contactPhone ? (
                        <TouchableOpacity
                          style={styles.phoneButton}
                          onPress={() => handleCall(contactPhone)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call-outline" size={11} color="#047857" />
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
                      <Ionicons name="location-sharp" size={16} color="#16A34A" />
                    </TouchableOpacity>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.footerItemPill}>
                      <Feather name="package" size={11} color="#16A34A" />
                      <Text style={styles.footerTextGreen}>{item.totalQty} items • {item.totalWeight}</Text>
                    </View>

                    <View style={styles.footerItemPillDark}>
                      <Feather name="calendar" size={11} color="#047857" />
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
                    <Feather name="x" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  <Text style={styles.modalOrderRef}>
                    {selectedAddressOrder.displayId} ({selectedAddressOrder.legTitle})
                  </Text>

                  {/* Destination / Buyer Address Box */}
                  <View style={styles.addressBox}>
                    <View style={styles.boxHeaderRow}>
                      <Text style={[styles.boxTag, { color: '#047857' }]}>DESTINATION (DELIVERY)</Text>
                      {selectedAddressOrder.destinationAddress.phone && (
                        <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.destinationAddress.phone)}>
                          <Ionicons name="call-outline" size={14} color="#047857" />
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
                      <Ionicons name="location-outline" size={12} color="#16A34A" />
                      <Text style={styles.mapLinkText}>Open in Google Maps</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Origin / Seller Address Box */}
                  <View style={[styles.addressBox, { marginTop: 12 }]}>
                    <View style={styles.boxHeaderRow}>
                      <Text style={styles.boxTag}>ORIGIN (PICKUP)</Text>
                      {selectedAddressOrder.originAddress.phone && (
                        <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.originAddress.phone)}>
                          <Ionicons name="call-outline" size={14} color="#047857" />
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
                      <Ionicons name="location-outline" size={12} color="#16A34A" />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: 28,
    padding: 4,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 22,
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
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabText: {
    fontWeight: '700',
    fontSize: 11,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 12,
    marginLeft: 3,
  },
  badgePillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgePillInactive: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeTextInactive: {
    color: '#64748B',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  emptyTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontWeight: '500',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
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
    marginBottom: 4,
  },
  orderIdText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationNode: {
    flex: 1,
  },
  nodeLabel: {
    fontWeight: '700',
    fontSize: 9,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  nodeName: {
    fontWeight: '800',
    fontSize: 13.5,
    color: '#073318',
    marginTop: 1,
  },
  nodeSubText: {
    fontWeight: '500',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  arrowCenter: {
    paddingHorizontal: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  viewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  viewAddressText: {
    fontWeight: '700',
    fontSize: 11,
    color: '#16A34A',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  phoneText: {
    fontWeight: '700',
    fontSize: 11,
    color: '#047857',
  },
  locationIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  footerTextGreen: {
    fontWeight: '700',
    fontSize: 11,
    color: '#15803D',
  },
  footerItemPillDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expectedTextGreen: {
    fontWeight: '700',
    fontSize: 11,
    color: '#047857',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '800',
    fontSize: 17,
    color: '#1E293B',
  },
  modalOrderRef: {
    fontWeight: '700',
    fontSize: 13,
    color: '#073318',
    marginBottom: 14,
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  boxTag: {
    fontWeight: '800',
    fontSize: 10,
    color: '#073318',
    letterSpacing: 0.5,
  },
  addressName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 4,
  },
  addressFull: {
    fontWeight: '500',
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 18,
  },
  addressMeta: {
    fontWeight: '500',
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  mapLinkText: {
    fontWeight: '700',
    fontSize: 11.5,
    color: '#16A34A',
  },
  closeButton: {
    backgroundColor: '#073318',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default UpcomingOrdersScreen;
