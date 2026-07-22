import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { CheckCircle, XCircle, Info, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { Colors, Fonts } from '../constants/Colors';
import api from '../services/api';
import { cleanRejectReason } from '../utils/orderUtils';


// ==========================================
// 1. Core Master Detail Interfaces
// ==========================================

export type FlowType = 'shg_to_gmu' | 'gmu_to_shg' | 'shg_to_shg';

export interface ShgEntity {
  id: string;
  name: string;
  mobile: string;
  pickupCount: number;
  dropCount: number;
  status: 'new' | 'accepted' | 'completed';
}

export type BatchStatus = 'NEW_ORDER' | 'ACCEPTED_PICKUP' | 'PICKUP_COMPLETED' | 'DROP_COMPLETED' | 'rejected';
export type ProductStatus = 'pending' | 'picked' | 'completed' | 'rejected';

export interface ProductItem {
  id: string;
  name: string;
  qty: number;
  weight: string;
  legType: 'pickup' | 'drop';
  status: ProductStatus;
  pickupPhoto?: string;
  dropPhoto?: string;
  pickupPhotoTime?: number;
  dropPhotoTime?: number;
  rejectReason?: string;
  isRTO?: boolean;
  verificationCode?: string;
  verificationStatus?: string;
}

export interface BatchOrder {
  id: string;
  displayId?: string;
  areaName: string;
  flowType: FlowType;
  shgName: string;
  pickupPointName: string;
  dropPointName: string;
  pickupCount: number;
  dropCount: number;
  totalQty: number;
  totalWeight: string;
  status: BatchStatus;
  // When this is a pickup batch shown in the Drop tab, this holds the
  // corresponding DropOrder ID so we can call the correct complete endpoint.
  dropOrderId?: number;
  masterOrderId?: number;
  handoverCode?: string;
  isRTO?: boolean;
  shgContact: {
    name: string;
    shgName?: string;
    phone: string;
    address: string;
    village: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  products: ProductItem[];
  rejectReason?: string;
  timestamp?: string;
  createdAt?: string;
}

export interface ActivityEntry {
  id: string;
  orderId: string;
  route: string;
  status: 'Pending' | 'Picked' | 'Dropped' | 'Accepted' | 'Rejected' | 'Completed' | 'NEW_ORDER' | 'ACCEPTED_PICKUP' | 'PICKUP_COMPLETED' | 'DROP_COMPLETED';
  qty: number;
  weight: string;
  timestamp: string;
}

type NotificationType = 'success' | 'error' | 'info';

interface OrderManagementContextType {
  batches: BatchOrder[];
  activities: ActivityEntry[];
  newOrdersCount: number;
  acceptedOrdersCount: number;
  rejectedOrdersCount: number;
  completedOrdersCount: number;

  acceptBatch: (batchId: string, skipToast?: boolean) => Promise<void>;
  rejectBatch: (batchId: string, reason: string) => Promise<void>;
  acceptBatchIds: (batchIds: string[]) => Promise<void>;
  captureProductPhoto: (batchId: string, productId: string, context: 'pickup' | 'drop', photoUri: string) => Promise<void>;
  rejectProductItem: (batchId: string, productId: string, context: 'pickup' | 'drop', reason: string) => Promise<void>;
  rerouteBatchToHub: (batchId: string, productId: string, reason: string) => Promise<void>;

  finalizePickup: (batchId: string, code?: string) => Promise<void>;
  finalizeDrop: (batchId: string, code?: string) => Promise<void>;
  generateDropHandoverCode?: (batchId: string) => Promise<string>;

  showToast: (message: string, type: NotificationType) => void;
  refreshBatchesList: () => Promise<void>;

  // Legacy fallback bindings
  pendingOrdersCount: number;
  gmuSummary: any;
  gmuProducts: any[];
  routes: any[];
  shgProducts: Record<string, any[]>;
  areaAssignments: any[];
  acceptShg: (shgId: string) => void;
  completeProduct: (productId: string, context: 'gmu' | 'shg', photoUri: string, shgId?: string) => void;
  rejectProduct: (productId: string, context: 'gmu' | 'shg', reason: string, shgId?: string) => void;
  acceptAreaAssignment: (id: string) => void;
  rejectAreaAssignment: (id: string, reason: string) => void;
  acceptAllRouteShgs: (routeId: string) => void;
}

export const HUB_CONTACT = {
  name: 'Prasad Patil (Hub Manager)',
  phone: '+91 9123456789',
  address: 'Gadhinglaj Central GMU Hub, Near MIDC Area',
  village: 'Gadhinglaj',
  pincode: '416502',
  latitude: 16.2238,
  longitude: 74.3498,
};


const OrderManagementContext = createContext<OrderManagementContextType | undefined>(undefined);

export const OrderManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [batches, setBatches] = useState<BatchOrder[]>([]);
  const [rejectedBatches, setRejectedBatches] = useState<BatchOrder[]>([]);
  const [completedBatches, setCompletedBatches] = useState<BatchOrder[]>([]);
  const [activitiesState, setActivities] = useState<ActivityEntry[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, { pickupPhoto?: string; pickupPhotoTime?: number; dropPhoto?: string; dropPhotoTime?: number }>>({});
  const [completedDropPickups, setCompletedDropPickups] = useState<string[]>([]);

  // Always-fresh ref so async functions avoid stale closures on batches and photos
  const batchesRef = useRef<BatchOrder[]>(batches);
  const capturedPhotosRef = useRef<Record<string, any>>(capturedPhotos);
  
  useEffect(() => { batchesRef.current = batches; }, [batches]);
  useEffect(() => { capturedPhotosRef.current = capturedPhotos; }, [capturedPhotos]);
  
  // Notification State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<NotificationType>('success');
  const slideAnim = useRef(new Animated.Value(150)).current;

  const showToast = (message: string, type: NotificationType) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    Animated.timing(slideAnim, {
      toValue: -verticalScale(90),
      duration: 500,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      hideToast();
    }, 3500);
  };

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: 150,
      duration: 400,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setToastVisible(false));
  };

  const refreshBatchesList = async () => {
    try {
      // Check if user is logged in
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        return;
      }

      // Load completed drop pickups locally
      const storedDropPickups = await AsyncStorage.getItem('completed_drop_pickups');
      const resolvedDropPickups = storedDropPickups ? JSON.parse(storedDropPickups) : [];

      // 1. Fetch live pickups
      const pickupResponse = await api.get('/orders/pickup/assigned');
      const rawPickups = pickupResponse.data || [];

      // 2. Fetch live drops
      const dropResponse = await api.get('/orders/drop/assigned');
      const rawDrops = dropResponse.data || [];

      const mappedPickups = rawPickups.map((o: any) => ({
        id: `pickup-${o.id}`,
        displayId: o.masterOrder?.orderNumber || `ORD-PICK-${o.masterOrderId || o.id}`,
        areaName: o.seller?.address?.taluka || 'Nesari',
        flowType: 'shg_to_gmu' as FlowType,
        shgName: o.shg?.shgDetail?.shgName || 'Local SHG',
        pickupPointName: o.seller?.address?.village || 'Nesari Stand',
        dropPointName: 'Gadhinglaj Hub',
        pickupCount: 1,
        dropCount: 0,
        totalQty: o.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
        totalWeight: `${o.items?.reduce((sum: number, item: any) => sum + ((item.product?.weight || 0) * (item.quantity || 1)), 0) || 5} kg`,
        status: (o.status === 'PENDING' || o.status === 'RETURN_PENDING' || ((o.status === 'COMPLETED' || o.status === 'RETURNED') && !o.transporterId))
          ? 'NEW_ORDER'
          : (o.pickupTransporterStatus === 'COMPLETED' || o.pickupTransporterStatus === 'DROPPED' || ['HUB_RECEIVED', 'STORED', 'DISPATCHED', 'DROP_ASSIGNED', 'DELIVERED', 'COMPLETED', 'PARCEL_AT_HUB', 'RETURN_PARCEL_AT_HUB', 'AT_HUB'].includes(o.mainStatus || ''))
            ? 'DROP_COMPLETED'
            : (o.pickupTransporterStatus === 'ACCEPTED')
              ? 'ACCEPTED_PICKUP'
              : (o.pickupTransporterStatus === 'PICKED' || o.pickupTransporterStatus === 'IN_TRANSIT_TO_HUB')
                ? 'PICKUP_COMPLETED'
                : 'rejected',
        rejectReason: (() => {
          const rawReason = o.tracking?.[0]?.remarks;
          let reasonVal = rawReason;
          if (rawReason && rawReason.toLowerCase().includes('synchronized') && o.masterOrder?.dropOrders?.[0]) {
            const dropReason = o.masterOrder.dropOrders[0].tracking?.[0]?.remarks;
            if (dropReason) reasonVal = dropReason;
          }
          const finalReason = reasonVal || (o.status === 'REJECTED' ? 'Vehicle Not Available' : undefined);
          return finalReason ? cleanRejectReason(finalReason) : undefined;
        })(),
        // Store the pickup's masterOrderId so we can look up the drop order later
        masterOrderId: o.masterOrderId,
        handoverCode: o.handoverCode,
        isRTO: o.isRTO || false,
        shgContact: {
          name: o.shg?.fullName || o.seller?.sellerName || 'SHG Member',
          phone: o.shg?.phoneNumber || o.seller?.mobileNumber || '',
          address: (() => {
            if (o.seller) {
              const parts = [
                o.seller.addressLine1,
                o.seller.addressLine2,
                o.seller.village,
                o.seller.taluka,
                o.seller.district,
                o.seller.pincode
              ].filter(Boolean);
              if (parts.length > 0) return parts.join(', ');
            }
            if (o.shg?.address) {
              return `${o.shg.address.addressLine1 || ''}, ${o.shg.address.village || ''}`.trim();
            }
            return 'Nesari Stand';
          })(),
          village: o.shg?.address?.village || o.seller?.village || 'Nesari',
          pincode: o.shg?.address?.pincode || o.seller?.pincode || '416504',
          taluka: o.shg?.address?.taluka || o.seller?.taluka || '',
          district: o.shg?.address?.district || o.seller?.district || '',
        },
        products: o.items?.map((item: any) => {
          const pId = String(item.id);
          const photoKey = `${o.masterOrderId}-${item.product?.name || 'General Item'}`;
          const cached = capturedPhotosRef.current[photoKey] || capturedPhotosRef.current[pId] || {};
          return {
            id: pId,
            name: item.product?.name || 'General Item',
            qty: item.quantity,
            weight: `${item.product?.weight || 1} kg`,
            legType: 'pickup' as const,
            status: (o.pickupTransporterStatus === 'PICKED' || o.pickupTransporterStatus === 'IN_TRANSIT_TO_HUB' || o.pickupTransporterStatus === 'COMPLETED' || o.pickupTransporterStatus === 'DROPPED') ? 'picked' : 'pending',
            pickupPhoto: cached.pickupPhoto,
            pickupPhotoTime: cached.pickupPhotoTime,
            dropPhoto: cached.dropPhoto,
            dropPhotoTime: cached.dropPhotoTime,
            isRTO: o.isRTO || false,
            verificationCode: item.verificationCode || '',
            verificationStatus: item.verificationStatus || 'PENDING',
            productId: item.productId,
          };
        }) || [],
        timestamp: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: o.createdAt,
      }));

      const mappedDrops = rawDrops.map((o: any) => {
        const bId = `drop-${o.id}`;
        const isPickupFinished = resolvedDropPickups.includes(bId);
        
        return {
          id: bId,
          displayId: o.masterOrder?.orderNumber || `ORD-PICK-${o.masterOrderId || o.id}`,
          areaName: o.buyer?.address?.taluka || 'Nesari',
          flowType: 'gmu_to_shg' as FlowType,
          shgName: 'Gadhinglaj Hub',
          pickupPointName: 'Gadhinglaj Hub',
          dropPointName: o.deliveryAddress || 'Nesari Stand',
          pickupCount: 0,
          dropCount: 1,
          totalQty: o.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
          totalWeight: `${o.items?.reduce((sum: number, item: any) => sum + ((item.product?.weight || 0) * (item.quantity || 1)), 0) || 5} kg`,
          status: (o.status === 'PENDING' || o.status === 'RETURN_PENDING' || !o.transporterId) 
            ? 'NEW_ORDER' 
            : (o.masterOrder?.dropTransporterStatus === 'COMPLETED' || o.masterOrder?.status === 'PARCEL_AT_DROP_SHG' || o.masterOrder?.status === 'PARCEL_WITH_DROP_SHG' || o.masterOrder?.status === 'DELIVERED' || o.status === 'COMPLETED' || o.status === 'RETURNED' || o.status === 'DELIVERED')
              ? ('DROP_COMPLETED' as const)
              : (o.status === 'ACCEPTED' || o.status === 'RETURN_ACCEPTED' || o.status === 'DISPATCHED') 
                ? (o.masterOrder?.status === 'IN_TRANSIT_TO_BUYER' || isPickupFinished ? ('PICKUP_COMPLETED' as const) : ('ACCEPTED_PICKUP' as const)) 
                : (o.status === 'PICKED_UP' || o.status === 'RETURN_PICKED_UP')
                  ? ('DROP_COMPLETED' as const) // Since SHG picked it up, Transporter must be done
                  : ('rejected' as const),
        rejectReason: (() => {
          const rawReason = o.tracking?.[0]?.remarks;
          let reasonVal = rawReason;
          if (rawReason && rawReason.toLowerCase().includes('synchronized') && o.masterOrder?.pickupOrders?.[0]) {
            const pickupReason = o.masterOrder.pickupOrders[0].tracking?.[0]?.remarks;
            if (pickupReason) reasonVal = pickupReason;
          }
          const finalReason = reasonVal || (o.status === 'REJECTED' ? 'Recipient Not Available' : undefined);
          return finalReason ? cleanRejectReason(finalReason) : undefined;
        })(),
        masterOrderId: o.masterOrderId,
        dropOrderId: o.id, // Track the actual DB drop order ID
        transporterId: o.transporterId,
        handoverCode: o.handoverCode,
        isRTO: o.isRTO || false,
        shgContact: {
          name: o.shg?.fullName || o.buyer?.fullName || 'Recipient',
          shgName: o.shg?.shgDetail?.shgName || '',
          phone: o.shg?.phoneNumber || o.buyer?.phoneNumber || '',
          address: o.deliveryAddress || (o.shg?.address ? `${o.shg.address.addressLine1 || ''}, ${o.shg.address.village || ''}`.trim() : ''),
          village: o.shg?.address?.village || o.buyer?.address?.village || 'Nesari',
          pincode: o.shg?.address?.pincode || o.buyer?.address?.pincode || '416504',
        },
        products: o.items?.map((item: any) => {
          const pId = String(item.id);
          const photoKey = `${o.masterOrderId}-${item.product?.name || 'General Item'}`;
          const cached = capturedPhotosRef.current[photoKey] || capturedPhotosRef.current[pId] || {};
          return {
            id: pId,
            name: item.product?.name || 'General Item',
            qty: item.quantity,
            weight: `${item.product?.weight || 1} kg`,
            legType: 'drop' as const,
            status: (o.status === 'COMPLETED' || o.status === 'RETURNED') ? 'completed' : 'pending',
            pickupPhoto: cached.pickupPhoto,
            pickupPhotoTime: cached.pickupPhotoTime,
            dropPhoto: cached.dropPhoto,
            dropPhotoTime: cached.dropPhotoTime,
            isRTO: o.isRTO || false,
            verificationCode: item.verificationCode || '',
            verificationStatus: item.verificationStatus || 'PENDING',
            productId: item.productId,
          };
        }) || [],
        timestamp: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: o.createdAt,
      };
    });

      // Reconcile completed drop pickups
      const liveDropIds = new Set(mappedDrops.map((d: any) => d.id));
      const cleanedDropPickups = resolvedDropPickups.filter((bId: string) => liveDropIds.has(bId));
      if (cleanedDropPickups.length !== resolvedDropPickups.length) {
        await AsyncStorage.setItem('completed_drop_pickups', JSON.stringify(cleanedDropPickups));
      }

      // Build a masterOrderId → dropOrderId map so PICKUP_COMPLETED batches
      // can resolve their corresponding drop endpoint when completing delivery.
      const masterToDropId: Record<number, number> = {};
      const masterToDropCompleted: Record<number, boolean> = {};
      rawDrops.forEach((o: any) => {
        if (o.masterOrderId) {
          masterToDropId[o.masterOrderId] = o.id;
          masterToDropCompleted[o.masterOrderId] = (o.status === 'COMPLETED');
        }
      });

      // Attach dropOrderId to each pickup batch via masterOrderId correlation.
      // If the corresponding drop order is already completed, set status to DROP_COMPLETED.
      const pickupsWithDropId = mappedPickups.map((b: any) => {
        const dropCompleted = b.masterOrderId ? masterToDropCompleted[b.masterOrderId] : false;
        return {
          ...b,
          dropOrderId: b.masterOrderId ? masterToDropId[b.masterOrderId] : undefined,
          status: dropCompleted ? ('DROP_COMPLETED' as const) : b.status,
        };
      });



      const freshLiveBatches = [...pickupsWithDropId, ...mappedDrops];
      const liveIds = new Set(freshLiveBatches.map(b => b.id));

      // Reconcile persisted rejected/completed caches — remove any IDs
      // that no longer exist on the server (e.g. after a re-seed). This
      // prevents stale 404 errors when the user tries to act on old orders.
      setRejectedBatches(prev => {
        const cleaned = prev.filter(b => liveIds.has(b.id));
        if (cleaned.length !== prev.length) {
          AsyncStorage.setItem('rejected_batches', JSON.stringify(cleaned)).catch(() => {});
        }
        return cleaned;
      });

      // Server-confirmed DROP_COMPLETED batches move into the completed list.
      const serverCompletedDrops = freshLiveBatches.filter(b => b.status === 'DROP_COMPLETED');
      if (serverCompletedDrops.length > 0) {
        setCompletedBatches(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const newCompleted = serverCompletedDrops.filter(b => !existingIds.has(b.id));
          if (newCompleted.length === 0) return prev;
          const updated = [...prev, ...newCompleted];
          AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      } else {
        // Only clean completed cache when no new completed drops arrive
        setCompletedBatches(prev => {
          const cleaned = prev.filter(b => liveIds.has(b.id));
          if (cleaned.length !== prev.length) {
            AsyncStorage.setItem('completed_batches', JSON.stringify(cleaned)).catch(() => {});
          }
          return cleaned;
        });
      }

      // Reconcile and clean up stale activities whose orders no longer exist on the server
      setActivities(prev => {
        const cleaned = prev.filter(act => liveIds.has(act.orderId));
        if (cleaned.length !== prev.length) {
          AsyncStorage.setItem('transporter_activities', JSON.stringify(cleaned)).catch(() => {});
        }
        return cleaned;
      });

      // Reconcile and clean up stale captured photo references
      setCapturedPhotos(prev => {
        const liveMasterOrderIds = new Set(freshLiveBatches.map(b => b.masterOrderId).filter(Boolean));
        const cleaned = { ...prev };
        let changed = false;
        Object.keys(cleaned).forEach(key => {
          const parts = key.split('-');
          const masterId = Number(parts[0]);
          if (!isNaN(masterId) && !liveMasterOrderIds.has(masterId)) {
            delete cleaned[key];
            changed = true;
          }
        });
        if (changed) {
          AsyncStorage.setItem('captured_photos', JSON.stringify(cleaned)).catch(() => {});
        }
        return cleaned;
      });

      // Exclude DROP_COMPLETED from the live batches (they live in completedBatches)
      setBatches(freshLiveBatches.filter(b => b.status !== 'DROP_COMPLETED'));
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.warn('[Session Expiry] Transporter session token is invalid or expired. Redirecting to login...');
      } else {
        console.error('Error fetching live transporter batches:', error);
      }
    }
  };

  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const loadPersistedAndFetch = async () => {
      try {
        const hasCleared = await AsyncStorage.getItem('has_cleared_verification_v10');
        if (!hasCleared) {
          await Promise.all([
            AsyncStorage.removeItem('rejected_batches'),
            AsyncStorage.removeItem('completed_batches'),
            AsyncStorage.removeItem('captured_photos'),
            AsyncStorage.removeItem('transporter_activities'),
            AsyncStorage.removeItem('completed_drop_pickups'),
          ]);
          await AsyncStorage.setItem('has_cleared_verification_v10', 'true');
          console.log('Cleared all legacy storage data for a clean slate.');
        }
      } catch (err) {
        console.error('Failed to clear legacy data:', err);
      }
    };
    loadPersistedAndFetch();
  }, []);

  useEffect(() => {
    const checkTokenAndRefresh = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token !== lastTokenRef.current) {
          lastTokenRef.current = token;
          console.log('[OrderManagementContext] Access token changed. Clearing state and refreshing batches...');
          if (!token) {
            setBatches([]);
            setRejectedBatches([]);
            setCompletedBatches([]);
            setActivities([]);
            setCapturedPhotos({});
            setCompletedDropPickups([]);
          } else {
            const [storedRejected, storedCompleted, storedPhotos, storedActivities] = await Promise.all([
              AsyncStorage.getItem('rejected_batches'),
              AsyncStorage.getItem('completed_batches'),
              AsyncStorage.getItem('captured_photos'),
              AsyncStorage.getItem('transporter_activities'),
            ]);
            setRejectedBatches(storedRejected ? JSON.parse(storedRejected) : []);
            setCompletedBatches(storedCompleted ? JSON.parse(storedCompleted) : []);
            setCapturedPhotos(storedPhotos ? JSON.parse(storedPhotos) : {});
            setActivities(storedActivities ? JSON.parse(storedActivities) : []);
            
            await refreshBatchesList();
          }
        }
      } catch (err) {
        console.error('Error checking token change:', err);
      }
    };

    checkTokenAndRefresh();
    const interval = setInterval(checkTokenAndRefresh, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeBatches = batches.filter(
    b => !rejectedBatches.some(rb => rb.id === b.id) && !completedBatches.some(cb => cb.id === b.id)
  );
  const allBatches = [...activeBatches, ...rejectedBatches, ...completedBatches];

  const activities = useMemo(() => {
    const list: { entry: ActivityEntry; timeMs: number }[] = [];
    
    const formatActivityTimestamp = (dateInput?: string | Date): string => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateObj = dateInput ? new Date(dateInput) : new Date();
      const dateStr = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${dateStr}, ${timeStr}`;
    };

    allBatches.forEach(b => {
      const routeStr = `From - ${b.pickupPointName} To ${b.dropPointName}`;
      const dateObj = b.createdAt ? new Date(b.createdAt) : new Date();
      const timeMs = dateObj.getTime();
      const timeStr = formatActivityTimestamp(dateObj);

      if (b.status === 'ACCEPTED_PICKUP') {
        list.push({
          entry: {
            id: `act-accepted-${b.id}`,
            orderId: b.id,
            route: routeStr,
            status: 'Accepted',
            qty: b.totalQty,
            weight: b.totalWeight,
            timestamp: timeStr,
          },
          timeMs,
        });
      } else if (b.status === 'PICKUP_COMPLETED') {
        list.push({
          entry: {
            id: `act-picked-${b.id}`,
            orderId: b.id,
            route: routeStr,
            status: 'Picked',
            qty: b.totalQty,
            weight: b.totalWeight,
            timestamp: timeStr,
          },
          timeMs,
        });
      } else if (b.status === 'DROP_COMPLETED') {
        list.push({
          entry: {
            id: `act-dropped-${b.id}`,
            orderId: b.id,
            route: routeStr,
            status: 'Dropped',
            qty: b.totalQty,
            weight: b.totalWeight,
            timestamp: timeStr,
          },
          timeMs,
        });
      } else if (b.status === 'rejected') {
        list.push({
          entry: {
            id: `act-rejected-${b.id}`,
            orderId: b.id,
            route: routeStr,
            status: 'Rejected',
            qty: b.totalQty,
            weight: b.totalWeight,
            timestamp: timeStr,
          },
          timeMs,
        });
      }
    });

    activitiesState.forEach(act => {
      if (!list.some(item => item.entry.id === act.id || item.entry.orderId === act.orderId)) {
        let timeMs = Date.now();
        try {
          const parts = act.timestamp.split(',');
          if (parts.length >= 2) {
            timeMs = new Date(parts[0] + ' ' + parts[1]).getTime();
          }
        } catch (e) {}
        list.push({ entry: act, timeMs });
      }
    });

    return list
      .sort((a, b) => b.timeMs - a.timeMs)
      .map(item => item.entry);
  }, [allBatches, activitiesState]);

  const newOrdersCount = activeBatches.filter(b => b.status === 'NEW_ORDER').length;
  const acceptedOrdersCount = activeBatches.filter(b => b.status === 'ACCEPTED_PICKUP' || b.status === 'PICKUP_COMPLETED').length;
  const rejectedOrdersCount = allBatches.filter(b => b.status === 'rejected').length;
  const completedOrdersCount = useMemo(() => {
    const journeyMap: Record<string, boolean> = {};
    allBatches.forEach((b) => {
      if (b.status === 'PICKUP_COMPLETED' || b.status === 'DROP_COMPLETED') {
        const mId = b.masterOrderId ? String(b.masterOrderId) : b.id;
        journeyMap[mId] = true;
      }
    });
    return Object.keys(journeyMap).length;
  }, [allBatches]);

  const logActivity = (orderId: string, route: string, status: ActivityEntry['status'], qty: number, weight: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setActivities(prev => {
      const existingIndex = prev.findIndex(act => act.orderId === orderId && act.status === status);
      const newEntry: ActivityEntry = {
        id: existingIndex !== -1 ? prev[existingIndex].id : `act-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        orderId, 
        route, 
        status, 
        qty, 
        weight,
        timestamp: `${dateStr}, ${timeStr}`,
      };

      let updated: ActivityEntry[];
      if (existingIndex !== -1) {
        const filtered = prev.filter(act => !(act.orderId === orderId && act.status === status));
        updated = [newEntry, ...filtered];
      } else {
        updated = [newEntry, ...prev];
      }
      AsyncStorage.setItem('transporter_activities', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const pruneStaleBatch = (batchId: string) => {
    setRejectedBatches(prev => {
      const updated = prev.filter(b => b.id !== batchId);
      AsyncStorage.setItem('rejected_batches', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    setCompletedBatches(prev => {
      const updated = prev.filter(b => b.id !== batchId);
      AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    setBatches(prev => prev.filter(b => b.id !== batchId));
  };

  const acceptBatch = async (batchId: string, skipToast: boolean = false) => {
    try {


      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const rawId = batchId.replace('pickup-', '').replace('drop-', '');

      // Optimistic UI update — flip status immediately so Accepted screen
      // shows the order without waiting for the server refresh round-trip.
      const optimisticStatus = 'ACCEPTED_PICKUP';
      setBatches(prev =>
        prev.map(b =>
          b.id === batchId ? { ...b, status: optimisticStatus as BatchOrder['status'] } : b
        )
      );

      const batchToLog = batchesRef.current.find(b => b.id === batchId);
      // No activity log on accept — activity only updates on Confirm Pickup / Confirm Delivery

      await api.post(`/orders/${type}/${rawId}/accept`);
      if (!skipToast) {
        showToast(`Accepted`, 'success');
      }
      // Confirm optimistic update with fresh server data
      await refreshBatchesList();
    } catch (error: any) {
      console.error(`Error accepting batch ${batchId}:`, error);
      const is404 = error.response?.status === 404;
      if (is404) {
        pruneStaleBatch(batchId);
      }
      // Roll back optimistic update on error
      await refreshBatchesList();
      
      const message = is404 
        ? 'Order is no longer available.' 
        : 'Failed to accept order. Please try again.';
      if (!skipToast) {
        showToast(message, 'error');
      }
      throw error;
    }
  };

  const acceptBatchIds = async (batchIds: string[]) => {
    try {
      const optimisticStatus = 'ACCEPTED_PICKUP';
      setBatches(prev =>
        prev.map(b =>
          batchIds.includes(b.id) ? { ...b, status: optimisticStatus as BatchOrder['status'] } : b
        )
      );

      // 2. Handle live batches via bulk endpoint
      if (batchIds.length > 0) {
        const ordersToAccept = batchIds.map(batchId => {
          const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
          const rawId = parseInt(batchId.replace('pickup-', '').replace('drop-', ''), 10);
          return { id: rawId, type };
        });

        await api.post('/orders/bulk-accept', { orders: ordersToAccept });
      }

      showToast(`Accepted`, 'success');
      // 4. Confirm update and reload with fresh server data in a single call
      await refreshBatchesList();
    } catch (error: any) {
      console.error('Error accepting batches:', error);
      // Roll back optimistic updates on error
      await refreshBatchesList();
      const is404 = error.response?.status === 404;
      showToast(is404 ? 'One or more orders are no longer available.' : 'Failed to accept some orders. Please try again.', 'error');
      throw error;
    }
  };

  const rejectBatch = async (batchId: string, reason: string) => {
    try {


      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const rawId = batchId.replace('pickup-', '').replace('drop-', '');

      await api.post(`/orders/${type}/${rawId}/reject`, { remarks: reason });
      showToast(`Rejected`, 'error');
      await refreshBatchesList();
    } catch (error: any) {
      console.error(`Error rejecting batch ${batchId}:`, error);
      
      const is404 = error.response?.status === 404;
      if (is404) {
        showToast('Order is no longer available.', 'error');
        pruneStaleBatch(batchId);
      } else {
        showToast(`Failed to reject batch`, 'error');
      }
      await refreshBatchesList();
    }
  };

  const captureProductPhoto = async (batchId: string, productId: string, context: 'pickup' | 'drop', photoUri: string) => {
    try {
      const activeBatch = batchesRef.current.find(b => b.id === batchId);
      const activeProduct = activeBatch?.products.find(p => p.id === productId);
      const masterOrderId = activeBatch?.masterOrderId;
      const productName = activeProduct?.name;

      const photoKey = (masterOrderId && productName) ? `${masterOrderId}-${productName}` : productId;

      // Save photo locally immediately
      setCapturedPhotos(prev => {
        const existing = prev[photoKey] || prev[productId] || {};
        const updated = {
          ...prev,
          [photoKey]: {
            ...existing,
            ...(context === 'pickup' 
              ? { pickupPhoto: photoUri, pickupPhotoTime: Date.now() } 
              : { dropPhoto: photoUri, dropPhotoTime: Date.now() }
            )
          }
        };
        AsyncStorage.setItem('captured_photos', JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      // Update the batches state locally so that the product immediately displays the photo on-screen!
      setBatches(prev =>
        prev.map(b =>
          b.id === batchId
            ? {
                ...b,
                products: b.products.map(p =>
                  p.id === productId
                    ? {
                        ...p,
                        ...(context === 'pickup'
                          ? { pickupPhoto: photoUri, pickupPhotoTime: Date.now() }
                          : { dropPhoto: photoUri, dropPhotoTime: Date.now() }
                        ),
                      }
                    : p
                ),
              }
            : b
        )
      );

      showToast('Photo captured successfully!', 'success');
    } catch (error) {
      console.error(`Error capturing product photo:`, error);
    }
  };

  const finalizePickup = async (batchId: string, code: string = '1234') => {
    try {
      const batchToLog = batchesRef.current.find(b => b.id === batchId);
      if (batchToLog) {
        // Log 'Picked' — the human-readable status shown in Recent Activities
        logActivity(batchToLog.id, `From - ${batchToLog.pickupPointName} To ${batchToLog.dropPointName}`, 'Picked', batchToLog.totalQty, batchToLog.totalWeight);
      }



      if (batchId.startsWith('drop-')) {
        const rawDropId = batchId.replace('drop-', '');

        // Optimistically move batch to PICKUP_COMPLETED in state
        setBatches(prev =>
          prev.map(b =>
            b.id === batchId
              ? {
                  ...b,
                  status: 'PICKUP_COMPLETED' as BatchOrder['status'],
                  products: b.products.map(p => ({
                    ...p,
                    status: 'completed' as const,
                  })),
                }
              : b
          )
        );

        await api.post(`/orders/drop/${rawDropId}/complete-pickup`, { code });
        showToast('Pickup Confirmed', 'success');

        const storedDropPickups = await AsyncStorage.getItem('completed_drop_pickups');
        const resolvedDropPickups: string[] = storedDropPickups ? JSON.parse(storedDropPickups) : [];
        if (!resolvedDropPickups.includes(batchId)) {
          resolvedDropPickups.push(batchId);
          await AsyncStorage.setItem('completed_drop_pickups', JSON.stringify(resolvedDropPickups));
        }
        setCompletedDropPickups(resolvedDropPickups);

        await refreshBatchesList();
        return;
      }

      const rawPickupId = batchId.replace('pickup-', '');

      // Optimistically move batch to PICKUP_COMPLETED in state
      setBatches(prev =>
        prev.map(b =>
          b.id === batchId
            ? {
                ...b,
                status: 'PICKUP_COMPLETED' as BatchOrder['status'],
                products: b.products.map(p =>
                  p.legType === 'pickup' ? { ...p, status: 'picked' as const } : p
                ),
              }
            : b
        )
      );

      await api.post(`/orders/pickup/${rawPickupId}/complete`, { code });
      showToast('Pickup Confirmed', 'success');
      
      // Confirm with fresh server data
      await refreshBatchesList();
    } catch (error: any) {
      console.error(`Error completing batch ${batchId}:`, error);
      const is404 = error.response?.status === 404;
      if (is404) {
        pruneStaleBatch(batchId);
        showToast('Pickup order not found on server.', 'error');
      } else {
        showToast('Failed to confirm pickup. Please try again.', 'error');
      }
      await refreshBatchesList();
      throw error;
    }
  };

  const finalizeDrop = async (batchId: string, code: string = '1234') => {
    try {
      const batchToLog = batchesRef.current.find(b => b.id === batchId);
      if (batchToLog) {
        // Log 'Dropped' — the human-readable status shown in Recent Activities
        logActivity(batchToLog.id, `From - ${batchToLog.pickupPointName} To ${batchToLog.dropPointName}`, 'Dropped', batchToLog.totalQty, batchToLog.totalWeight);
      }



      if (batchId.startsWith('pickup-')) {
        const rawPickupId = batchId.replace('pickup-', '');
        console.log('Completing pickup-drop with ID:', rawPickupId);
        
        // Optimistically move to completed in UI
        const batchToComplete = batchesRef.current.find(b => b.id === batchId);
        if (batchToComplete) {
          setCompletedBatches(prev => {
            if (prev.some(b => b.id === batchId)) return prev;
            const updated = [...prev, { ...batchToComplete, status: 'DROP_COMPLETED' as const }];
            AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(err =>
              console.error('Failed to save completed batches:', err)
            );
            return updated;
          });
          setBatches(prev => prev.filter(b => b.id !== batchId));
        }

        await api.post(`/orders/pickup/${rawPickupId}/complete-drop`);
        showToast('Package delivered successfully!', 'success');
        await refreshBatchesList();
        return;
      }

      let dropOrderId: number | undefined;
      if (batchId.startsWith('drop-')) {
        const rawDropId = batchId.replace('drop-', '');
        dropOrderId = Number(rawDropId);
      } else {
        const batch = batchesRef.current.find(b => b.id === batchId);
        dropOrderId = batch?.dropOrderId;
      }

      if (!dropOrderId) {
        console.log('[Dev GMU Hub Fallback] No dropOrderId found for batch', batchId, '. Completing drop locally in UI.');
        const batchToComplete = batchesRef.current.find(b => b.id === batchId);
        if (batchToComplete) {
          setCompletedBatches(prev => {
            if (prev.some(b => b.id === batchId)) return prev;
            const updated = [...prev, { ...batchToComplete, status: 'DROP_COMPLETED' as const }];
            AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(err =>
              console.error('Failed to save completed batches:', err)
            );
            return updated;
          });
          setBatches(prev => prev.filter(b => b.id !== batchId));
        }
        showToast('Package delivered successfully!', 'success');
        return;
      }

      // Optimistically move to completed
      const batchToComplete = batchesRef.current.find(b => b.id === batchId);
      if (batchToComplete) {
        setCompletedBatches(prev => {
          if (prev.some(b => b.id === batchId)) return prev;
          const updated = [...prev, { ...batchToComplete, status: 'DROP_COMPLETED' as const }];
          AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(err =>
            console.error('Failed to save completed batches:', err)
          );
          return updated;
        });
        // Remove from active batches immediately
        setBatches(prev => prev.filter(b => b.id !== batchId));
      }

      console.log('Completing drop with ID:', dropOrderId, 'and code:', code);
      await api.post(`/orders/drop/${dropOrderId}/complete`, { code });
      showToast('Package delivered successfully!', 'success');

      // Confirm with fresh server data
      await refreshBatchesList();
    } catch (error: any) {
      console.error(`Error completing drop batch ${batchId}:`, error);
      const is404 = error.response?.status === 404;
      if (is404) {
        pruneStaleBatch(batchId);
        showToast('Drop order not found on server.', 'error');
      } else {
        showToast('Failed to complete delivery. Please try again.', 'error');
      }
      await refreshBatchesList();
      throw error;
    }
  };

  const rejectProductItem = async (batchId: string, productId: string, context: 'pickup' | 'drop', reason: string) => {
    try {


      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const rawId = batchId.replace('pickup-', '').replace('drop-', '');

      await api.post(`/orders/${type}/${rawId}/reject`, { remarks: reason });
      showToast(`Order Rejected`, 'error');
      await refreshBatchesList();
    } catch (error: any) {
      console.error('Error rejecting product item:', error);
      const is404 = error.response?.status === 404;
      if (is404) {
        pruneStaleBatch(batchId);
        showToast('Order is no longer available.', 'error');
      } else {
        showToast(`Failed to reject product`, 'error');
      }
      await refreshBatchesList();
    }
  };

  const rerouteBatchToHub = async (batchId: string, productId: string, reason: string) => {
    try {


      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const rawId = batchId.replace('pickup-', '').replace('drop-', '');

      await api.post(`/orders/${type}/${rawId}/reject`, { remarks: reason });
      showToast('Return the product to the updated address.', 'info');
      await refreshBatchesList();
    } catch (error: any) {
      console.error('Error rerouting batch to hub:', error);
      const is404 = error.response?.status === 404;
      if (is404) {
        pruneStaleBatch(batchId);
        showToast('Order is no longer available.', 'error');
      } else {
        showToast(`Failed to initiate return-to-hub`, 'error');
      }
      await refreshBatchesList();
    }
  };

  const generateDropHandoverCode = async (batchId: string) => {
    try {
      let dropOrderId: number | undefined;
      if (batchId.startsWith('drop-')) {
        const rawDropId = batchId.replace('drop-', '');
        dropOrderId = Number(rawDropId);
      } else {
        const batch = batchesRef.current.find(b => b.id === batchId);
        dropOrderId = batch?.dropOrderId;
      }
      if (!dropOrderId) {
        throw new Error('No dropOrderId found for batch');
      }
      const response = await api.post(`/orders/drop/${dropOrderId}/generate-code`);
      await refreshBatchesList();
      return response.data.handoverCode;
    } catch (error) {
      console.error('Error generating drop handover code:', error);
      showToast('Failed to generate code.', 'error');
      throw error;
    }
  };

  return (
    <OrderManagementContext.Provider value={{
      batches: allBatches, activities, newOrdersCount, acceptedOrdersCount, rejectedOrdersCount, completedOrdersCount,
      acceptBatch, rejectBatch, acceptBatchIds, captureProductPhoto, rejectProductItem, rerouteBatchToHub, showToast, refreshBatchesList,
      finalizePickup, finalizeDrop, generateDropHandoverCode,
      pendingOrdersCount: acceptedOrdersCount, gmuSummary: {}, gmuProducts: [], routes: [], shgProducts: {}, areaAssignments: [],
      acceptShg: () => {}, completeProduct: () => {}, rejectProduct: () => {}, acceptAreaAssignment: () => {}, rejectAreaAssignment: () => {}, acceptAllRouteShgs: () => {}
    }}>
      {children}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }, toastType === 'success' ? styles.toastSuccess : toastType === 'error' ? styles.toastError : styles.toastInfo]}>
          <View style={styles.toastContent}>
            {toastType === 'success' && <CheckCircle size={scale(20)} color="#FFFFFF" />}
            {toastType === 'error' && <XCircle size={scale(20)} color="#FFFFFF" />}
            {toastType === 'info' && <Info size={scale(20)} color="#FFFFFF" />}
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
          <TouchableOpacity onPress={hideToast}>
            <X size={scale(16)} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </OrderManagementContext.Provider>
  );
};

export const useOrderManagement = () => {
  const context = useContext(OrderManagementContext);
  if (!context) throw new Error('useOrderManagement must be used within Provider');
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 0,
    left: scale(16),
    right: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderRadius: scale(28), // Pill shape
    zIndex: 99999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  toastSuccess: { backgroundColor: '#073318' }, // Brand Deep Green
  toastError: { backgroundColor: '#B42318' }, // Brand Error Red
  toastInfo: { backgroundColor: '#073318' }, // Brand Deep Green
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    flex: 1,
    marginRight: scale(8),
  },
  toastText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    flex: 1,
  },
});
