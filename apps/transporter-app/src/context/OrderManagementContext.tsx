import React, { createContext, useContext, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
import { CheckCircle, XCircle, Info, X } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { Colors, Fonts } from '../constants/Colors';

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

  acceptBatch: (batchId: string) => void;
  rejectBatch: (batchId: string, reason: string) => void;
  acceptBatchIds: (batchIds: string[]) => void;
  captureProductPhoto: (batchId: string, productId: string, context: 'pickup' | 'drop', photoUri: string) => void;
  rejectProductItem: (batchId: string, productId: string, context: 'pickup' | 'drop', reason: string) => void;

  showToast: (message: string, type: NotificationType) => void;

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

const INITIAL_BATCHES: BatchOrder[] = [
  // 1. Nesari
  {
    id: '#ORD-1769749895005-1',
    areaName: 'Nesari',
    flowType: 'shg_to_gmu',
    shgName: 'SHG Laxmi Nesari',
    pickupPointName: 'Nesari Market',
    dropPointName: 'Gadhinglaj Hub',
    pickupCount: 1,
    dropCount: 0,
    totalQty: 1,
    totalWeight: '5 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Radha Patil', phone: '+91 9422011223', address: 'Main Bazar Link, Nesari', village: 'Nesari', pincode: '416504', latitude: 16.0398, longitude: 74.4231 },
    products: [{ id: 'pn01', name: 'Turmeric Powder', qty: 1, weight: '5 kg', legType: 'pickup', status: 'pending' }],
    timestamp: '08:30 AM',
  },
  {
    id: '#ORD-1769749895005-2',
    areaName: 'Nesari',
    flowType: 'gmu_to_shg',
    shgName: 'SHG Ambika Nesari',
    pickupPointName: 'Gadhinglaj Hub',
    dropPointName: 'Nesari Stand',
    pickupCount: 1,
    dropCount: 1,
    totalQty: 1,
    totalWeight: '2 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Sarika Patil', phone: '+91 9890123456', address: 'Nesari Main Road', village: 'Nesari', pincode: '416504', latitude: 16.0402, longitude: 74.4215 },
    products: [{ id: 'pn02', name: 'Packaging Bags', qty: 1, weight: '2 kg', legType: 'drop', status: 'pending' }],
    timestamp: '08:45 AM',
  },
  // 2. Wagharale
  {
    id: '#ORD-1769749895005-3',
    areaName: 'Wagharale',
    flowType: 'shg_to_gmu',
    shgName: 'SHG Savitri Wagrale',
    pickupPointName: 'Shivaji Nagar',
    dropPointName: 'Gadhinglaj Hub',
    pickupCount: 1,
    dropCount: 0,
    totalQty: 1,
    totalWeight: '8 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Sarika Patil', phone: '+91 9657123488', address: 'Zilla Parishad School Edge', village: 'Wagharale', pincode: '416502', latitude: 16.1956, longitude: 74.3120 },
    products: [{ id: 'pw01', name: 'Cashew Boxes', qty: 1, weight: '8 kg', legType: 'pickup', status: 'pending' }],
    timestamp: '09:15 AM',
  },
  {
    id: '#ORD-1769749895005-4',
    areaName: 'Wagharale',
    flowType: 'gmu_to_shg',
    shgName: 'SHG Jyotiba Wagharale',
    pickupPointName: 'Gadhinglaj Hub',
    dropPointName: 'Wagharale Chowk',
    pickupCount: 1,
    dropCount: 1,
    totalQty: 1,
    totalWeight: '3 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Radha Patil', phone: '+91 9011223344', address: 'Wagharale Hill Side', village: 'Wagharale', pincode: '416502', latitude: 16.1962, longitude: 74.3105 },
    products: [{ id: 'pw02', name: 'Labels & Tape', qty: 1, weight: '3 kg', legType: 'drop', status: 'pending' }],
    timestamp: '09:30 AM',
  },
  // 3. Mahagaon
  {
    id: '#ORD-1769749895005-5',
    areaName: 'Mahagaon',
    flowType: 'shg_to_gmu',
    shgName: 'SHG Ambika Mahagaon',
    pickupPointName: 'Mahagaon Stand',
    dropPointName: 'Gadhinglaj Hub',
    pickupCount: 1,
    dropCount: 0,
    totalQty: 1,
    totalWeight: '10 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Sunita Jadhav', phone: '+91 9890123456', address: 'Gram Panchayat Road', village: 'Mahagaon', pincode: '416503', latitude: 16.1412, longitude: 74.4568 },
    products: [{ id: 'pm01', name: 'Jaggery Blocks', qty: 1, weight: '10 kg', legType: 'pickup', status: 'pending' }],
    timestamp: '10:00 AM',
  },
  {
    id: '#ORD-1769749895005-6',
    areaName: 'Mahagaon',
    flowType: 'gmu_to_shg',
    shgName: 'SHG Samrudhi Mahagaon',
    pickupPointName: 'Gadhinglaj Hub',
    dropPointName: 'Mahagaon Market',
    pickupCount: 1,
    dropCount: 1,
    totalQty: 1,
    totalWeight: '4 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Sunita Jadhav', phone: '+91 9552123456', address: 'Highway Link', village: 'Mahagaon', pincode: '416503', latitude: 16.1420, longitude: 74.4550 },
    products: [{ id: 'pm02', name: 'Empty Bottles', qty: 1, weight: '4 kg', legType: 'drop', status: 'pending' }],
    timestamp: '10:15 AM',
  },
  // 4. Halkarni (New Route)
  {
    id: '#ORD-1769749895005-7',
    areaName: 'Halkarni',
    flowType: 'shg_to_gmu',
    shgName: 'SHG Durga Halkarni',
    pickupPointName: 'Halkarni Phata',
    dropPointName: 'Gadhinglaj Hub',
    pickupCount: 1,
    dropCount: 0,
    totalQty: 1,
    totalWeight: '12 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Laxmi Patil', phone: '+91 9923112233', address: 'Halkarni MIDC Area', village: 'Halkarni', pincode: '416506', latitude: 16.1154, longitude: 74.4123 },
    products: [{ id: 'ph01', name: 'Papad Packs', qty: 1, weight: '12 kg', legType: 'pickup', status: 'pending' }],
    timestamp: '11:00 AM',
  },
  {
    id: '#ORD-1769749895005-8',
    areaName: 'Halkarni',
    flowType: 'gmu_to_shg',
    shgName: 'SHG Durga Halkarni',
    pickupPointName: 'Gadhinglaj Hub',
    dropPointName: 'Halkarni Phata',
    pickupCount: 1,
    dropCount: 1,
    totalQty: 1,
    totalWeight: '5 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Laxmi Patil', phone: '+91 9923112233', address: 'Halkarni MIDC Area', village: 'Halkarni', pincode: '416506', latitude: 16.1154, longitude: 74.4123 },
    products: [{ id: 'ph02', name: 'Spices Mix', qty: 1, weight: '5 kg', legType: 'drop', status: 'pending' }],
    timestamp: '11:15 AM',
  },
  // 5. Gadhinglaj Hub
  {
    id: '#ORD-1769749895005-9',
    areaName: 'Gadhinglaj Hub',
    flowType: 'gmu_to_shg',
    shgName: 'SHG Saraswati Central',
    pickupPointName: 'Gadhinglaj Hub',
    dropPointName: 'Dr Colony',
    pickupCount: 1,
    dropCount: 0,
    totalQty: 1,
    totalWeight: '15 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Laxmi Patil', phone: '+91 9923123456', address: 'APMC Godown Yard', village: 'Gadhinglaj', pincode: '416502', latitude: 16.2215, longitude: 74.3512 },
    products: [{ id: 'pg01', name: 'Heavy Crates', qty: 1, weight: '15 kg', legType: 'pickup', status: 'pending' }],
    timestamp: '11:45 AM',
  },
  {
    id: '#ORD-1769749895005-10',
    areaName: 'Gadhinglaj Hub',
    flowType: 'shg_to_gmu',
    shgName: 'SHG Mahalaxmi Central',
    pickupPointName: 'Market Line',
    dropPointName: 'Gadhinglaj Hub',
    pickupCount: 0,
    dropCount: 1,
    totalQty: 1,
    totalWeight: '10 kg',
    status: 'NEW_ORDER',
    shgContact: { name: 'Sunita Jadhav', phone: '+91 9011998877', address: 'Market Line Circle', village: 'Gadhinglaj', pincode: '416502', latitude: 16.2201, longitude: 74.3485 },
    products: [{ id: 'pg02', name: 'Raw Materials', qty: 1, weight: '10 kg', legType: 'drop', status: 'pending' }],
    timestamp: '12:00 PM',
  },
];

const OrderManagementContext = createContext<OrderManagementContextType | undefined>(undefined);

export const OrderManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [batches, setBatches] = useState<BatchOrder[]>(INITIAL_BATCHES);
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

  const newOrdersCount = batches.filter(b => b.status === 'NEW_ORDER').length;
  const acceptedOrdersCount = batches.filter(b => b.status === 'ACCEPTED_PICKUP' || b.status === 'PICKUP_COMPLETED').length;
  const rejectedOrdersCount = batches.filter(b => b.status === 'rejected').length;
  const completedOrdersCount = batches.filter(b => b.status === 'DROP_COMPLETED').length;

  const logActivity = (orderId: string, route: string, status: ActivityEntry['status'], qty: number, weight: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setActivities(prev => {
      const existingIndex = prev.findIndex(act => act.orderId === orderId);
      const newEntry: ActivityEntry = {
        id: existingIndex !== -1 ? prev[existingIndex].id : `act-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        orderId, 
        route, 
        status, 
        qty, 
        weight,
        timestamp: `${dateStr}, ${timeStr}`,
      };

      if (existingIndex !== -1) {
        const filtered = prev.filter(act => act.orderId !== orderId);
        return [newEntry, ...filtered];
      } else {
        return [newEntry, ...prev];
      }
    });
  };

  const evaluateBatchCascade = (currentBatches: BatchOrder[], targetBatchId: string) => {
    return currentBatches.map((batch) => {
      if (batch.id === targetBatchId) {
        const allProductsRejected = batch.products.every(p => p.status === 'rejected');

        if (allProductsRejected && batch.status !== 'rejected') {
          showToast(`Order Rejected`, 'error');
          const firstRejectedReason = batch.products.find(p => p.status === 'rejected')?.rejectReason || '';
          return {
            ...batch,
            status: 'rejected' as BatchStatus,
            rejectReason: firstRejectedReason,
          };
        }

        // Condition for final completion (Drop leg finished)
        const allItemsDone = batch.products.every(p => p.status === 'completed' || p.status === 'rejected');

        if (allItemsDone && batch.status !== 'DROP_COMPLETED') {
          showToast(`Delivered`, 'success');
          return { 
            ...batch, 
            status: 'DROP_COMPLETED' as BatchStatus, 
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          };
        }

        // Condition for mid-point completion (Pickup leg finished, moving to drop)
        if (batch.status === 'ACCEPTED_PICKUP') {
          const pickupProducts = batch.flowType === 'gmu_to_shg'
            ? batch.products.filter(p => p.legType === 'drop')
            : batch.products.filter(p => p.legType === 'pickup');
          const hasPickup = pickupProducts.length > 0;

          if (hasPickup) {
            const allPickupRejected = pickupProducts.every(p => p.status === 'rejected');
            if (allPickupRejected) {
              showToast(`Order Rejected`, 'error');
              const firstRejectedReason = pickupProducts.find(p => p.status === 'rejected')?.rejectReason || '';
              return { ...batch, status: 'rejected' as BatchStatus, rejectReason: firstRejectedReason };
            }

            const allPicked = pickupProducts.every(p => p.status === 'picked' || p.status === 'rejected');
            if (allPicked) {
              showToast(`Pickup Done`, 'success');
              return { ...batch, status: 'PICKUP_COMPLETED' as BatchStatus };
            }
          }
        }
      }
      return batch;
    });
  };

  const acceptBatch = (batchId: string) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batchId && b.status === 'NEW_ORDER') {
        showToast(`Accepted`, 'success');
        logActivity(b.id, `${b.pickupPointName} > ${b.dropPointName}`, 'Accepted', b.totalQty, b.totalWeight);
        return { ...b, status: 'ACCEPTED_PICKUP' };
      }
      return b;
    }));
  };

  const rejectBatch = (batchId: string, reason: string) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batchId && b.status !== 'DROP_COMPLETED') {
        showToast(`Rejected`, 'error');
        logActivity(b.id, `${b.pickupPointName} > ${b.dropPointName}`, 'Rejected', b.totalQty, b.totalWeight);
        return { ...b, status: 'rejected', rejectReason: reason };
      }
      return b;
    }));
  };

  const acceptBatchIds = (batchIds: string[]) => {
    setBatches(prev => prev.map(b => {
      if (batchIds.includes(b.id) && b.status === 'NEW_ORDER') {
        logActivity(b.id, `${b.pickupPointName} > ${b.dropPointName}`, 'Accepted', b.totalQty, b.totalWeight);
        return { ...b, status: 'ACCEPTED_PICKUP' };
      }
      return b;
    }));
    showToast(`Accepted`, 'success');
  };

  const captureProductPhoto = (batchId: string, productId: string, context: 'pickup' | 'drop', photoUri: string) => {
    setBatches(prev => {
      const updated = prev.map(batch => {
        if (batch.id === batchId) {
          const updatedProducts = batch.products.map(p => {
            if (p.id === productId) {
              const actionLabel = context === 'pickup' ? 'Picked' : 'Dropped';
              logActivity(batch.id, `${batch.pickupPointName} > ${batch.dropPointName}`, actionLabel as any, p.qty, p.weight);
              showToast(`${p.name} ${context === 'pickup' ? 'picked' : 'delivered'}!`, 'success');
              return { 
                ...p, 
                status: (context === 'pickup' ? 'picked' : 'completed') as any, 
                [context === 'pickup' ? 'pickupPhoto' : 'dropPhoto']: photoUri,
                [context === 'pickup' ? 'pickupPhotoTime' : 'dropPhotoTime']: Date.now()
              };
            }
            return p;
          });
          return { ...batch, products: updatedProducts };
        }
        return batch;
      });
      return evaluateBatchCascade(updated, batchId);
    });
  };

  const rejectProductItem = (batchId: string, productId: string, context: 'pickup' | 'drop', reason: string) => {
    setBatches(prev => {
      const updated = prev.map(batch => {
        if (batch.id === batchId) {
          const updatedProducts = batch.products.map(p => {
            if (p.id === productId) {
              logActivity(batch.id, `${batch.pickupPointName} > ${batch.dropPointName}`, 'Rejected', p.qty, p.weight);
              showToast(`${p.name} rejected.`, 'error');
              return { ...p, status: 'rejected' as any, rejectReason: reason };
            }
            return p;
          });
          return { ...batch, products: updatedProducts };
        }
        return batch;
      });
      return evaluateBatchCascade(updated, batchId);
    });
  };

  return (
    <OrderManagementContext.Provider value={{
      batches, activities, newOrdersCount, acceptedOrdersCount, rejectedOrdersCount, completedOrdersCount,
      acceptBatch, rejectBatch, acceptBatchIds, captureProductPhoto, rejectProductItem, showToast,
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
