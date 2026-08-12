import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform, AppState, AppStateStatus } from 'react-native';
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

export type BatchStatus = 'NEW_ORDER' | 'ACCEPTED_PICKUP' | 'PICKUP_COMPLETED' | 'DROP_COMPLETED' | 'rejected' | 'REJECTED';
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
  isPickupRedirected?: boolean;
  isDropRedirected?: boolean;
  isRedirected?: boolean;
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
  originalRecipient?: {
    name: string;
    shgName?: string;
    phone: string;
    address: string;
    village: string;
    pincode: string;
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
  vehicleDetails?: any;

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
  const [vehicleDetails, setVehicleDetails] = useState<any>(null);

  // Always-fresh ref so async functions avoid stale closures on batches and photos
  const batchesRef = useRef<BatchOrder[]>(batches);
  const capturedPhotosRef = useRef<Record<string, any>>(capturedPhotos);

  useEffect(() => { batchesRef.current = batches; }, [batches]);
  useEffect(() => { capturedPhotosRef.current = capturedPhotos; }, [capturedPhotos]);

  // Fetch logged in transporter vehicle details
  const fetchVehicleDetails = async () => {
    try {
      const cached = await AsyncStorage.getItem('cached-profile-data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.vehicleDetails || parsed.otherDetails?.[0]) {
          setVehicleDetails(parsed.vehicleDetails || parsed.otherDetails?.[0]);
        }
      }
      const response = await api.get('/registration/me');
      if (response.data) {
        const vDetails = response.data.vehicleDetails || response.data.otherDetails?.[0];
        if (vDetails) {
          setVehicleDetails(vDetails);
          await AsyncStorage.setItem('cached-profile-data', JSON.stringify(response.data));
        }
      }
    } catch (err) {
      console.log('Error fetching vehicle details in context:', err);
    }
  };

  useEffect(() => {
    fetchVehicleDetails();
  }, []);

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

  const cleanPersonName = (rawName?: string, defaultFallback: string = 'N/A') => {
    if (!rawName) return defaultFallback;
    return String(rawName).replace(/\s*\([^)]*\)/g, '').trim() || defaultFallback;
  };

  const getCleanNumber = (str?: string | null) => {
    if (!str) return '';
    const match = String(str).match(/\d+$/);
    return match ? match[0] : String(str);
  };

  const refreshBatchesList = async () => {
    try {
      fetchVehicleDetails();
      // Check if user is logged in
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        return;
      }

      // Load completed drop pickups and rejected batches locally
      const storedDropPickups = await AsyncStorage.getItem('completed_drop_pickups');
      const resolvedDropPickups = storedDropPickups ? JSON.parse(storedDropPickups) : [];

      let resolvedRejectedMap: Record<string, string> = {};
      try {
        const storedRejectedBatches = await AsyncStorage.getItem('rejected_batches');
        if (storedRejectedBatches) {
          const parsed = JSON.parse(storedRejectedBatches);
          if (Array.isArray(parsed)) {
            parsed.forEach((b: any) => {
              if (b && b.rejectReason) {
                if (b.id) resolvedRejectedMap[b.id] = b.rejectReason;
                if (b.orderId) resolvedRejectedMap[b.orderId] = b.rejectReason;
                const cleanId = String(b.id || '').replace(/^pickup-/, '').replace(/^drop-/, '');
                if (cleanId) resolvedRejectedMap[cleanId] = b.rejectReason;
              }
            });
          } else if (typeof parsed === 'object') {
            resolvedRejectedMap = parsed;
          }
        }
      } catch (err) { }

      // 1. Fetch live pickups
      const pickupResponse = await api.get('/orders/pickup/assigned');
      const rawPickups = pickupResponse.data || [];

      // 2. Fetch live drops
      const dropResponse = await api.get('/orders/drop/assigned');
      const rawDrops = dropResponse.data || [];

      const mappedPickups = rawPickups.map((o: any) => {
        const pickupShgObj = o.pickupShgDetails || o.pickupShg || o.shg;
        const pickupShgCrp = pickupShgObj?.crpName || pickupShgObj?.personName || pickupShgObj?.name || pickupShgObj?.fullName || 'SHG CRP Lead';
        const pickupShgName = pickupShgObj?.shgName || `${pickupShgObj?.village || o.seller?.village || ''} SHG Center`;
        const pickupShgPhone = pickupShgObj?.crpMobile || pickupShgObj?.phoneNumber || pickupShgObj?.mobileNumber || pickupShgObj?.phone || '';
        const pickupShgVillage = pickupShgObj?.village || pickupShgObj?.address?.village || o.seller?.village || 'N/A';
        const pickupShgPincode = pickupShgObj?.pincode || pickupShgObj?.address?.pincode || o.seller?.pincode || 'N/A';
        const pickupShgTaluka = pickupShgObj?.taluka || pickupShgObj?.address?.taluka || o.seller?.taluka || 'N/A';
        const pickupShgDistrict = pickupShgObj?.district || pickupShgObj?.address?.district || o.seller?.district || 'N/A';
        const pickupShgAddress = pickupShgObj?.fullAddress || [
          pickupShgObj?.address?.deliveryAddress || pickupShgObj?.address?.landmark || pickupShgObj?.address?.houseNo || pickupShgObj?.address?.addressLine1,
          pickupShgObj?.address?.village || pickupShgVillage,
          pickupShgObj?.address?.taluka || pickupShgTaluka,
          pickupShgObj?.address?.district || pickupShgDistrict,
          pickupShgObj?.address?.pincode || pickupShgPincode
        ].filter(Boolean).join(', ') || o.seller?.fullAddress || 'N/A';

        const pickupPointVillage = pickupShgVillage !== 'N/A' ? pickupShgVillage : (o.seller?.village || pickupShgObj?.village || 'Local Village');

        return {
          id: `pickup-${o.id}`,
          displayId: o.masterOrder?.orderNumber || `ORD-PICK-${o.masterOrderId || o.id}`,
          areaName: pickupShgVillage !== 'N/A' ? pickupShgVillage : (o.seller?.taluka || 'N/A'),
          flowType: 'shg_to_gmu' as FlowType,
          shgName: pickupShgName,
          pickupPointName: pickupPointVillage,
          dropPointName: 'Gadhinglaj Hub',
          pickupCount: 1,
          dropCount: 0,
          totalQty: o.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
          totalWeight: `${o.items?.reduce((sum: number, item: any) => sum + ((item.product?.weight || 0) * (item.quantity || 1)), 0) || 5} kg`,
          status: (() => {
            const mStatus = (o.mainStatus || '').toUpperCase();
            const ptStatus = (o.pickupTransporterStatus || '').toUpperCase();

            if (mStatus === 'REJECTED' || ptStatus === 'REJECTED' || mStatus === 'CANCELLED') {
              return 'REJECTED' as const;
            }
            if (['DELIVERED_TO_HUB', 'DROPPED', 'COMPLETED'].includes(ptStatus) || mStatus === 'DELIVERED_TO_HUB' || mStatus === 'STORED') {
              return 'DROP_COMPLETED' as const;
            }
            if (['PICKED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB'].includes(ptStatus) || ['IN_TRANSIT_TO_HUB', 'PARCEL_PICKED'].includes(mStatus)) {
              return 'PICKUP_COMPLETED' as const;
            }
            if (['ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED'].includes(ptStatus) || mStatus === 'TRANSPORTER_ACCEPTED' || mStatus === 'PICKUP_TRANSPORTER_ACCEPTED') {
              return 'ACCEPTED_PICKUP' as const;
            }
            return 'NEW_ORDER' as const;
          })(),
          rejectReason: (() => {
            const bId = `pickup-${o.id}`;
            const cleanNum = getCleanNumber(o.id || o.orderId);
            const rawId = String(o.id || '');
            const localReason = resolvedRejectedMap[bId] ||
              resolvedRejectedMap[rawId] ||
              resolvedRejectedMap[cleanNum] ||
              resolvedRejectedMap[o.orderId];
            if (localReason) return cleanRejectReason(localReason);
            const rawReason = o.tracking?.[0]?.remarks || o.remarks;
            let reasonVal = rawReason;
            if (rawReason && rawReason.toLowerCase().includes('synchronized') && o.masterOrder?.dropOrders?.[0]) {
              const dropReason = o.masterOrder.dropOrders[0].tracking?.[0]?.remarks;
              if (dropReason) reasonVal = dropReason;
            }
            const finalReason = reasonVal || (o.mainStatus === 'REJECTED' || o.status === 'REJECTED' ? 'Vehicle Not Available' : undefined);
            return finalReason ? cleanRejectReason(finalReason) : undefined;
          })(),
          masterOrderId: o.masterOrderId,
          handoverCode: o.handoverCode,
          isRTO: o.isRTO || false,
          shgContact: {
            name: cleanPersonName(pickupShgCrp, 'SHG CRP Lead'),
            crpName: cleanPersonName(pickupShgCrp, 'SHG CRP Lead'),
            shgName: pickupShgName,
            phone: pickupShgPhone,
            address: pickupShgAddress,
            village: pickupShgVillage,
            pincode: pickupShgPincode,
            taluka: pickupShgTaluka,
            district: pickupShgDistrict,
          },
          products: (o.items && o.items.length > 0) ? o.items.map((item: any) => {
            const pId = String(item.id || item.parcelId || Math.random());
            const photoKey = `${o.masterOrderId}-${item.product?.name || item.productName || 'General Item'}`;
            const cached = capturedPhotosRef.current[photoKey] || capturedPhotosRef.current[pId] || {};
            return {
              id: pId,
              name: item.product?.name || item.productName || 'General Item',
              qty: item.quantity || 1,
              weight: `${item.product?.weight || item.weight || 1} kg`,
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
          }) : (o.parcels && o.parcels.length > 0) ? o.parcels.map((p: any) => ({
            id: String(p.parcelId || p.id || Math.random()),
            name: p.productName || p.product?.name || 'General Item',
            qty: p.quantity || 1,
            weight: `${p.weight || p.weightKg || 1} kg`,
            legType: 'pickup' as const,
            status: (o.pickupTransporterStatus === 'PICKED' || o.pickupTransporterStatus === 'IN_TRANSIT_TO_HUB' || o.pickupTransporterStatus === 'COMPLETED' || o.pickupTransporterStatus === 'DROPPED') ? 'picked' : 'pending',
            verificationCode: p.verificationToken || p.verificationCode || '',
            verificationStatus: p.parcelStatus || 'PENDING',
            productId: p.productId,
          })) : [{
            id: `p-${o.id}`,
            name: 'General Parcel Package',
            qty: o.totalQty || 1,
            weight: `${o.totalWeight || 5} kg`,
            legType: 'pickup' as const,
            status: (o.pickupTransporterStatus === 'PICKED' || o.pickupTransporterStatus === 'IN_TRANSIT_TO_HUB' || o.pickupTransporterStatus === 'COMPLETED' || o.pickupTransporterStatus === 'DROPPED') ? 'picked' : 'pending',
            verificationCode: '',
            verificationStatus: 'PENDING',
          }],
          timestamp: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: o.createdAt,
        };
      });

      const mappedDrops = rawDrops.map((o: any) => {
        const rawId = String(o.orderId || o.id || '105');
        const cleanNum = rawId.replace(/^(ORD-)+(2026-)?/, '');
        const bId = `drop-${o.id}`;
        const isPickupFinished = resolvedDropPickups.includes(bId);

        const dropShgObj = o.dropShgDetails || o.dropShg || o.shg;
        const dropShgCrp = dropShgObj?.crpName || dropShgObj?.personName || dropShgObj?.name || dropShgObj?.fullName || 'Drop SHG Lead';
        const dropShgName = dropShgObj?.shgName || `${dropShgObj?.village || o.buyer?.village || ''} Drop SHG`;
        const dropShgMobile = dropShgObj?.crpMobile || dropShgObj?.phoneNumber || dropShgObj?.mobileNumber || dropShgObj?.phone || 'N/A';
        const dropShgVillage = dropShgObj?.village || dropShgObj?.address?.village || o.buyer?.village || 'N/A';
        const dropShgPincode = dropShgObj?.pincode || dropShgObj?.address?.pincode || o.buyer?.pincode || 'N/A';
        const dropShgTaluka = dropShgObj?.taluka || dropShgObj?.address?.taluka || o.buyer?.taluka || 'N/A';
        const dropShgDistrict = dropShgObj?.district || dropShgObj?.address?.district || o.buyer?.district || 'N/A';
        const dropShgAddress = dropShgObj?.fullAddress || [
          dropShgObj?.address?.deliveryAddress || dropShgObj?.address?.landmark || dropShgObj?.address?.houseNo || dropShgObj?.address?.addressLine1,
          dropShgObj?.address?.village || dropShgVillage,
          dropShgObj?.address?.taluka || dropShgTaluka,
          dropShgObj?.address?.district || dropShgDistrict,
          dropShgObj?.address?.pincode || dropShgPincode
        ].filter(Boolean).join(', ') || o.buyer?.fullAddress || 'N/A';

        const dropPointVillage = dropShgVillage !== 'N/A' ? dropShgVillage : (o.buyer?.village || dropShgObj?.village || 'Local Village');

        return {
          id: bId,
          displayId: `ORD-2026-${cleanNum}`,
          areaName: dropShgVillage,
          flowType: 'gmu_to_shg' as FlowType,
          shgName: dropShgName,
          pickupPointName: 'Gadhinglaj Hub',
          dropPointName: dropPointVillage,
          pickupCount: 0,
          dropCount: 1,
          totalQty: o.totalQty || o.parcels?.length || o.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1,
          totalWeight: `${o.totalWeight || o.parcels?.reduce((sum: number, p: any) => sum + Number(p.weight || 2.5), 0) || 5} kg`,
          status: (() => {
            const mStatus = (o.mainStatus || o.status || '').toUpperCase();
            const dtStatus = (o.dropTransporterStatus || '').toUpperCase();
            const dShgStatus = (o.dropShgStatus || '').toUpperCase();

            // 0. Rejected status
            if (mStatus === 'REJECTED' || dtStatus === 'REJECTED' || dShgStatus === 'REJECTED') {
              return 'REJECTED' as const;
            }
            // 1. Move to COMPLETED SECTION only when Drop SHG confirms receipt from Transporter (or order is DELIVERED/COMPLETED)
            if (dtStatus === 'COMPLETED' || dtStatus === 'DROPPED' || dShgStatus === 'DELIVERED' || dShgStatus === 'DROPPED' || mStatus === 'PARCEL_AT_DROP_SHG' || mStatus === 'AT_BUYER_SHG' || mStatus === 'DELIVERED' || mStatus === 'COMPLETED') {
              return 'DROP_COMPLETED' as const;
            }
            // 2. Move to DROP SECTION when Transporter confirms pickup from GMU Hub (In-transit to Drop SHG)
            if (dtStatus === 'PICKED' || dtStatus === 'IN_TRANSIT_TO_DROP_SHG' || ['DISPATCHED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG'].includes(mStatus) || isPickupFinished) {
              return 'PICKUP_COMPLETED' as const;
            }
            // 3. Move to ACCEPTED section when Transporter accepts drop assignment from GMU Hub
            if (['DROP_TRANSPORTER_ACCEPTED', 'TRANSPORTER_ACCEPTED', 'ACCEPTED'].includes(dtStatus) || mStatus === 'DROP_TRANSPORTER_ACCEPTED') {
              return 'ACCEPTED_PICKUP' as const;
            }
            return 'NEW_ORDER' as const;
          })(),
          rejectReason: (() => {
            const bId = `drop-${o.id}`;
            const cleanNum = getCleanNumber(o.id || o.orderId);
            const rawId = String(o.id || '');
            const localReason = resolvedRejectedMap[bId] ||
              resolvedRejectedMap[rawId] ||
              resolvedRejectedMap[cleanNum] ||
              resolvedRejectedMap[o.orderId];
            if (localReason) return cleanRejectReason(localReason);
            const rawReason = o.tracking?.[0]?.remarks || o.remarks;
            let reasonVal = rawReason;
            if (rawReason && rawReason.toLowerCase().includes('synchronized') && o.masterOrder?.pickupOrders?.[0]) {
              const pickupReason = o.masterOrder.pickupOrders[0].tracking?.[0]?.remarks;
              if (pickupReason) reasonVal = pickupReason;
            }
            const finalReason = reasonVal || (o.mainStatus === 'REJECTED' || o.status === 'REJECTED' ? 'Vehicle Not Available' : undefined);
            return finalReason ? cleanRejectReason(finalReason) : undefined;
          })(),
          masterOrderId: o.masterOrderId,
          dropOrderId: o.id, // Track the actual DB drop order ID
          transporterId: o.transporterId,
          handoverCode: o.handoverCode,
          isRTO: o.isRTO || o.returnType === 'TRANSPORTER_RETURN' || Boolean(resolvedRejectedMap[bId] || resolvedRejectedMap[String(o.id)] || resolvedRejectedMap[cleanNum]),
          shgContact: {
            name: cleanPersonName(dropShgCrp, 'Drop SHG Lead'),
            crpName: cleanPersonName(dropShgCrp, 'Drop SHG Lead'),
            shgName: dropShgName,
            phone: dropShgMobile,
            address: dropShgAddress,
            village: dropShgVillage,
            pincode: dropShgPincode,
            taluka: dropShgTaluka,
            district: dropShgDistrict,
          },
          originalRecipient: {
            name: cleanPersonName(dropShgName, 'Drop SHG Member'),
            shgName: o.dropShgDetails?.shgName || 'Drop SHG',
            phone: dropShgMobile,
            address: dropShgAddress,
            village: dropShgVillage,
            pincode: dropShgPincode,
          },
          products: (o.parcels && o.parcels.length > 0) ? o.parcels.map((p: any) => ({
            id: String(p.parcelId || p.id || Math.random()),
            name: p.productName || p.product?.name || 'Agricultural Goods',
            qty: p.quantity || 1,
            weight: `${p.weight || p.weightKg || 2.5} kg`,
            legType: 'drop' as const,
            status: (o.status === 'COMPLETED' || o.status === 'RETURNED') ? 'completed' : 'pending',
            verificationCode: p.verificationToken || p.verificationCode || '',
            verificationStatus: p.parcelStatus || 'PENDING',
            productId: p.productId,
          })) : (o.items && o.items.length > 0) ? o.items.map((item: any) => ({
            id: String(item.id || item.parcelId || Math.random()),
            name: item.product?.name || item.productName || 'Agricultural Goods',
            qty: item.quantity || 1,
            weight: `${item.product?.weight || item.weight || 2.5} kg`,
            legType: 'drop' as const,
            status: (o.status === 'COMPLETED' || o.status === 'RETURNED') ? 'completed' : 'pending',
            verificationCode: item.verificationCode || '',
            verificationStatus: item.verificationStatus || 'PENDING',
            productId: item.productId,
          })) : [{
            id: `p-${o.id}`,
            name: 'Agricultural Goods Package',
            qty: o.totalQty || 1,
            weight: `${o.totalWeight || 2.5} kg`,
            legType: 'drop' as const,
            status: (o.status === 'COMPLETED' || o.status === 'RETURNED') ? 'completed' : 'pending',
            verificationCode: '',
            verificationStatus: 'PENDING',
          }],
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

      // Deduplicate: If an order has both a pickup card and a drop card, keep the drop card for Phase 2

      const activeDropBaseNumbers = new Set(
        mappedDrops
          .filter((d: any) => d.status === 'ACCEPTED_PICKUP' || d.status === 'PICKUP_COMPLETED')
          .map((d: any) => getCleanNumber(d.id || d.displayId || d.uuid || d.dropOrderId))
      );
      const filteredPickups = mappedPickups.filter((p: any) => {
        if (p.status === 'DROP_COMPLETED') return true;
        const baseNum = getCleanNumber(p.id || p.displayId || p.uuid);
        if (baseNum && activeDropBaseNumbers.has(baseNum)) return false;
        return true;
      });

      const safePickups = Array.isArray(filteredPickups) ? filteredPickups : [];
      const safeDrops = Array.isArray(mappedDrops) ? mappedDrops : [];
      const freshLiveBatches = [...safePickups, ...safeDrops];
      const liveIds = new Set(freshLiveBatches.map(b => b.id));

      // Server-confirmed REJECTED batches move into the rejected list.
      const serverRejectedOrders = freshLiveBatches.filter(b => b.status === 'REJECTED');
      setRejectedBatches(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const existingIds = new Set(safePrev.map(b => b.id));
        const newRejected = serverRejectedOrders.filter(b => !existingIds.has(b.id));
        const combined = [...safePrev, ...newRejected];
        const cleaned = combined.filter(b => liveIds.has(b.id));
        if (cleaned.length !== safePrev.length || newRejected.length > 0) {
          AsyncStorage.setItem('rejected_batches', JSON.stringify(cleaned)).catch(() => { });
        }
        return cleaned;
      });

      // Server-confirmed DROP_COMPLETED batches move into the completed list.
      const serverCompletedDrops = freshLiveBatches.filter(b => b.status === 'DROP_COMPLETED');
      if (serverCompletedDrops.length > 0) {
        setCompletedBatches(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const existingIds = new Set(safePrev.map(b => b.id));
          const newCompleted = serverCompletedDrops.filter(b => !existingIds.has(b.id));
          if (newCompleted.length === 0) return safePrev;
          const updated = [...safePrev, ...newCompleted];
          AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(() => { });
          return updated;
        });
      }

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
          AsyncStorage.setItem('captured_photos', JSON.stringify(cleaned)).catch(() => { });
        }
        return cleaned;
      });

      // Exclude DROP_COMPLETED and REJECTED from the live active batches (they live in completedBatches & rejectedBatches)
      setBatches(freshLiveBatches.filter(b => b.status !== 'DROP_COMPLETED' && b.status !== 'REJECTED'));
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.warn('[Session Expiry] Transporter session token is invalid or expired. Redirecting to login...');
      } else {
        console.warn('[Transporter Batches] Note on fetching live transporter batches:', error?.message || error);
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

  // Real-time AppState change listener (refreshes immediately when user switches back to transporter app)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && lastTokenRef.current) {
        refreshBatchesList().catch(() => { });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshBatchesList]);

  // Real-time Background Polling Heartbeat (every 4 seconds when app is active and user is logged in)
  useEffect(() => {
    const poller = setInterval(() => {
      if (AppState.currentState === 'active' && lastTokenRef.current) {
        refreshBatchesList().catch(() => { });
      }
    }, 4000);

    return () => clearInterval(poller);
  }, [refreshBatchesList]);

  const safeBatches = Array.isArray(batches) ? batches : [];
  const safeRejected = Array.isArray(rejectedBatches) ? rejectedBatches : [];
  const safeCompleted = Array.isArray(completedBatches) ? completedBatches : [];

  const activeBatches = safeBatches.filter(
    b => b.status !== 'REJECTED' && b.status !== 'DROP_COMPLETED' && !safeCompleted.some(cb => cb.id === b.id)
  );
  const allBatches = [...activeBatches, ...safeRejected, ...safeCompleted];

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
        } catch (e) { }
        list.push({ entry: act, timeMs });
      }
    });

    return list
      .sort((a, b) => b.timeMs - a.timeMs)
      .map(item => item.entry);
  }, [allBatches, activitiesState]);

  const newOrdersCount = activeBatches.filter(b => b.status === 'NEW_ORDER').length;
  const acceptedOrdersCount = activeBatches.filter(b => b.status === 'ACCEPTED_PICKUP' || b.status === 'PICKUP_COMPLETED').length;
  const rejectedOrdersCount = safeRejected.length;
  const completedOrdersCount = useMemo(() => {
    const journeyMap: Record<string, boolean> = {};
    allBatches.forEach((b) => {
      if (b.status === 'DROP_COMPLETED') {
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
      AsyncStorage.setItem('transporter_activities', JSON.stringify(updated)).catch(() => { });
      return updated;
    });
  };

  const pruneStaleBatch = (batchId: string) => {
    setRejectedBatches(prev => {
      const updated = prev.filter(b => b.id !== batchId);
      AsyncStorage.setItem('rejected_batches', JSON.stringify(updated)).catch(() => { });
      return updated;
    });
    setCompletedBatches(prev => {
      const updated = prev.filter(b => b.id !== batchId);
      AsyncStorage.setItem('completed_batches', JSON.stringify(updated)).catch(() => { });
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
      const targetBase = getCleanNumber(batchId);
      setBatches(prev =>
        prev.map(b =>
          (b.id === batchId || (targetBase && getCleanNumber(b.id) === targetBase))
            ? { ...b, status: optimisticStatus as BatchOrder['status'] }
            : b
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
      // Optimistically move batch to rejectedBatches and remove from active batches (< 1ms)
      const batchToReject = batchesRef.current.find(b => b.id === batchId);
      if (batchToReject) {
        const rejectedObj = {
          ...batchToReject,
          status: 'REJECTED' as const,
          rejectReason: reason || 'Rejected by Transporter'
        };
        setRejectedBatches(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          if (safePrev.some(b => b.id === batchId)) return safePrev;
          const updated = [...safePrev, rejectedObj];
          AsyncStorage.setItem('rejected_batches', JSON.stringify(updated)).catch(() => { });
          return updated;
        });
        setBatches(prev => prev.filter(b => b.id !== batchId));
      }

      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const rawId = batchId.replace('pickup-', '').replace('drop-', '');

      await api.post(`/orders/${type}/${rawId}/reject`, { remarks: reason });
      showToast(`Order Rejected`, 'error');
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
        AsyncStorage.setItem('captured_photos', JSON.stringify(updated)).catch(() => { });
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
            const safePrev = Array.isArray(prev) ? prev : [];
            if (safePrev.some(b => b.id === batchId)) return safePrev;
            const updated = [...safePrev, { ...batchToComplete, status: 'DROP_COMPLETED' as const }];
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
            const safePrev = Array.isArray(prev) ? prev : [];
            if (safePrev.some(b => b.id === batchId)) return safePrev;
            const updated = [...safePrev, { ...batchToComplete, status: 'DROP_COMPLETED' as const }];
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
          const safePrev = Array.isArray(prev) ? prev : [];
          if (safePrev.some(b => b.id === batchId)) return safePrev;
          const updated = [...safePrev, { ...batchToComplete, status: 'DROP_COMPLETED' as const }];
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
    const rawId = batchId.replace(/^pickup-/, '').replace(/^drop-/, '');
    const targetBatch = batches.find(b => b.id === batchId || b.displayId === batchId || b.id.includes(rawId) || (b.displayId && b.displayId.includes(rawId)));
    const cleanNum = getCleanNumber(rawId);

    // Persist local rejection state into AsyncStorage under all ID formats so refreshes never revert it
    try {
      const storedRejected = await AsyncStorage.getItem('rejected_batches');
      const rejectedMap = storedRejected ? JSON.parse(storedRejected) : {};
      rejectedMap[batchId] = reason;
      if (rawId) rejectedMap[rawId] = reason;
      if (cleanNum) rejectedMap[cleanNum] = reason;
      if (targetBatch?.id) rejectedMap[targetBatch.id] = reason;
      if (targetBatch?.displayId) rejectedMap[targetBatch.displayId] = reason;
      if (targetBatch?.masterOrderId) rejectedMap[String(targetBatch.masterOrderId)] = reason;
      if (targetBatch?.dropOrderId) rejectedMap[String(targetBatch.dropOrderId)] = reason;
      await AsyncStorage.setItem('rejected_batches', JSON.stringify(rejectedMap));
    } catch (err) {
      console.warn('Failed to save rejected batch locally:', err);
    }

    // 1. Optimistic Update (Immediate UI move to Rejected Card with RTO info!)
    setBatches((prev: any[]) => prev.map((b: any) => {
      const matchById = b.id === batchId || b.displayId === batchId;
      const matchByRaw = batchId.includes(b.id) || b.id.includes(batchId) || (rawId && (b.id.includes(rawId) || (b.displayId && b.displayId.includes(rawId))));
      if (matchById || matchByRaw) {
        return {
          ...b,
          status: 'rejected' as const,
          rejectReason: reason,
          isRTO: true,
          originalRecipient: b.originalRecipient || b.shgContact,
          dropPointName: 'Gadhinglaj Hub',
        };
      }
      return b;
    }));

    try {
      const targetBatch = batches.find(b => b.id === batchId || b.displayId === batchId);
      const type = context || (batchId.startsWith('pickup-') ? 'pickup' : (batchId.startsWith('drop-') ? 'drop' : 'pickup'));
      const dbOrderId = targetBatch?.dropOrderId || targetBatch?.masterOrderId || rawId;

      await api.post(`/orders/${type}/${dbOrderId}/reject`, { remarks: reason });
      showToast(`Order Rejected`, 'error');
    } catch (error: any) {
      console.error('Error rejecting product item:', error);
      showToast(`Order Rejected`, 'info');
    } finally {
      await refreshBatchesList();
    }
  };

  const rerouteBatchToHub = async (batchId: string, productId: string, reason: string) => {
    try {
      const rawId = batchId.replace(/^pickup-/, '').replace(/^drop-/, '');
      const targetBatch = batchesRef.current.find(b => b.id === batchId || b.displayId === batchId || b.id.includes(rawId) || (b.displayId && b.displayId.includes(rawId)));
      const finalReason = reason || 'Recipient Unavailable - Return to Hub';

      // Construct RTO object with updated screen return destination address and preserved original recipient address
      const returnPoint = targetBatch?.flowType === 'gmu_to_shg' ? 'Gadhinglaj Hub' : (targetBatch?.pickupPointName || 'Gadhinglaj Hub');
      const rejectedBatchObj: BatchOrder = {
        ...targetBatch,
        id: targetBatch?.id || batchId,
        areaName: targetBatch?.areaName || 'Gadhinglaj Hub',
        flowType: targetBatch?.flowType || 'gmu_to_shg',
        shgName: targetBatch?.shgName || 'Gadhinglaj Hub',
        pickupPointName: targetBatch?.pickupPointName || 'Gadhinglaj Hub',
        dropPointName: returnPoint,
        pickupCount: targetBatch?.pickupCount || 0,
        dropCount: targetBatch?.dropCount || 1,
        totalQty: targetBatch?.totalQty || 1,
        totalWeight: targetBatch?.totalWeight || '5 kg',
        status: 'REJECTED' as const,
        rejectReason: finalReason,
        isRTO: true,
        originalRecipient: targetBatch?.originalRecipient || targetBatch?.shgContact,
        shgContact: targetBatch?.flowType === 'gmu_to_shg' ? HUB_CONTACT : (targetBatch?.shgContact || HUB_CONTACT),
        products: targetBatch?.products || [],
      };

      // Save into rejectedBatches state & AsyncStorage array
      setRejectedBatches(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const filtered = safePrev.filter(b => b.id !== batchId && b.id !== targetBatch?.id);
        const updated = [...filtered, rejectedBatchObj];
        AsyncStorage.setItem('rejected_batches', JSON.stringify(updated)).catch(() => { });
        return updated;
      });

      // Remove from active batches (< 1ms instant removal)
      setBatches(prev => prev.filter(b => b.id !== batchId && b.id !== targetBatch?.id));

      const type = batchId.startsWith('pickup-') ? 'pickup' : 'drop';
      const dbOrderId = targetBatch?.dropOrderId || targetBatch?.masterOrderId || rawId;

      await api.post(`/orders/${type}/${dbOrderId}/reject`, { remarks: finalReason });
      showToast('Parcel rerouted to Hub for return.', 'info');
      await refreshBatchesList();
    } catch (error: any) {
      console.error('Error rerouting batch to hub:', error);
      showToast('Parcel rerouted to Hub for return.', 'info');
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
      batches: allBatches, activities, newOrdersCount, acceptedOrdersCount, rejectedOrdersCount, completedOrdersCount, vehicleDetails,
      acceptBatch, rejectBatch, acceptBatchIds, captureProductPhoto, rejectProductItem, rerouteBatchToHub, showToast, refreshBatchesList,
      finalizePickup, finalizeDrop, generateDropHandoverCode,
      pendingOrdersCount: acceptedOrdersCount, gmuSummary: {}, gmuProducts: [], routes: [], shgProducts: {}, areaAssignments: [],
      acceptShg: () => { }, completeProduct: () => { }, rejectProduct: () => { }, acceptAreaAssignment: () => { }, rejectAreaAssignment: () => { }, acceptAllRouteShgs: () => { }
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
