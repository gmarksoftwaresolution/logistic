import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { CheckCircle, XCircle, Info, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { Colors, Fonts } from '../constants/Colors';
import api from '../services/api';

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
}

export interface BatchOrder {
  id: string;
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
  shgContact: {
    name: string;
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

  acceptBatch: (batchId: string) => Promise<void>;
  rejectBatch: (batchId: string, reason: string) => Promise<void>;
  acceptBatchIds: (batchIds: string[]) => Promise<void>;
  captureProductPhoto: (batchId: string, productId: string, context: 'pickup' | 'drop', photoUri: string) => Promise<void>;
  rejectProductItem: (batchId: string, productId: string, context: 'pickup' | 'drop', reason: string) => Promise<void>;

  finalizePickup: (batchId: string) => Promise<void>;
  finalizeDrop: (batchId: string) => Promise<void>;

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
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
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
      const pickupResponse = await api.get('/api/orders/pickup/assigned');
      const rawPickups = pickupResponse.data || [];

      // 2. Fetch live drops
      const dropResponse = await api.get('/api/orders/drop/assigned');
      const rawDrops = dropResponse.data || [];

      const mappedPickups = rawPickups.map((o: any) => ({
        id: `pickup-${o.id}`,
        areaName: o.seller?.address?.taluka || 'Nesari',
        flowType: 'shg_to_gmu' as FlowType,
        shgName: o.shg?.shgDetail?.shgName || 'Local SHG',
        pickupPointName: o.seller?.address?.village || 'Nesari Stand',
        dropPointName: 'Gadhinglaj Hub',
        pickupCount: 1,
        dropCount: 0,
        totalQty: o.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
        totalWeight: `${o.items?.reduce((sum: number, item: any) => sum + (item.product?.weight || 0), 0) || 5} kg`,
        status: o.status === 'PENDING' ? 'NEW_ORDER' : o.status === 'ACCEPTED' ? 'ACCEPTED_PICKUP' : o.status === 'COMPLETED' ? 'PICKUP_COMPLETED' : 'rejected',
        // Store the pickup's masterOrderId so we can look up the drop order later
        masterOrderId: o.masterOrderId,
        shgContact: {
          name: o.seller?.fullName || 'Seller',
          phone: o.seller?.phoneNumber || '',
          address: `${o.seller?.address?.addressLine1 || ''}, ${o.seller?.address?.village || ''}`,
          village: o.seller?.address?.village || 'Nesari',
          pincode: o.seller?.address?.pincode || '416504',
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
            status: o.status === 'COMPLETED' ? 'picked' : 'pending',
            pickupPhoto: cached.pickupPhoto,
            pickupPhotoTime: cached.pickupPhotoTime,
            dropPhoto: cached.dropPhoto,
            dropPhotoTime: cached.dropPhotoTime,
          };
        }) || [],
        timestamp: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      const mappedDrops = rawDrops.map((o: any) => {
        const bId = `drop-${o.id}`;
        const isPickupFinished = resolvedDropPickups.includes(bId);
        
        return {
          id: bId,
          areaName: o.buyer?.address?.taluka || 'Nesari',
          flowType: 'gmu_to_shg' as FlowType,
          shgName: 'Gadhinglaj Hub',
          pickupPointName: 'Gadhinglaj Hub',
          dropPointName: o.deliveryAddress || 'Nesari Stand',
          pickupCount: 0,
          dropCount: 1,
          totalQty: o.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
          totalWeight: `${o.items?.reduce((sum: number, item: any) => sum + (item.product?.weight || 0), 0) || 5} kg`,
          status: o.status === 'PENDING' 
            ? 'NEW_ORDER' 
            : o.status === 'ACCEPTED' 
              ? (isPickupFinished ? ('PICKUP_COMPLETED' as const) : ('ACCEPTED_PICKUP' as const)) 
              : o.status === 'COMPLETED' 
                ? ('DROP_COMPLETED' as const) 
                : ('rejected' as const),
        masterOrderId: o.masterOrderId,
        dropOrderId: o.id, // Track the actual DB drop order ID
        shgContact: {
          name: o.buyer?.fullName || 'Buyer',
          phone: o.buyer?.phoneNumber || '',
          address: o.deliveryAddress || '',
          village: o.buyer?.address?.village || 'Nesari',
          pincode: o.buyer?.address?.pincode || '416504',
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
            status: o.status === 'COMPLETED' ? 'completed' : 'pending',
            pickupPhoto: cached.pickupPhoto,
            pickupPhotoTime: cached.pickupPhotoTime,
            dropPhoto: cached.dropPhoto,
            dropPhotoTime: cached.dropPhotoTime,
          };
        }) || [],
        timestamp: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

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

      // Exclude DROP_COMPLETED from the live batches (they live in completedBatches)
      setBatches(freshLiveBatches.filter(b => b.status !== 'DROP_COMPLETED'));
    } catch (error) {
      console.error('Error fetching live transporter batches:', error);
    }
  };

  useEffect(() => {
    const loadPersistedAndFetch = async () => {
      try {
        const [storedRejected, storedCompleted, storedPhotos, storedActivities] = await Promise.all([
          AsyncStorage.getItem('rejected_batches'),
          AsyncStorage.getItem('completed_batches'),
          AsyncStorage.getItem('captured_photos'),
          AsyncStorage.getItem('transporter_activities'),
        ]);
        if (storedRejected) {
          setRejectedBatches(JSON.parse(storedRejected));
        }
        if (storedCompleted) {
          setCompletedBatches(JSON.parse(storedCompleted));
        }
        if (storedPhotos) {
          setCapturedPhotos(JSON.parse(storedPhotos));
        }
        if (storedActivities) {
          setActivities(JSON.parse(storedActivities));
        }
      } catch (err) {
        console.error('Failed to load persisted transporter lists:', err);
      }
      await refreshBatchesList();
    };
    loadPersistedAndFetch();
  }, []);

  const activeBatches = batches.filter(
    b => !rejectedBatches.some(rb => rb.id === b.id) && !completedBatches.some(cb => cb.id === b.id)
  );
  const allBatches = [...activeBatches, ...rejectedBatches, ...completedBatches];

  const newOrdersCount = activeBatches.filter(b => b.status === 'NEW_ORDER').length;
  const acceptedOrdersCount = activeBatches.filter(b => b.status === 'ACCEPTED_PICKUP' || b.status === 'PICKUP_COMPLETED').length;
  const rejectedOrdersCount = rejectedBatches.length;
  const completedOrdersCount = completedBatches.length;

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

  const acceptBatch = async (batchId: string) => {
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

      await api.post(`/api/orders/${type}/${rawId}/accept`);
      showToast(`Accepted`, 'success');
      // Confirm optimistic update with fresh server data
      await refreshBatchesList();
    } catch (error) {
      console.error(`Error accepting batch ${batchId}:`, error);
      // Roll back optimistic update on error
      await refreshBatchesList();
    }
  };

  const rejectBatch = async (batchId: string, reason: string) => {
    try {
      const batchToReject = batches.find(b => b.id === batchId);
      if (batchToReject && batchToReject.status !== 'DROP_COMPLETED') {
        showToast(`Rejected`, 'error');
        logActivity(batchToReject.id, `${batchToReject.pickupPointName} > ${batchToReject.dropPointName}`, 'Rejected', batchToReject.totalQty, batchToReject.totalWeight);
        
        setRejectedBatches(prev => {
          if (prev.some(b => b.id === batchId)) return prev;
          const updated = [...prev, { ...batchToReject, status: 'rejected' as const, rejectReason: reason }];
          AsyncStorage.setItem('rejected_batches', JSON.stringify(updated)).catch(err => 
            console.error('Failed to save rejected batches:', err)
          );
          return updated;
        });
      }
    } catch (error) {
      console.error(`Error rejecting batch ${batchId}:`, error);
    }
  };

  const acceptBatchIds = async (batchIds: string[]) => {
    try {
      await Promise.all(batchIds.map(id => acceptBatch(id)));
      showToast(`Accepted`, 'success');
      await refreshBatchesList();
    } catch (error) {
      console.error('Error accepting batches:', error);
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

  const finalizePickup = async (batchId: string) => {
    try {
      const batchToLog = batchesRef.current.find(b => b.id === batchId);
      if (batchToLog) {
        // Log 'Picked' — the human-readable status shown in Recent Activities
        logActivity(batchToLog.id, `${batchToLog.pickupPointName} > ${batchToLog.dropPointName}`, 'Picked', batchToLog.totalQty, batchToLog.totalWeight);
      }

      if (batchId.startsWith('drop-')) {
        // Save the batch ID to the completed_drop_pickups list in AsyncStorage
        const storedDropPickups = await AsyncStorage.getItem('completed_drop_pickups');
        const resolvedDropPickups: string[] = storedDropPickups ? JSON.parse(storedDropPickups) : [];
        if (!resolvedDropPickups.includes(batchId)) {
          resolvedDropPickups.push(batchId);
          await AsyncStorage.setItem('completed_drop_pickups', JSON.stringify(resolvedDropPickups));
        }
        setCompletedDropPickups(resolvedDropPickups);

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

        showToast('Pickup Confirmed', 'success');
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

      await api.post(`/api/orders/pickup/${rawPickupId}/complete`);
      showToast('Pickup Confirmed', 'success');
      
      // Confirm with fresh server data
      await refreshBatchesList();
    } catch (error) {
      console.error(`Error completing batch ${batchId}:`, error);
      await refreshBatchesList();
      throw error;
    }
  };

  const finalizeDrop = async (batchId: string) => {
    try {
      const batchToLog = batchesRef.current.find(b => b.id === batchId);
      if (batchToLog) {
        // Log 'Dropped' — the human-readable status shown in Recent Activities
        logActivity(batchToLog.id, `${batchToLog.pickupPointName} > ${batchToLog.dropPointName}`, 'Dropped', batchToLog.totalQty, batchToLog.totalWeight);
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
        showToast('Could not find drop order. Please try again.', 'error');
        await refreshBatchesList();
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

      console.log('Completing drop with ID:', dropOrderId);
      await api.post(`/api/orders/drop/${dropOrderId}/complete`);
      showToast('Package delivered successfully!', 'success');

      // Confirm with fresh server data
      await refreshBatchesList();
    } catch (error) {
      console.error(`Error completing drop batch ${batchId}:`, error);
      await refreshBatchesList();
      throw error;
    }
  };

  const rejectProductItem = async (batchId: string, productId: string, context: 'pickup' | 'drop', reason: string) => {
    try {
      const batchToReject = batchesRef.current.find(b => b.id === batchId);
      if (batchToReject) {
        showToast(`Order Rejected`, 'error');
        
        logActivity(
          batchToReject.id, 
          `${batchToReject.pickupPointName} > ${batchToReject.dropPointName}`, 
          'Rejected', 
          batchToReject.totalQty, 
          batchToReject.totalWeight
        );

        setRejectedBatches(prev => {
          if (prev.some(b => b.id === batchId)) return prev;
          const updated = [...prev, { ...batchToReject, status: 'rejected' as const, rejectReason: reason }];
          AsyncStorage.setItem('rejected_batches', JSON.stringify(updated)).catch(err => 
            console.error('Failed to save rejected batches:', err)
          );
          return updated;
        });

        // Remove from active batches immediately
        setBatches(prev => prev.filter(b => b.id !== batchId));
      }
    } catch (error) {
      console.error('Error rejecting product item:', error);
    }
  };

  return (
    <OrderManagementContext.Provider value={{
      batches: allBatches, activities, newOrdersCount, acceptedOrdersCount, rejectedOrdersCount, completedOrdersCount,
      acceptBatch, rejectBatch, acceptBatchIds, captureProductPhoto, rejectProductItem, showToast, refreshBatchesList,
      finalizePickup, finalizeDrop,
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
  },
  toastText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
});
