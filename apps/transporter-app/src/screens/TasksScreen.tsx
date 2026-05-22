import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text, TextInput, ScrollView, Dimensions, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Colors';
import ScreenHeader from '../components/ScreenHeader';
import TripCard, { Trip, Stop, Product } from '../components/TripCard';
import TripDetailsModal from '../components/TripDetailsModal';
import CustomToast from '../components/CustomToast';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Calendar, Navigation2, ChevronDown, Package } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

const MAIN_TABS = ['Today Trips', 'Weekly Planner'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const INITIAL_TRIPS: Trip[] = [
  {
    id: 't1',
    tripId: 'TRIP-402-IN',
    type: 'Inbound',
    status: 'Assigned',
    totalDistance: '24 km',
    expectedTime: '1h 20m',
    totalProducts: 2,
    completedProducts: 0,
    stops: [
      {
        id: 's1',
        type: 'Pickup',
        locationName: 'Srijan SHG Hub',
        address: 'Sector 4, Industrial Area, Bhilai',
        contact: '+91 98220 44551',
        status: 'Pending',
        products: [
          { id: 'p1', name: 'Raw Cotton Bales', expectedQty: 5, completedQty: 0, status: 'Pending', type: 'Pickup' },
        ]
      },
      {
        id: 's2',
        type: 'Pickup',
        locationName: 'Green Valley Artisans',
        address: 'Organic Farm Gate, Kolar Road',
        contact: '+91 91234 56789',
        status: 'Pending',
        products: [
          { id: 'p3', name: 'Fresh Turmeric', expectedQty: 20, completedQty: 0, status: 'Pending', type: 'Pickup' },
        ]
      },
      {
        id: 's3',
        type: 'Drop',
        locationName: 'Central GMU Hub',
        address: 'Logistics Park, Phase 1, Raipur',
        contact: '+91 90000 11111',
        status: 'Pending',
        products: [], // Will be auto-filled upon Pickup
      },
    ],
  },
  {
    id: 't2',
    tripId: 'TRIP-805-OUT',
    type: 'Outbound',
    status: 'Assigned',
    totalDistance: '42 km',
    expectedTime: '2h 45m',
    totalProducts: 3,
    completedProducts: 0,
    stops: [
      {
        id: 's4',
        type: 'Pickup',
        locationName: 'Central GMU Hub',
        address: 'Logistics Park, Phase 1, Raipur',
        contact: '+91 90000 11111',
        status: 'Pending',
        products: [
          { id: 'p5', name: 'Packaging Kits', expectedQty: 100, completedQty: 0, status: 'Pending', type: 'Pickup' },
        ]
      },
      {
        id: 's5',
        type: 'Drop',
        locationName: 'LifeCare SHG',
        address: 'Biotech Zone, Naya Raipur',
        contact: '+91 90000 22222',
        status: 'Pending',
        products: [
          { id: 'p6', name: 'Eco-Bags', expectedQty: 500, completedQty: 0, status: 'Pending', type: 'Drop' },
          { id: 'p7', name: 'Labeling Kits', expectedQty: 50, completedQty: 0, status: 'Pending', type: 'Drop' },
        ]
      },
    ],
  },
];

const TasksScreen = () => {
  const { t } = useTranslation();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const scrollX = React.useRef(new Animated.Value(0)).current;
  
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [activeMainTab, setActiveMainTab] = useState('Today Trips');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleMainTabPress = (tab: string, index: number) => {
    setActiveMainTab(tab);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const onScrollEnd = (e: any) => {
    const contentOffset = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);
    setActiveMainTab(MAIN_TABS[index]);
  };

  const translateX = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0, SCREEN_WIDTH / 2],
  });

  const handleProductComplete = (stopId: string, productId: string, proofImage: string) => {
    setTrips(prev => prev.map(trip => {
      if (selectedTrip && trip.id === selectedTrip.id) {
        let newTotalProducts = trip.totalProducts;
        let productToForward: Product | null = null;

        const updatedStops = trip.stops.map(stop => {
          if (stop.id === stopId) {
            const updatedProducts = stop.products.map(p => {
              if (p.id === productId) {
                const updatedP = { ...p, status: 'Completed' as const, completedQty: p.expectedQty, proofImage };
                if (trip.type === 'Inbound' && p.type === 'Pickup') {
                  productToForward = updatedP;
                }
                return updatedP;
              }
              return p;
            });

            const completedCount = updatedProducts.filter(p => p.status === 'Completed').length;
            const stopStatus = completedCount === 0 ? 'Pending' : completedCount === updatedProducts.length ? 'Completed' : 'Partial';

            return { ...stop, products: updatedProducts, status: stopStatus as any };
          }
          return stop;
        });

        // Dynamic Product Forwarding for Inbound Trips
        let finalStops = updatedStops;
        if (productToForward) {
          finalStops = updatedStops.map(stop => {
            if (stop.type === 'Drop') {
              const alreadyExists = stop.products.find(p => p.id === `drop-${productId}`);
              if (!alreadyExists) {
                const forwardedProduct: Product = {
                  id: `drop-${productId}`,
                  name: (productToForward as Product).name,
                  expectedQty: (productToForward as Product).expectedQty,
                  completedQty: 0,
                  status: 'Pending',
                  type: 'Drop'
                };
                newTotalProducts += 1;
                return { ...stop, products: [...stop.products, forwardedProduct], status: 'Partial' as any };
              }
            }
            return stop;
          });
        }

        const totalCompleted = finalStops.reduce((acc, stop) => acc + stop.products.filter(p => p.status === 'Completed').length, 0);
        const tripStatus = totalCompleted === newTotalProducts ? 'Completed' : 'In Progress';

        const updatedTrip = { ...trip, stops: finalStops, totalProducts: newTotalProducts, completedProducts: totalCompleted, status: tripStatus as any };
        setSelectedTrip(updatedTrip);
        
        setToastMessage(productToForward ? `Picked up! Items added to Hub Drop.` : `Product completed with photo proof!`);
        setSuccessVisible(true);
        
        return updatedTrip;
      }
      return trip;
    }));
  };

  const renderTripList = (tabType: string) => {
    const filtered = trips.filter(trip => {
      const matchesSearch = trip.tripId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    return (
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => {
              setSelectedTrip(item);
              setDetailsVisible(true);
            }}
          />
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader 
        title="Fleet Management" 
        subtitle="Manage Inbound & Outbound Trips"
        showBackButton={true} 
        showProfile={false} 
        showHelp={true} 
      />
      
      <View style={styles.tabContainer}>
        <View style={styles.mainTabWrapper}>
          <Animated.View 
            style={[
              styles.activeTabIndicator, 
              { transform: [{ translateX }] }
            ]} 
          />
          {MAIN_TABS.map((tab, index) => {
            const isActive = activeMainTab === tab;
            return (
              <TouchableOpacity 
                key={tab}
                style={[styles.mainTab]}
                onPress={() => handleMainTabPress(tab, index)}
              >
                <View style={styles.tabContent}>
                  {index === 0 ? (
                    <Navigation2 size={scale(18)} color={isActive ? Colors.primary : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} />
                  ) : (
                    <Calendar size={scale(18)} color={isActive ? Colors.primary : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                  <Text style={[styles.mainTabText, isActive && styles.activeMainTabText]}>
                    {tab}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={scale(18)} color="#94A3B8" />
          <TextInput 
            placeholder="Search Trip ID (e.g. 402)"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.locationFilter}>
            <MapPin size={scale(18)} color={Colors.primary} />
            <Text style={styles.locationText}>Filter Hub</Text>
            <ChevronDown size={scale(14)} color={Colors.textSecondary} style={styles.chevron} />
          </TouchableOpacity>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Inbound</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Outbound</Text>
            </View>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
      >
        {MAIN_TABS.map(tab => (
          <View key={tab} style={{ width: SCREEN_WIDTH }}>
            {renderTripList(tab)}
          </View>
        ))}
      </Animated.ScrollView>

      <TripDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        trip={selectedTrip}
        onProductComplete={handleProductComplete}
      />

      <CustomToast
        visible={successVisible}
        onHide={() => setSuccessVisible(false)}
        message={toastMessage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabContainer: {
    backgroundColor: 'transparent',
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(8),
    zIndex: 10,
  },
  mainTabWrapper: {
    flexDirection: 'row',
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(4),
  },
  mainTab: {
    flex: 1,
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  mainTabText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#94A3B8',
  },
  activeMainTabText: {
    color: Colors.primary,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: verticalScale(4),
    width: '40%',
    left: '5%',
    height: verticalScale(3.5),
    backgroundColor: Colors.primary,
    borderRadius: scale(2),
  },
  searchSection: {
    padding: scale(20),
    gap: verticalScale(16),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    height: verticalScale(50),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    marginLeft: scale(10),
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    height: verticalScale(36),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.textPrimary,
    marginLeft: scale(6),
    marginRight: scale(4),
  },
  chevron: {
    marginLeft: scale(2),
  },
  legendRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  legendDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  legendText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#64748B',
  },
  listContainer: {
    padding: scale(20),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(120),
  },
});

export default TasksScreen;
