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
  shgContact: {
    name: string;
    phone: string;
    address: string;
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
};

const OrderManagementContext = createContext<OrderManagementContextType | undefined>(undefined);

export const OrderManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [batches, setBatches] = useState<BatchOrder[]>([]);
  const [rejectedBatches, setRejectedBatches] = useState<BatchOrder[]>([]);
  const [completedBatches, setCompletedBatches] = useState<BatchOrder[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  
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
        shgContact: {
          name: o.seller?.fullName || 'Seller',
          phone: o.seller?.phoneNumber || '',
          address: `${o.seller?.address?.addressLine1 || ''}, ${o.seller?.address?.village || ''}`,
        },
        products: o.items?.map((item: any) => ({
          id: String(item.id),
          name: item.product?.name || 'General Item',
          qty: item.quantity,
          weight: `${item.product?.weight || 1} kg`,
          legType: 'pickup' as const,
          status: o.status === 'COMPLETED' ? 'picked' : 'pending',
        })) || [],
        timestamp: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      const mappedDrops = rawDrops.map((o: any) => ({
        id: `drop-${o.id}`,
        areaName: o.buyer?.address?.taluka || 'Nesari',
        flowType: 'gmu_to_shg' as FlowType,
        shgName: 'Gadhinglaj Hub',
        pickupPointName: 'Gadhinglaj Hub',
        dropPointName: o.deliveryAddress || 'Nesari Stand',
        pickupCount: 0,
        dropCount: 1,
        totalQty: o.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
        totalWeight: `${o.items?.reduce((sum: number, item: any) => sum + (item.product?.weight || 0), 0) || 5} kg`,
        status: o.status === 'PENDING' ? 'NEW_ORDER' : o.status === 'ACCEPTED' ? 'ACCEPTED_PICKUP' : o.status === 'COMPLETED' ? 'DROP_COMPLETED' : 'rejected',
        shgContact: {
          name: o.buyer?.fullName || 'Buyer',
          phone: o.buyer?.phoneNumber || '',
          address: o.deliveryAddress || '',
        },
        products: o.items?.map((item: any) => ({
          id: String(item.id),
          name: item.product?.name || 'General Item',
          qty: item.quantity,
          weight: `${item.product?.weight || 1} kg`,
          legType: 'drop' as const,
          status: o.status === 'COMPLETED' ? 'completed' : 'pending',
        })) || [],
        timestamp: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      setBatches([...mappedPickups, ...mappedDrops]);
    } catch (error) {
      console.error('Error fetching live transporter batches:', error);
    }
  };

  useEffect(() => {
    const loadPersistedAndFetch = async () => {
      try {
        const [storedRejected, storedCompleted] = await Promise.all([
          AsyncStorage.getItem('rejected_batches'),
          AsyncStorage.getItem('completed_batches'),
        ]);
        if (storedRejected) {
          setRejectedBatches(JSON.parse(storedRejected));
        }
        if (storedCompleted) {
          setCompletedBatches(JSON.parse(storedCompleted));
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
    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      orderId, route, status, qty, weight,
      timestamp: `${dateStr}, ${timeStr}`,
    };
    setActivities(prev => [newEntry, ...prev]);
  };

  const acceptBatch = async (batchId: string) => {
    try {
      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const rawId = batchId.replace('pickup-', '').replace('drop-', '');
      await api.post(`/api/orders/${type}/${rawId}/accept`);
      showToast(`Accepted`, 'success');
      await refreshBatchesList();
    } catch (error) {
      console.error(`Error accepting batch ${batchId}:`, error);
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
          const updated = [...prev, { ...batchToReject, status: 'rejected', rejectReason: reason }];
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
      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const rawId = batchId.replace('pickup-', '').replace('drop-', '');
      await api.post(`/api/orders/${type}/${rawId}/complete`);
      showToast(`Package completed successfully`, 'success');
      
      // If dropping off (completing delivery), mark the batch as completed locally
      if (type === 'drop') {
        const batchToComplete = batches.find(b => b.id === batchId);
        if (batchToComplete) {
          setCompletedBatches(prev => {
            if (prev.some(b => b.id === batchId)) return prev;
            const updated = [...prev, { ...batchToComplete, status: 'DROP_COMPLETED' as const }];
            AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(err => 
              console.error('Failed to save completed batches:', err)
            );
            return updated;
          });
        }
      }

      await refreshBatchesList();
    } catch (error) {
      console.error(`Error completing batch ${batchId}:`, error);
    }
  };

  const rejectProductItem = async (batchId: string, productId: string, context: 'pickup' | 'drop', reason: string) => {
    try {
      // Local reject visual representation
      showToast(`Package rejected.`, 'error');
    } catch (error) {
      console.error('Error rejecting product item:', error);
    }
  };

  return (
    <OrderManagementContext.Provider value={{
      batches: allBatches, activities, newOrdersCount, acceptedOrdersCount, rejectedOrdersCount, completedOrdersCount,
      acceptBatch, rejectBatch, acceptBatchIds, captureProductPhoto, rejectProductItem, showToast, refreshBatchesList,
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
