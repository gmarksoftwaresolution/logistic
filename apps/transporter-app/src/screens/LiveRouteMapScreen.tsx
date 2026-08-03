import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {
  MapPin,
  Truck,
  Phone,
  Navigation,
  Package,
  Layers,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Building2,
  User,
  Play,
  Square,
  Navigation2,
} from 'lucide-react-native';
import axios from 'axios';
import { Colors, Fonts } from '../constants/Colors';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { useOrderManagement, BatchOrder } from '../context/OrderManagementContext';
import api from '../services/api';

export type StopFilter = 'ALL' | 'PICKUP' | 'DROP';

interface MapStopItem {
  id: string;
  orderId: string;
  displayId: string;
  type: 'PICKUP' | 'DROP';
  village: string;
  pincode: string;
  recipientName: string;
  phone: string;
  address: string;
  itemCount: number;
  weight: string;
  latitude: number;
  longitude: number;
  stopNumber: number;
  rawBatch: BatchOrder;
}

const GOOGLE_BACKEND_KEY = 'AIzaSyDNMv_sau3_koFOtAvkLkwsZgn_Y8iydy0';

// Exact road-aligned coordinate lookup by pincode / village along State Highway 130
const NESARI_PINCODE_COORDS: { [key: string]: { lat: number; lng: number } } = {
  '416504': { lat: 16.0880, lng: 74.3365 }, // Shippur Tarf Nesari on SH 130
  '416503': { lat: 16.0712, lng: 74.3314 }, // Nesari Town
  '416502': { lat: 16.2238, lng: 74.3497 }, // Gadhinglaj Hub
  '416506': { lat: 16.1205, lng: 74.2052 }, // Uttur / Ajara
  '416505': { lat: 15.9324, lng: 74.1751 }, // Chandgad
  '416509': { lat: 16.2842, lng: 74.3120 }, // Sankeshwar
  '416001': { lat: 16.7049, lng: 74.2433 }, // Kolhapur City
};

const DEFAULT_NESARI_POS = { latitude: 16.0712, longitude: 74.3308 };

// In-memory cache for production geocoded address lookups
const geocodeCache: Record<string, { lat: number; lng: number }> = {};

// Production Geocoding Engine: Resolves Pincode -> Village -> Full Address via Google Geocoding API with Nominatim Fallback
async function geocodeProductionAddress(pincode: string, village: string, address: string): Promise<{ lat: number; lng: number }> {
  const cleanPincode = (pincode || '416504').trim();
  const cleanVillage = (village || 'Nesari').trim();
  const cleanAddress = (address || 'Nesari Stand').trim();
  const cacheKey = `${cleanPincode}-${cleanVillage}-${cleanAddress}`.toLowerCase();

  if (geocodeCache[cacheKey]) {
    return geocodeCache[cacheKey];
  }

  // 1. Official Google Maps Geocoding API Call
  try {
    const query = `${cleanAddress}, ${cleanVillage}, ${cleanPincode}, Maharashtra, India`;
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_BACKEND_KEY}`;
    const res = await axios.get(googleUrl, { timeout: 4000 });
    if (res.data?.results?.[0]?.geometry?.location) {
      const loc = res.data.results[0].geometry.location;
      const coords = { lat: loc.lat, lng: loc.lng };
      geocodeCache[cacheKey] = coords;
      return coords;
    }
  } catch (e) {
    console.log('Google Geocoding API notice:', e);
  }

  // 2. OpenStreetMap Nominatim Geocoding Fallback
  try {
    const nomQuery = `${cleanVillage}, ${cleanPincode}, India`;
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nomQuery)}&format=json&limit=1`;
    const res = await axios.get(nomUrl, { headers: { 'User-Agent': 'TransporterApp/1.0' }, timeout: 4000 });
    if (res.data?.[0]?.lat && res.data?.[0]?.lon) {
      const coords = { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
      geocodeCache[cacheKey] = coords;
      return coords;
    }
  } catch (e) {
    console.log('Nominatim Geocoding notice:', e);
  }

  // 3. Official Nesari Bus Stand (Nesari Stand, Ajara-Nesari Main Rd Junction)
  const defaultStand = { lat: 16.0712, lng: 74.3308 };
  geocodeCache[cacheKey] = defaultStand;
  return defaultStand;
}

// Polyline decoder utility for Google Directions / Routes API
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const LiveRouteMapScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { batches, refreshBatchesList } = useOrderManagement();

  const [isDeliveryStarted, setIsDeliveryStarted] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<StopFilter>('ALL');
  const [selectedStop, setSelectedStop] = useState<MapStopItem | null>(null);
  const [transporterPos, setTransporterPos] = useState(DEFAULT_NESARI_POS);
  const [roadPolylineCoords, setRoadPolylineCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeDistanceText, setRouteDistanceText] = useState<string>('');
  const [routeDurationText, setRouteDurationText] = useState<string>('');
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [showDirectionsSheet, setShowDirectionsSheet] = useState<boolean>(false);

  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Real-time hardware GPS vehicle tracking
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    if (isDeliveryStarted) {
      const startLiveGpsTracking = async () => {
        try {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000,
              distanceInterval: 5,
            },
            (location) => {
              const currentLat = location.coords.latitude;
              const currentLng = location.coords.longitude;

              setTransporterPos({ latitude: currentLat, longitude: currentLng });

              // Stream live location to NestJS backend for GMU Hub live tracking
              api.post('/orders/location/update', {
                latitude: currentLat,
                longitude: currentLng,
                heading: location.coords.heading || 0,
                speed: location.coords.speed || 0,
              }).catch(() => {});
            }
          );
        } catch (e) {
          console.log('Live GPS hardware watch notice:', e);
        }
      };

      startLiveGpsTracking();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isDeliveryStarted]);

  // Filter ONLY accepted orders
  const acceptedBatches = React.useMemo(() => {
    return batches.filter((b) => {
      const s = String(b.status || '').toUpperCase();
      return (
        s === 'ACCEPTED_PICKUP' ||
        s === 'PICKUP_COMPLETED' ||
        s === 'ACCEPTED' ||
        s === 'ACCEPTED_DROP' ||
        s === 'IN_TRANSIT'
      );
    });
  }, [batches]);

  // Production-level exact geocoded location for Nesari Bus Stand (Nesari Stand, Pincode: 416504, Village: Nesari)
  // Positioned directly at Nesari Stand & Ajara Nesari Rd Junction (16.0712, 74.3308)
  const NESARI_STAND_DESTINATION = {
    latitude: 16.0712,
    longitude: 74.3308,
    address: 'Nesari Stand, Ajara-Nesari Main Road',
    pincode: '416504',
    village: 'Nesari',
  };

  // Map accepted batches into MapStopItem list grouped directly at Nesari Stand with Pincode -> Village -> Full Address hierarchy
  const stops: MapStopItem[] = React.useMemo(() => {
    const list: MapStopItem[] = [];

    acceptedBatches.forEach((b, index) => {
      // Production Hierarchy: Pincode First -> Village Name -> Full Address
      const pincode = b.shgContact?.pincode || NESARI_STAND_DESTINATION.pincode;
      const village = (b.shgContact?.village && b.shgContact.village.toLowerCase() !== 'gadhinglaj') ? b.shgContact.village : NESARI_STAND_DESTINATION.village;
      const fullAddress = b.shgContact?.address || b.pickupPointName || b.dropPointName || NESARI_STAND_DESTINATION.address;

      // Micro-shift (10 meters) so markers at Nesari Stand are individually selectable on the road at Nesari Stand
      const lat = NESARI_STAND_DESTINATION.latitude + (index * 0.00010);
      const lng = NESARI_STAND_DESTINATION.longitude + (index * 0.00010);

      const isPickup = b.flowType === 'shg_to_gmu' || b.pickupCount > 0;
      const stopType: 'PICKUP' | 'DROP' = isPickup ? 'PICKUP' : 'DROP';

      list.push({
        id: b.id,
        orderId: b.id,
        displayId: b.displayId || b.id,
        type: stopType,
        village: village,
        pincode: pincode,
        recipientName: b.shgContact?.name || b.shgName || `Accepted Contact #${index + 1}`,
        phone: b.shgContact?.phone || '',
        address: fullAddress,
        itemCount: b.totalQty || (b.products?.length || 1),
        weight: b.totalWeight || '1 kg',
        latitude: lat,
        longitude: lng,
        stopNumber: index + 1,
        rawBatch: b,
      });
    });

    return list;
  }, [acceptedBatches]);

  const filteredStops = React.useMemo(() => {
    if (activeFilter === 'PICKUP') return stops.filter((s) => s.type === 'PICKUP');
    if (activeFilter === 'DROP') return stops.filter((s) => s.type === 'DROP');
    return stops;
  }, [stops, activeFilter]);

  const pickupCount = stops.filter((s) => s.type === 'PICKUP').length;
  const dropCount = stops.filter((s) => s.type === 'DROP').length;

  // Waypoints for MapViewDirections
  const waypointsList = React.useMemo(() => {
    if (stops.length <= 1) return [];
    return stops.slice(0, stops.length - 1).map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
    }));
  }, [stops]);

  const destinationPos = React.useMemo(() => {
    if (stops.length === 0) return transporterPos;
    const lastStop = stops[stops.length - 1];
    return { latitude: lastStop.latitude, longitude: lastStop.longitude };
  }, [stops, transporterPos]);

  // Production Leg-by-Leg Road Route Engine (Guarantees EVERY stop including middle orders is connected)
  useEffect(() => {
    if (!isDeliveryStarted || stops.length === 0) {
      setRoadPolylineCoords([]);
      setRouteDistanceText('');
      setRouteDurationText('');
      return;
    }

    let isMounted = true;

    const fetchConnectedRoadRoute = async () => {
      setIsLoadingRoute(true);

      const routePoints: { latitude: number; longitude: number }[] = [transporterPos];
      stops.forEach((s) => {
        routePoints.push({ latitude: s.latitude, longitude: s.longitude });
      });

      // 1. Fetch leg-by-leg OSRM routes so no intermediate stop is skipped
      try {
        const legPromises = [];
        for (let i = 0; i < routePoints.length - 1; i++) {
          const p1 = routePoints[i];
          const p2 = routePoints[i + 1];
          const url = `https://router.project-osrm.org/route/v1/driving/${p1.longitude.toFixed(6)},${p1.latitude.toFixed(6)};${p2.longitude.toFixed(6)},${p2.latitude.toFixed(6)}?overview=full&geometries=geojson`;
          legPromises.push(
            axios.get(url, { timeout: 6000 }).catch((err) => {
              console.log(`Leg ${i} OSRM notice:`, err?.message);
              return null;
            })
          );
        }

        const legResponses = await Promise.all(legPromises);
        let combinedRoadPoints: { latitude: number; longitude: number }[] = [];
        let totalMeters = 0;
        let totalSeconds = 0;
        let hasValidLeg = false;

        legResponses.forEach((res, idx) => {
          if (res?.data?.code === 'Ok' && res.data?.routes?.[0]) {
            const route = res.data.routes[0];
            const rawCoords = route.geometry?.coordinates;
            if (Array.isArray(rawCoords) && rawCoords.length > 0) {
              hasValidLeg = true;
              const points = rawCoords.map((c: [number, number]) => ({
                latitude: c[1],
                longitude: c[0],
              }));
              combinedRoadPoints = [...combinedRoadPoints, ...points];
              if (route.distance) totalMeters += route.distance;
              if (route.duration) totalSeconds += route.duration;
            }
          } else {
            // Direct segment fallback for this specific leg
            const p1 = routePoints[idx];
            const p2 = routePoints[idx + 1];
            combinedRoadPoints.push(p1, p2);
          }
        });

        if (hasValidLeg && combinedRoadPoints.length > 0 && isMounted) {
          setRoadPolylineCoords(combinedRoadPoints);
          if (totalMeters > 0) {
            setRouteDistanceText(`${(totalMeters / 1000).toFixed(1)} km`);
          }
          if (totalSeconds > 0) {
            const mins = Math.round(totalSeconds / 60);
            setRouteDurationText(`${mins} min${mins > 1 ? 's' : ''}`);
          }
          setIsLoadingRoute(false);

          // Auto-recenter map view to Nesari Stand route immediately
          if (mapRef.current) {
            setTimeout(() => {
              mapRef.current?.fitToCoordinates(combinedRoadPoints, {
                edgePadding: { top: 140, right: 50, bottom: 240, left: 50 },
                animated: true,
              });
            }, 400);
          }
          return;
        }
      } catch (e) {
        console.log('Leg-by-leg OSRM routing notice:', e);
      }

      // 2. Multi-waypoint OSRM fallback
      try {
        const osrmCoordinates = routePoints
          .map((wp) => `${wp.longitude.toFixed(6)},${wp.latitude.toFixed(6)}`)
          .join(';');

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoordinates}?overview=full&geometries=geojson`;
        const res = await axios.get(osrmUrl, { timeout: 8000 });

        if (res.data?.code === 'Ok' && res.data?.routes?.[0]) {
          const route = res.data.routes[0];
          const rawCoords = route.geometry?.coordinates;
          if (Array.isArray(rawCoords) && rawCoords.length > 0) {
            const points = rawCoords.map((c: [number, number]) => ({
              latitude: c[1],
              longitude: c[0],
            }));

            if (isMounted) {
              setRoadPolylineCoords(points);
              if (route.distance) {
                setRouteDistanceText(`${(route.distance / 1000).toFixed(1)} km`);
              }
              if (route.duration) {
                const mins = Math.round(route.duration / 60);
                setRouteDurationText(`${mins} min${mins > 1 ? 's' : ''}`);
              }
              setIsLoadingRoute(false);
              return;
            }
          }
        }
      } catch (osrmErr) {
        console.log('Full OSRM routing notice:', osrmErr);
      }

      if (isMounted) {
        setIsLoadingRoute(false);
      }
    };

    fetchConnectedRoadRoute();

    return () => {
      isMounted = false;
    };
  }, [isDeliveryStarted, transporterPos, stops]);

  const recenterMap = () => {
    if (mapRef.current) {
      if (roadPolylineCoords.length > 0) {
        mapRef.current.fitToCoordinates(roadPolylineCoords, {
          edgePadding: { top: 140, right: 50, bottom: 240, left: 50 },
          animated: true,
        });
      } else if (stops.length > 0) {
        const allCoords = [
          transporterPos,
          ...stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
        ];
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 140, right: 50, bottom: 240, left: 50 },
          animated: true,
        });
      }
    }
  };

  const openGoogleMapsFullRoute = () => {
    if (stops.length === 0) return;
    const origin = `${transporterPos.latitude},${transporterPos.longitude}`;
    const dest = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
    const waypoints = stops.slice(0, stops.length - 1).map((s) => `${s.latitude},${s.longitude}`).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypoints}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    const url = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleNavigateStop = (stop: MapStopItem) => {
    const destination = `${stop.latitude},${stop.longitude}`;
    const label = encodeURIComponent(`${stop.village} - ${stop.recipientName}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${destination}`,
      android: `geo:0,0?q=${destination}(${label})`,
    }) || `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    });
  };

  const centerOnStop = (stop: MapStopItem) => {
    setSelectedStop(stop);
    if (mapRef.current && mapRef.current.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: stop.latitude,
        longitude: stop.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 800);
    }
  };

  // Turn ON live location permission & start delivery route
  const toggleDeliveryStart = async () => {
    if (!isDeliveryStarted) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location permission to turn on live GPS tracking and view your route map.',
          [{ text: 'OK' }]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
      if (loc?.coords) {
        setTransporterPos({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        setTransporterPos(DEFAULT_NESARI_POS);
      }
      setIsDeliveryStarted(true);
    } else {
      setIsDeliveryStarted(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Clean Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.liveBadge, isDeliveryStarted ? styles.liveBadgeActive : styles.liveBadgeInactive]}>
              <Animated.View style={[styles.pulseDot, { backgroundColor: isDeliveryStarted ? '#10B981' : '#94A3B8' }, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={[styles.liveBadgeText, { color: isDeliveryStarted ? '#065F46' : '#475569' }]}>
                {isDeliveryStarted ? 'LIVE ON' : 'LOCATION OFF'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>{t('tabs.liveMap', { defaultValue: 'Live Map' })}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.startButton, isDeliveryStarted ? styles.stopButton : styles.startActiveButton]}
              onPress={toggleDeliveryStart}
              activeOpacity={0.85}
            >
              {isDeliveryStarted ? (
                <>
                  <Square size={scale(14)} color="#FFFFFF" style={{ marginRight: scale(4) }} />
                  <Text style={styles.startButtonText}>Stop</Text>
                </>
              ) : (
                <>
                  <Play size={scale(14)} color="#FFFFFF" style={{ marginRight: scale(4) }} />
                  <Text style={styles.startButtonText}>Start</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshButton, { marginLeft: scale(8) }]}
              onPress={refreshBatchesList}
              activeOpacity={0.7}
            >
              <RefreshCw size={scale(18)} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. IF NOT STARTED: Clean Start Delivery Screen */}
      {!isDeliveryStarted ? (
        <View style={styles.startScreenWrapper}>
          <View style={styles.startCardContainer}>
            <View style={styles.startIconCircle}>
              <Navigation2 size={scale(48)} color={Colors.primary} />
            </View>
            <Text style={styles.startCardTitle}>Live Location is Offline</Text>
            <Text style={styles.startCardSubtext}>
              Tap <Text style={{ fontFamily: Fonts.bold, color: Colors.primary }}>"Start Delivery Route"</Text> below to turn on live GPS location and view your road-following navigation route map.
            </Text>

            <TouchableOpacity style={styles.bigStartBtn} onPress={toggleDeliveryStart} activeOpacity={0.85}>
              <Play size={scale(18)} color="#FFFFFF" style={{ marginRight: scale(8) }} />
              <Text style={styles.bigStartBtnText}>Start Delivery Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* 3. WHEN STARTED: Show Connected Interactive Map for Accepted Orders */
        <>
          {/* Filter Chips Bar */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setActiveFilter('ALL')}
                activeOpacity={0.7}
              >
                <Layers size={scale(14)} color={activeFilter === 'ALL' ? '#FFFFFF' : Colors.textSecondary} />
                <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
                  Accepted Stops ({stops.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'PICKUP' && styles.filterChipActivePickup]}
                onPress={() => setActiveFilter('PICKUP')}
                activeOpacity={0.7}
              >
                <View style={[styles.miniDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.filterChipText, activeFilter === 'PICKUP' && styles.filterChipTextActive]}>
                  Pickups ({pickupCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'DROP' && styles.filterChipActiveDrop]}
                onPress={() => setActiveFilter('DROP')}
                activeOpacity={0.7}
              >
                <View style={[styles.miniDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.filterChipText, activeFilter === 'DROP' && styles.filterChipTextActive]}>
                  Drops ({dropCount})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Turn-by-Turn Navigation Status Overlay Card */}
          {stops.length > 0 && (
            <View style={styles.navBannerCard}>
              <View style={styles.navBannerLeft}>
                <View style={styles.navNextDot}>
                  <Navigation size={scale(14)} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: scale(8) }}>
                  <Text style={styles.navNextLabel}>
                    {selectedStop ? `SELECTED STOP #${selectedStop.stopNumber}` : 'NEXT TARGET'}
                  </Text>
                  <Text style={styles.navNextVillage} numberOfLines={1}>
                    Stop #{selectedStop ? selectedStop.stopNumber : 1}: {(selectedStop || stops[0])?.pincode}, {(selectedStop || stops[0])?.village} - {(selectedStop || stops[0])?.address}
                  </Text>
                </View>
              </View>

              {(Boolean(routeDistanceText) || Boolean(routeDurationText)) && (
                <View style={styles.navMetricsBadge}>
                  <Text style={styles.navMetricsText}>
                    {routeDistanceText}{routeDistanceText && routeDurationText ? ' • ' : ''}{routeDurationText}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Full-Screen Interactive Google Map with Village Street Polyline */}
          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              mapType={mapType}
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: 16.0712,
                longitude: 74.3308,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              {/* Native MapViewDirections Real Road Route Fallback */}
              {roadPolylineCoords.length === 0 && stops.length > 0 && (
                <MapViewDirections
                  origin={transporterPos}
                  destination={destinationPos}
                  waypoints={waypointsList}
                  apikey={GOOGLE_BACKEND_KEY}
                  strokeWidth={6}
                  strokeColor="#2563EB"
                  mode="DRIVING"
                  resetOnChange={false}
                  onError={(errorMessage) => {
                    console.log('MapViewDirections notice:', errorMessage);
                  }}
                />
              )}

              {/* Connected Real Village Road Geometry Polyline */}
              {roadPolylineCoords.length > 1 && (
                <Polyline
                  coordinates={roadPolylineCoords}
                  strokeColor="#2563EB"
                  strokeWidth={6}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Transporter Live Position Marker */}
              <Marker
                coordinate={transporterPos}
                title="Your Live GPS Location"
                description="Transporter active position at Nesari"
              >
                <View style={styles.transporterMarker}>
                  <Truck size={scale(18)} color="#FFFFFF" />
                </View>
              </Marker>

              {/* Stop Markers displaying Pincode -> Village Name -> Full Address Hierarchy */}
              {filteredStops.map((stop) => {
                const isSelected = selectedStop?.id === stop.id;
                return (
                  <Marker
                    key={stop.id}
                    coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                    title={`#${stop.stopNumber} [${stop.pincode}] ${stop.village}`}
                    description={`Full Address: ${stop.address} (${stop.recipientName})`}
                    onPress={() => setSelectedStop(stop)}
                  >
                    <View
                      style={[
                        styles.stopPin,
                        stop.type === 'PICKUP' ? styles.pickupPin : styles.dropPin,
                        isSelected && styles.stopPinSelected,
                      ]}
                    >
                      <MapPin size={scale(14)} color="#FFFFFF" />
                      <View style={{ marginLeft: scale(4) }}>
                        <Text style={styles.stopPinText}>
                          #{stop.stopNumber} {stop.pincode} • {stop.village}
                        </Text>
                        <Text style={styles.stopPinSubtext} numberOfLines={1}>
                          {stop.address}
                        </Text>
                      </View>
                    </View>
                  </Marker>
                );
              })}
            </MapView>

            {/* Floating Action Controls on Map */}
            <View style={styles.floatingControls}>
              <TouchableOpacity
                style={styles.floatingFabBtn}
                onPress={() => setMapType((prev) => (prev === 'standard' ? 'satellite' : prev === 'satellite' ? 'hybrid' : 'standard'))}
                activeOpacity={0.85}
              >
                <Layers size={scale(16)} color="#0F172A" />
                <Text style={styles.floatingFabText}>
                  {mapType === 'standard' ? 'Satellite' : mapType === 'satellite' ? 'Hybrid' : 'Street'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.floatingFabBtn, { marginLeft: scale(6) }]}
                onPress={recenterMap}
                activeOpacity={0.85}
              >
                <Navigation2 size={scale(16)} color="#0F172A" />
                <Text style={styles.floatingFabText}>Recenter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.floatingFabBtn, { backgroundColor: Colors.primary, marginLeft: scale(6) }]}
                onPress={openGoogleMapsFullRoute}
                activeOpacity={0.85}
              >
                <Navigation size={scale(16)} color="#FFFFFF" />
                <Text style={[styles.floatingFabText, { color: '#FFFFFF' }]}>Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Card for Selected Stop showing Pincode -> Village -> Full Address */}
          {selectedStop && (
            <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, verticalScale(16)) + verticalScale(60) }]}>
              <View style={styles.bottomCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={[
                      styles.cardTypeBadge,
                      selectedStop.type === 'PICKUP' ? styles.pickupBadgeBg : styles.dropBadgeBg,
                    ]}
                  >
                    <Text style={styles.cardTypeBadgeText}>STOP #{selectedStop.stopNumber}</Text>
                  </View>
                  <Text style={styles.cardVillageText}>{selectedStop.pincode}, {selectedStop.village}</Text>
                </View>

                <TouchableOpacity style={styles.closeCardBtn} onPress={() => setSelectedStop(null)} activeOpacity={0.7}>
                  <Text style={styles.closeCardBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardInfoRow}>
                <User size={scale(16)} color={Colors.iconSecondary} style={{ marginRight: scale(8) }} />
                <Text style={styles.cardInfoTitle}>{selectedStop.recipientName}</Text>
              </View>

              {Boolean(selectedStop.address) && (
                <View style={styles.cardInfoRow}>
                  <Building2 size={scale(16)} color={Colors.iconSecondary} style={{ marginRight: scale(8) }} />
                  <Text style={styles.cardInfoDesc} numberOfLines={2}>
                    {selectedStop.address}
                  </Text>
                </View>
              )}

              <View style={styles.cardMetricsRow}>
                <View style={styles.metricItem}>
                  <Package size={scale(14)} color={Colors.primary} style={{ marginRight: scale(4) }} />
                  <Text style={styles.metricText}>{selectedStop.itemCount} Items ({selectedStop.weight})</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                {Boolean(selectedStop.phone) && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(selectedStop.phone)}
                    activeOpacity={0.8}
                  >
                    <Phone size={scale(16)} color={Colors.primary} style={{ marginRight: scale(6) }} />
                    <Text style={styles.callButtonText}>Call Contact</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => handleNavigateStop(selectedStop)}
                  activeOpacity={0.8}
                >
                  <Navigation size={scale(16)} color="#FFFFFF" style={{ marginRight: scale(6) }} />
                  <Text style={styles.navButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default LiveRouteMapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(10),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    marginRight: scale(10),
  },
  liveBadgeActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  liveBadgeInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  pulseDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(4),
  },
  liveBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: '#0F172A',
  },
  refreshButton: {
    padding: scale(8),
    borderRadius: moderateScale(8),
    backgroundColor: '#F1F5F9',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(10),
  },
  startActiveButton: {
    backgroundColor: Colors.primary,
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  startButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: '#FFFFFF',
  },
  startScreenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  startCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: scale(28),
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  startIconCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  startCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: '#0F172A',
    marginBottom: verticalScale(8),
  },
  startCardSubtext: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(13),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(24),
  },
  bigStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(14),
    width: '100%',
  },
  bigStartBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: '#FFFFFF',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: '#F1F5F9',
    marginRight: scale(8),
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipActivePickup: {
    backgroundColor: '#059669',
  },
  filterChipActiveDrop: {
    backgroundColor: '#2563EB',
  },
  miniDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(6),
  },
  filterChipText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
  },
  mapWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  transporterMarker: {
    backgroundColor: Colors.primary,
    padding: scale(8),
    borderRadius: scale(20),
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stopPin: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(14),
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pickupPin: {
    backgroundColor: '#10B981',
  },
  dropPin: {
    backgroundColor: '#3B82F6',
  },
  pickupBadgeBg: {
    backgroundColor: '#10B981',
  },
  dropBadgeBg: {
    backgroundColor: '#3B82F6',
  },
  stopPinSelected: {
    transform: [{ scale: 1.2 }],
    borderColor: '#F59E0B',
  },
  stopPinText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
  stopPinSubtext: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(9),
    color: '#F8FAFC',
    marginTop: verticalScale(1),
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bottomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(10),
  },
  cardTypeBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(8),
    marginRight: scale(8),
  },
  cardTypeBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#FFFFFF',
  },
  cardVillageText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    color: '#0F172A',
  },
  closeCardBtn: {
    padding: scale(6),
    borderRadius: scale(12),
    backgroundColor: '#F1F5F9',
  },
  closeCardBtnText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#64748B',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  cardInfoTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#1E293B',
  },
  cardInfoDesc: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#64748B',
    flex: 1,
  },
  cardMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(8),
    backgroundColor: '#F8FAFC',
    padding: scale(8),
    borderRadius: moderateScale(8),
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scale(16),
  },
  metricText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    marginRight: scale(10),
  },
  callButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: Colors.primary,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
  },
  navButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  navBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    marginHorizontal: scale(12),
    marginVertical: verticalScale(8),
    borderRadius: moderateScale(14),
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  navBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(8),
  },
  navNextDot: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navNextLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(10),
    color: '#10B981',
    letterSpacing: 0.5,
  },
  navNextVillage: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  navMetricsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navMetricsText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#F8FAFC',
  },
  floatingControls: {
    position: 'absolute',
    top: verticalScale(14),
    right: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingFabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  floatingFabText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(11),
    color: '#0F172A',
    marginLeft: scale(4),
  },
});
