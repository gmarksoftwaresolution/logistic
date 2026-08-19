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
            style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({safeUpcomingOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pickup' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pickup')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'pickup' && styles.tabTextActive]}>
              Seller Pickups ({pickupCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'drop' && styles.tabButtonActive]}
            onPress={() => setActiveTab('drop')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'drop' && styles.tabTextActive]}>
              Buyer Deliveries ({dropCount})
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
              colors={['#0284C7']}
              tintColor="#0284C7"
            />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Feather name="archive" size={32} color="#0284C7" />
              </View>
              <Text style={styles.emptyTitle}>No Upcoming Orders</Text>
              <Text style={styles.emptySubtitle}>
                Future expected pickup and delivery requests matching your village location will appear here automatically when created in GMU Hub.
              </Text>
            </View>
          ) : (
            filteredOrders.map(item => {
              const isPickupLeg = item.legType === 'pickup';
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

                  {/* Route Corridor Visualizer */}
                  <View style={styles.routeContainer}>
                    <View style={styles.locationNode}>
                      <Text style={styles.nodeLabel}>ORIGIN / SELLER</Text>
                      <Text style={styles.nodeName} numberOfLines={1}>{item.originAddress.name}</Text>
                      <Text style={styles.nodeSubText} numberOfLines={1}>{item.originAddress.village}, {item.originAddress.district}</Text>
                    </View>

                    <View style={styles.arrowCenter}>
                      <Feather name="arrow-right" size={16} color="#94A3B8" />
                    </View>

                    <View style={styles.locationNode}>
                      <Text style={styles.nodeLabel}>DESTINATION / BUYER</Text>
                      <Text style={styles.nodeName} numberOfLines={1}>{item.destinationAddress.name}</Text>
                      <Text style={styles.nodeSubText} numberOfLines={1}>{item.destinationAddress.village}, {item.destinationAddress.district}</Text>
                    </View>
                  </View>

                  {/* Action Row */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.viewAddressButton}
                      onPress={() => setSelectedAddressOrder(item)}
                      activeOpacity={0.7}
                    >
                      <Feather name="map-pin" size={12} color="#16A34A" />
                      <Text style={styles.viewAddressText}>View Address Details</Text>
                    </TouchableOpacity>

                    {item.originAddress.phone ? (
                      <TouchableOpacity
                        style={styles.phoneButton}
                        onPress={() => handleCall(item.originAddress.phone)}
                        activeOpacity={0.7}
                      >
                        <Feather name="phone" size={12} color="#0284C7" />
                        <Text style={styles.phoneText}>Call Origin</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                      <Feather name="package" size={14} color="#64748B" />
                      <Text style={styles.footerText}>{item.totalQty} items • {item.totalWeight}</Text>
                    </View>

                    <View style={styles.footerItem}>
                      <Feather name="calendar" size={14} color="#0284C7" />
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
                    <Feather name="x" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  <Text style={styles.modalOrderRef}>
                    {selectedAddressOrder.displayId} ({selectedAddressOrder.legTitle})
                  </Text>

                  {/* Origin / Seller Address Box */}
                  <View style={styles.addressBox}>
                    <View style={styles.boxHeaderRow}>
                      <Text style={styles.boxTag}>ORIGIN (PICKUP)</Text>
                      {selectedAddressOrder.originAddress.phone && (
                        <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.originAddress.phone)}>
                          <Feather name="phone" size={14} color="#0284C7" />
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
                      <Feather name="map-pin" size={12} color="#2563EB" />
                      <Text style={styles.mapLinkText}>Open in Google Maps</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Destination / Buyer Address Box */}
                  <View style={[styles.addressBox, { marginTop: 12 }]}>
                    <View style={styles.boxHeaderRow}>
                      <Text style={[styles.boxTag, { color: '#0284C7' }]}>DESTINATION (DELIVERY)</Text>
                      {selectedAddressOrder.destinationAddress.phone && (
                        <TouchableOpacity onPress={() => handleCall(selectedAddressOrder.destinationAddress.phone)}>
                          <Feather name="phone" size={14} color="#0284C7" />
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
                      <Feather name="map-pin" size={12} color="#2563EB" />
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
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0284C7',
  },
  tabText: {
    fontWeight: '700',
    fontSize: 11.5,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
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
    marginBottom: 12,
  },
  orderIdText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A',
  },
  legBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeIndigo: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  badgeCyan: { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD' },
  legBadgeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  textIndigo: { color: '#16A34A' },
  textCyan: { color: '#0284C7' },

  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
    fontSize: 13,
    color: '#1E293B',
    marginTop: 2,
  },
  nodeSubText: {
    fontWeight: '500',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  arrowCenter: {
    paddingHorizontal: 8,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
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
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  phoneText: {
    fontWeight: '700',
    fontSize: 11,
    color: '#0284C7',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontWeight: '500',
    fontSize: 12,
    color: '#64748B',
  },
  expectedText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#0284C7',
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
    color: '#0284C7',
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
    color: '#4F46E5',
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
    color: '#2563EB',
  },
  closeButton: {
    backgroundColor: '#1E293B',
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
