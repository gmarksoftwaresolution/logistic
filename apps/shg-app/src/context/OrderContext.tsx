import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';
import { STORAGE_KEYS } from '../utils/storage';

export interface VehicleInfo {
  id: string | number;
  name: string;
  capacity: number;
  description: string;
  icon: string;
}

export interface VehicleSuggestion {
  recommendedVehicle: VehicleInfo;
  suitableVehicles: VehicleInfo[];
}

export interface Order {
  id: string;
  orderId: string;
  parcelName: string;
  category: string;
  mobile: string;
  amount: string;
  payment: string;
  address: string;
  sourceAddress?: string;
  deliveryDay: string;
  status: string;
  image?: string;
  transporterName?: string;
  transporterMobile?: string;
  transporterId?: string;
  transporterAddress?: string;
  transporterRoute?: string;
  pickupTime?: string;
  vehicleNumber?: string;
  currentHolder?: string;
  remainingQty?: number;
  weight?: string | number;
  time?: string;
  date?: string;
  distance?: string | number;
  categoryBg?: string;
  categoryText?: string;
  scanned?: boolean;
  acceptedAt?: string;
  completedAt?: string;
  legType?: 'pickup' | 'drop';
  phase?: 'PICKUP' | 'DROP';

  fromLocation?: string;
  toLocation?: string;
  rescheduledTime?: string;
  rescheduledDate?: string;
  isReturn?: boolean;
  buyerName?: string;
  sellerName?: string;
  products?: any[];
  handoverCode?: string;
  parcelWeight?: number;
  recommendedVehicle?: VehicleInfo | null;
  recommendedCapacity?: number | null;
  otherSuitableVehicles?: VehicleInfo[];
  barcode?: string;
  isPickupRedirected?: boolean;
  isDropRedirected?: boolean;
  isRedirected?: boolean;
  pickupShgStatus?: string;
  dropShgStatus?: string;
  pickupTransporterStatus?: string;
  mainStatus?: string;
  uuid?: string;
}

interface OrderContextType {
  incomingOrders: Order[];
  acceptedOrders: Order[];
  deliveredOrders: Order[];
  pendingOrders: Order[];
  returnedOrders: Order[];
  orders: Order[];
  highlightedOrders: Record<string, 'new' | 'updated'>;
  getStockItems: () => Order[];
  acceptOrder: (order: Order, selectedVehicle?: VehicleInfo) => Promise<void>;
  redirectOrder: (order: Order, reason?: string) => Promise<void>;
  acceptOrders: (orders: Order[]) => Promise<void>;
  acceptAllOrders: () => Promise<void>;
  receiveOrder: (order: Order, code?: string, activeType?: string) => Promise<void>;
  notReceiveOrder: (order: Order) => void;
  deliverOrder: (order: Order, code?: string) => Promise<void>;
  refreshOrdersList: () => Promise<void>;
  isOrdersLoading: boolean;
  incomingReturnOrders: Order[];
  redirectedOrders: Order[];
  acceptReturnOrders: (orderIds: string[]) => void;
  rescheduleOrder: (orderId: string, date: string, time: string, reason: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);



const mapDbOrderToUi = (dbOrder: any, type: 'pickup' | 'drop', isReturnOrder?: boolean): Order => {
  const items = dbOrder.items || [];
  const parcelName = items.map((i: any) => i.product?.name).filter(Boolean).join(', ') || '';
  const category = items[0]?.product?.category || '';

  const masterId = dbOrder.masterOrderId || dbOrder.id;

  const orderItems = items;

  const dbQty = orderItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
  const qty = dbQty > 0 ? dbQty : 1;



  const sellerAddressArr = [
    dbOrder.seller?.address?.addressLine1,
    dbOrder.seller?.address?.addressLine2,
    dbOrder.seller?.address?.village,
    dbOrder.seller?.address?.district,
    dbOrder.seller?.addressLine1,
    dbOrder.seller?.addressLine2,
    dbOrder.seller?.village,
    dbOrder.seller?.district,
    dbOrder.masterOrder?.items?.[0]?.seller?.address?.addressLine1,
    dbOrder.masterOrder?.items?.[0]?.seller?.address?.village,
    dbOrder.masterOrder?.items?.[0]?.seller?.addressLine1,
    dbOrder.masterOrder?.items?.[0]?.seller?.village
  ].filter(Boolean);
  const actualPickupAddress = sellerAddressArr.length > 0 ? sellerAddressArr[0] : '';

  const buyerAddressArr = [
    dbOrder.buyer?.address?.addressLine1,
    dbOrder.buyer?.address?.addressLine2,
    dbOrder.buyer?.address?.village,
    dbOrder.buyer?.address?.district,
    dbOrder.buyer?.addressLine1,
    dbOrder.buyer?.addressLine2,
    dbOrder.buyer?.village,
    dbOrder.buyer?.district,
    dbOrder.masterOrder?.buyer?.address?.addressLine1,
    dbOrder.masterOrder?.buyer?.address?.village,
    dbOrder.masterOrder?.buyer?.addressLine1,
    dbOrder.masterOrder?.buyer?.village
  ].filter(Boolean);

  let actualDropAddress = dbOrder.deliveryAddress;
  if (!actualDropAddress || actualDropAddress.includes('Test')) {
    actualDropAddress = buyerAddressArr.length > 0 ? buyerAddressArr[0] : (dbOrder.deliveryAddress || '');
  }

  const dateObj = dbOrder.scheduledDateTime ? new Date(dbOrder.scheduledDateTime) : (dbOrder.createdAt ? new Date(dbOrder.createdAt) : new Date());
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isGeneratedReturn = dbOrder.masterOrder?.orderNumber?.startsWith('RET-') || String(masterId).startsWith('RET-') || String(dbOrder.dropOrderNumber).startsWith('RET-');
  const isGeneratedNewOrder = dbOrder.masterOrder?.orderNumber?.startsWith('ORD-1769749895005') || String(masterId).startsWith('ORD-1769749895005') || String(dbOrder.pickupOrderNumber).startsWith('ORD-1769749895005') || String(dbOrder.dropOrderNumber).startsWith('ORD-1769749895005');

  const finalAddress = isGeneratedReturn ? dbOrder.deliveryAddress : (isGeneratedNewOrder ? (type === 'pickup' ? dbOrder.seller?.fullName : dbOrder.deliveryAddress) : (type === 'pickup' ? actualPickupAddress : actualDropAddress));
  const finalSourceAddress = isGeneratedReturn ? dbOrder.deliveryAddress : (isGeneratedNewOrder ? (type === 'pickup' ? dbOrder.seller?.fullName : actualPickupAddress) : actualPickupAddress);

  let isReturnFlag = isReturnOrder !== undefined ? isReturnOrder : !!dbOrder.status?.startsWith('RETURN');
  if (isGeneratedNewOrder) isReturnFlag = false;
  if (isGeneratedReturn) isReturnFlag = true;

  return {
    id: `${type}-${dbOrder.id}`,
    orderId: dbOrder.orderId
      ? (dbOrder.orderId.startsWith('ORD-') ? dbOrder.orderId : `ORD-${dbOrder.orderId}`)
      : (dbOrder.orderNumber ? (dbOrder.orderNumber.startsWith('ORD-') ? dbOrder.orderNumber : `ORD-${dbOrder.orderNumber}`) : (dbOrder.masterOrder?.orderNumber || (String(masterId).length > 20 ? `ORD-${masterId.slice(0, 8)}` : `ORD-${masterId}`))),
    parcelName,
    parcelWeight: dbOrder.parcelWeight,
    recommendedVehicle: dbOrder.recommendedVehicle,
    recommendedCapacity: dbOrder.recommendedCapacity,
    otherSuitableVehicles: dbOrder.otherSuitableVehicles || [],
    category,
    mobile: type === 'pickup' ? (dbOrder.seller?.phoneNumber || dbOrder.seller?.mobileNumber || '') : (dbOrder.buyer?.phoneNumber || dbOrder.buyer?.mobileNumber || dbOrder.masterOrder?.buyer?.phoneNumber || dbOrder.masterOrder?.buyer?.mobileNumber || ''),
    amount: String(orderItems.reduce((sum: number, i: any) => sum + (i.quantity * (i.product?.price || 0)), 0)),
    payment: dbOrder.masterOrder?.paymentMethod || 'Online',
    address: finalAddress,
    sourceAddress: finalSourceAddress,
    deliveryDay: dateStr,
    date: dateStr,
    status: (() => {
      const mStatus = dbOrder.mainStatus || dbOrder.masterOrder?.status || '';
      const pStatus = dbOrder.status || dbOrder.mainStatus || '';
      const shgStatus = dbOrder.pickupShgStatus || dbOrder.pickup_shg_status || '';

      if (type === 'pickup') {
        const isPickupCompleted = [
          'IN_TRANSIT_TO_HUB', 'RETURN_IN_TRANSIT_TO_HUB',
          'DELIVERED_TO_HUB', 'RETURN_DELIVERED_TO_HUB',
          'PARCEL_AT_TRANSPORTER', 'RETURN_PARCEL_AT_TRANSPORTER',
          'PARCEL_AT_GMU', 'RETURN_PARCEL_AT_GMU',
          'PARCEL_AT_HUB', 'RETURN_PARCEL_AT_HUB',
          'HUB_RECEIVED', 'STORED', 'DISPATCHED',
          'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED',
          'DELIVERED', 'COMPLETED',
          'PARCEL_WITH_DROP_SHG', 'PARCEL_AT_DROP_SHG',
          'IN_TRANSIT_TO_BUYER', 'AT_BUYER_SHG', 'DELIVERED_TO_BUYER',
          'PARCEL_PICKED'
        ].includes(mStatus) || pStatus === 'COMPLETED' || shgStatus === 'DROPPED' || shgStatus === 'COMPLETED';

        if (isPickupCompleted) {
          return 'COMPLETED';
        }

        const isPickedUpAtShg = [
          'PARCEL_AT_SHG', 'RETURN_PARCEL_AT_SHG', 'PICKED_UP',
          'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED'
        ].includes(mStatus) || pStatus === 'PICKED_UP' || pStatus === 'PARCEL_AT_SHG' || pStatus === 'TRANSPORTER_ACCEPTED' || pStatus === 'PICKUP_TRANSPORTER_ACCEPTED' || shgStatus === 'PICKED';

        if (isPickedUpAtShg) {
          return 'PickedUp';
        }

        if (pStatus === 'REJECTED') {
          return 'REJECTED';
        }

        return 'Accepted';
      } else {
        // Drop leg mapping for SHG (Phase 2)
        if (pStatus === 'COMPLETED' || pStatus === 'DELIVERED' || mStatus === 'DELIVERED' || mStatus === 'COMPLETED') {
          return 'COMPLETED';
        }

        if (pStatus === 'PICKED_UP' || pStatus === 'PARCEL_AT_DROP_SHG' || pStatus === 'PARCEL_WITH_DROP_SHG' || mStatus === 'PARCEL_AT_DROP_SHG' || mStatus === 'PARCEL_WITH_DROP_SHG' || mStatus === 'IN_TRANSIT_TO_BUYER') {
          return 'PickedUp';
        }

        if (pStatus === 'REJECTED') {
          return 'REJECTED';
        }

        return 'Accepted';
      }
    })(),
    isReturn: isReturnFlag,
    barcode: dbOrder.barcode || dbOrder.masterOrder?.barcode || '',
    image: items[0]?.product?.image || '',
    currentHolder: (dbOrder.status === 'PENDING' || dbOrder.status === 'RETURN_PENDING') ? 'Seller' : 'SHG',
    remainingQty: qty,
    weight: orderItems.reduce((sum: number, i: any) => sum + ((i.product?.weight || 0) * (i.quantity || 1)), 0) || '',
    distance: dbOrder.distance || dbOrder.masterOrder?.distance || '',
    time: timeStr,
    legType: type,
    phase: type === 'drop' ? 'DROP' : 'PICKUP',
    acceptedAt: type === 'pickup'
      ? dbOrder.tracking?.find((t: any) => t.status === 'ACCEPTED')?.updatedAt
      : dbOrder.tracking?.find((t: any) => t.status === 'ACCEPTED')?.updatedAt,
    completedAt: type === 'pickup'
      ? dbOrder.tracking?.find((t: any) => t.status === 'COMPLETED')?.updatedAt
      : dbOrder.tracking?.find((t: any) => t.status === 'COMPLETED')?.updatedAt,
    fromLocation: isGeneratedReturn
      ? (type === 'pickup' ? dbOrder.deliveryAddress : 'Transporter')
      : isGeneratedNewOrder
        ? (type === 'pickup' ? dbOrder.seller?.fullName : 'Transporter')
        : (type === 'drop'
          ? (actualPickupAddress || 'Transporter')
          : (actualPickupAddress === 'Transporter' ? 'Transporter' : (actualPickupAddress || 'Seller'))),
    toLocation: isGeneratedReturn
      ? (type === 'pickup' ? 'Transporter' : dbOrder.deliveryAddress)
      : isGeneratedNewOrder
        ? (type === 'pickup' ? 'Transporter' : dbOrder.deliveryAddress)
        : (type === 'drop'
          ? (actualDropAddress || 'Buyer')
          : (actualPickupAddress === 'Transporter' ? (actualDropAddress || 'Buyer') : 'Transporter')),
    buyerName: dbOrder.buyer?.buyerName || dbOrder.buyer?.fullName || dbOrder.masterOrder?.buyer?.buyerName || dbOrder.masterOrder?.buyer?.fullName || '',
    sellerName: dbOrder.seller?.fullName || dbOrder.masterOrder?.items?.[0]?.seller?.fullName || '',
    products: orderItems.map((item: any) => ({
      code: `#P-${item.productId || item.id}`,
      tag: type === 'pickup' ? 'Pickup Order' : 'Delivery Order',
      name: item.product?.name || 'Item',
      details: `${item.quantity} ${item.quantity > 1 ? 'items' : 'item'}`,
      weightValue: (item.product?.weight || 0) * item.quantity,
      qty: item.quantity,
      unit: item.product?.unit || 'kg',
      price: item.product?.price || 0,
      category: item.product?.category || 'FOOD',
      itemId: item.id,
      productId: item.productId,
      verificationCode: item.verificationCode || '',
      verificationStatus: item.verificationStatus || 'PENDING',
    })),
    transporterName: dbOrder.transporter?.fullName || '',
    transporterMobile: dbOrder.transporter?.phoneNumber || '',
    vehicleNumber: dbOrder.transporter?.transporterDetail?.vehicleNumber || dbOrder.transporter?.transporterDetail?.registrationNumber || dbOrder.transporter?.otherDetails?.[0]?.registrationNumber || '',
    transporterId: dbOrder.transporter?.transporterDetail?.transporterCode || '',
    transporterAddress: dbOrder.transporter?.transporterAddress || '',
    transporterRoute: dbOrder.transporter?.transporterRoute || '',
    handoverCode: dbOrder.handoverCode || '',
    isPickupRedirected: !!(dbOrder.isPickupRedirected || dbOrder.masterOrder?.isPickupRedirected || dbOrder.pickupShgStatus === 'REDIRECTED'),
    isDropRedirected: !!(dbOrder.isDropRedirected || dbOrder.masterOrder?.isDropRedirected || dbOrder.dropShgStatus === 'REDIRECTED'),
    isRedirected: !!(dbOrder.isPickupRedirected || dbOrder.isDropRedirected || dbOrder.masterOrder?.isPickupRedirected || dbOrder.masterOrder?.isDropRedirected || dbOrder.pickupShgStatus === 'REDIRECTED' || dbOrder.dropShgStatus === 'REDIRECTED'),
    pickupShgStatus: dbOrder.pickupShgStatus || dbOrder.masterOrder?.pickupShgStatus || '',
    dropShgStatus: dbOrder.dropShgStatus || dbOrder.masterOrder?.dropShgStatus || '',
    pickupTransporterStatus: dbOrder.pickupTransporterStatus || '',
    mainStatus: dbOrder.mainStatus || '',
    uuid: dbOrder.id || '',
  };
};

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<Order[]>([]);
  const [redirectedOrders, setRedirectedOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [returnedOrders, setReturnedOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(true);
  const [highlightedOrders, setHighlightedOrders] = useState<Record<string, 'new' | 'updated'>>({});

  const [incomingReturnOrders, setIncomingReturnOrders] = useState<Order[]>([]);
  const localAcceptedReturnsRef = useRef<Order[]>([]);
  const localCompletedReturnsRef = useRef<Order[]>([]);
  const localCompletedOrdersRef = useRef<Order[]>([]);

  const [localPickedUpPickups, setLocalPickedUpPickups] = useState<string[]>([]);

  const applyHighlight = (orderId: string) => {
    setHighlightedOrders(prev => ({ ...prev, [orderId]: 'new' }));
    setTimeout(() => {
      setHighlightedOrders(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }, 30000);
  };

  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const val = await AsyncStorage.getItem('picked_up_pickups');
        if (val) {
          setLocalPickedUpPickups(JSON.parse(val));
        }
      } catch (e) {
        console.warn('Failed to load local data from storage:', e);
      }
    };
    loadLocalData();
  }, []);

  const previousOrdersRef = useRef<Record<string, { status: string; legType: string }>>({});

  const orders = [...incomingOrders, ...acceptedOrders, ...deliveredOrders, ...pendingOrders, ...returnedOrders];

  const refreshOrdersList = useCallback(async () => {
    try {
      setIsOrdersLoading(true);
      // Check if user is logged in
      const token = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
      if (!token) {
        setIsOrdersLoading(false);
        return;
      }

      // Fetch local picked up pickups directly from AsyncStorage to avoid state race conditions on mount
      const localPickedUpStr = await AsyncStorage.getItem('picked_up_pickups');
      const localPickedUp: string[] = localPickedUpStr ? JSON.parse(localPickedUpStr) : [];

      const localRescheduledStr = await AsyncStorage.getItem('rescheduled_orders');
      const localRescheduled: Record<string, { date: string, time: string, reason: string }> = localRescheduledStr ? JSON.parse(localRescheduledStr) : {};

      // 1. Fetch live assigned pickups
      const pickupResponse = await axiosInstance.get('/orders/new/assigned');
      const rawPickups = pickupResponse.data || [];

      // 2. Fetch live assigned & completed drops (API removed)
      const rawDrops: any[] = [];

      // 3. Fetch live return orders
      let rawReturns: any[] = [];
      try {
        const returnsResponse = await axiosInstance.get('/orders/returns/assigned');
        rawReturns = returnsResponse.data || [];
      } catch (err) {
        console.warn('Failed to fetch assigned returns:', err);
      }

      let rawCompleted: any = { newOrders: [], returnOrders: [] };
      try {
        const completedRes = await axiosInstance.get('/orders/completed');
        rawCompleted = completedRes.data || { newOrders: [], returnOrders: [] };
      } catch (err) {
        console.warn('Failed to fetch completed orders:', err);
      }

      let rawRejected: any = { newOrders: [], returnOrders: [] };
      try {
        const rejectedRes = await axiosInstance.get('/orders/rejected');
        rawRejected = rejectedRes.data || { newOrders: [], returnOrders: [] };
      } catch (err) {
        console.warn('Failed to fetch rejected orders:', err);
      }

      // Auto-accept any assigned PENDING / RETURN_PENDING pickups & returns on backend
      rawPickups.forEach((o: any) => {
        if (o.status === 'PENDING' || o.status === 'RETURN_PENDING') {
          axiosInstance.post(`/orders/new/${o.id}/accept`, { legType: o.legType || 'pickup' }).catch(() => { });
        }
      });

      rawReturns.forEach((o: any) => {
        if (o.status === 'PENDING' || o.status === 'RETURN_PENDING') {
          axiosInstance.post(`/orders/returns/${o.id}/accept`).catch(() => { });
        }
      });

      // Map pickups to UI shape
      const mappedPickups = rawPickups.map((o: any) => {
        const order = mapDbOrderToUi(o, o.legType || 'pickup', false);
        if (order.status === 'COMPLETED' || o.status === 'COMPLETED' || o.pickupShgStatus === 'DROPPED') {
          order.status = 'COMPLETED';
          const pIdx = localPickedUp.indexOf(order.id);
          if (pIdx !== -1) {
            localPickedUp.splice(pIdx, 1);
            AsyncStorage.setItem('picked_up_pickups', JSON.stringify(localPickedUp)).catch(() => { });
          }
        } else if (order.status === 'Accepted' && localPickedUp.includes(order.id)) {
          order.status = 'PickedUp';
        }
        return order;
      });
      const mappedDrops = rawDrops.map((o: any) => {
        const order = mapDbOrderToUi(o, 'drop', false);
        return order;
      });

      const allMapped = [...mappedPickups, ...mappedDrops];

      // Filter out completed/accepted pickup orders if there is an active/completed drop order for the same master order assigned to us
      const finalMapped = allMapped.filter(order => {
        if (order.legType === 'pickup') {
          const hasDropOrder = allMapped.some(o => o.legType === 'drop' && o.orderId === order.orderId);
          if (hasDropOrder && (order.status === 'PickedUp' || order.status === 'COMPLETED')) {
            return false;
          }
        } else if (order.legType === 'drop') {
          const hasIncompletePickup = allMapped.some(
            o => o.legType === 'pickup' && o.orderId === order.orderId && o.status !== 'PickedUp' && o.status !== 'COMPLETED'
          );
          if (hasIncompletePickup) {
            return false;
          }
        }
        return true;
      });

      // Compare with previous orders to identify new/updated orders
      const previousOrders = previousOrdersRef.current;
      const newHighlights: Record<string, 'new' | 'updated'> = {};
      const currentOrdersRecord: Record<string, { status: string; legType: string }> = {};

      finalMapped.forEach(order => {
        if (localRescheduled[order.id]) {
          order.rescheduledDate = localRescheduled[order.id].date;
          order.rescheduledTime = localRescheduled[order.id].time;
        }

        const prev = previousOrders[order.orderId];

        currentOrdersRecord[order.orderId] = {
          status: order.status,
          legType: order.legType || '',
        };

        if (Object.keys(previousOrders).length > 0) {
          if (!prev) {
            newHighlights[order.id] = 'new';
          } else if (prev.status !== order.status || prev.legType !== order.legType) {
            newHighlights[order.id] = 'updated';
          }
        }
      });

      previousOrdersRef.current = currentOrdersRecord;

      if (Object.keys(newHighlights).length > 0) {
        setHighlightedOrders(prev => ({ ...prev, ...newHighlights }));

        Object.keys(newHighlights).forEach(id => {
          setTimeout(() => {
            setHighlightedOrders(prev => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }, 30000);
        });
      }

      // Segment mapped orders by status
      const sortedIncoming = finalMapped.filter(o => o.status === 'assigned').sort((a, b) => {
        const aNum = parseInt(a.id.split('-').pop() || '0', 10);
        const bNum = parseInt(b.id.split('-').pop() || '0', 10);
        return bNum - aNum;
      });
      const uniqueIncomingMap = new Map<string, Order>();
      sortedIncoming.forEach(o => {
        if (!uniqueIncomingMap.has(o.orderId)) {
          uniqueIncomingMap.set(o.orderId, o);
        }
      });
      setIncomingOrders(Array.from(uniqueIncomingMap.values()));

      const sortedAccepted = finalMapped.filter(o => (o.status === 'Accepted' || o.status === 'PickedUp') && !o.isPickupRedirected).sort((a, b) => {
        const aNum = parseInt(a.id.split('-').pop() || '0', 10);
        const bNum = parseInt(b.id.split('-').pop() || '0', 10);
        return bNum - aNum;
      });
      const uniqueAcceptedMap = new Map<string, Order>();
      sortedAccepted.forEach(o => {
        if (!uniqueAcceptedMap.has(o.orderId)) {
          uniqueAcceptedMap.set(o.orderId, o);
        }
      });
      setAcceptedOrders(Array.from(uniqueAcceptedMap.values()));

      // Filter redirected orders
      const sortedRedirected = finalMapped.filter(o => o.isPickupRedirected && o.status !== 'COMPLETED').sort((a, b) => {
        const aNum = parseInt(a.id.split('-').pop() || '0', 10);
        const bNum = parseInt(b.id.split('-').pop() || '0', 10);
        return bNum - aNum;
      });
      const uniqueRedirectedMap = new Map<string, Order>();
      sortedRedirected.forEach(o => {
        if (!uniqueRedirectedMap.has(o.orderId)) {
          uniqueRedirectedMap.set(o.orderId, o);
        }
      });
      setRedirectedOrders(Array.from(uniqueRedirectedMap.values()));

      const mappedReturns = rawReturns.map((o: any) => {
        const order = mapDbOrderToUi(o, o.legType, true);
        if (localRescheduled[order.id]) {
          order.rescheduledDate = localRescheduled[order.id].date;
          order.rescheduledTime = localRescheduled[order.id].time;
        }
        return order;
      });

      const incomingReturns = mappedReturns.filter(o => o.status === 'assigned');
      setIncomingReturnOrders(incomingReturns.sort((a, b) => {
        const aNum = parseInt(a.id.split('-').pop() || '0', 10);
        const bNum = parseInt(b.id.split('-').pop() || '0', 10);
        return bNum - aNum;
      }));

      const activeReturns = mappedReturns.filter(o => o.status !== 'REJECTED' && o.status !== 'COMPLETED' && o.status !== 'assigned');
      const rejectedReturnsFromBackend = mappedReturns.filter(o => o.status === 'REJECTED');


      const sortedReturned = finalMapped.filter(o => o.status === 'RETURNED').sort((a, b) => {
        const aNum = parseInt(a.id.split('-').pop() || '0', 10);
        const bNum = parseInt(b.id.split('-').pop() || '0', 10);
        return bNum - aNum;
      });

      const allReturned = [...sortedReturned, ...activeReturns];
      const uniqueReturnedMap = new Map<string, Order>();
      allReturned.forEach(o => uniqueReturnedMap.set(o.id, o));
      localAcceptedReturnsRef.current.forEach(o => {
        if (!uniqueReturnedMap.has(o.id)) {
          uniqueReturnedMap.set(o.id, o);
        }
      });

      const mappedReturned = Array.from(uniqueReturnedMap.values()).map(o => {
        if (localRescheduled[o.id]) {
          return { ...o, rescheduledDate: localRescheduled[o.id].date, rescheduledTime: localRescheduled[o.id].time };
        }
        return o;
      });
      setReturnedOrders(mappedReturned);

      // Completed = Everything Completed from Dedicated Endpoints + COMPLETED mapped orders
      const mappedCompletedNew = (rawCompleted.newOrders || []).map((o: any) => mapDbOrderToUi(o, o.legType || 'pickup', false));
      const mappedCompletedReturns = (rawCompleted.returnOrders || []).map((o: any) => mapDbOrderToUi(o, o.legType || 'drop', true));
      const completedFromActive = finalMapped.filter(o => o.status === 'COMPLETED');
      const allCompleted = [...mappedCompletedNew, ...mappedCompletedReturns, ...completedFromActive, ...localCompletedReturnsRef.current, ...localCompletedOrdersRef.current];
      const uniqueCompletedMap = new Map<string, Order>();
      allCompleted.forEach(o => uniqueCompletedMap.set(o.id, o));
      setDeliveredOrders(Array.from(uniqueCompletedMap.values()));

    } catch (error) {
      console.warn('Error fetching live order lists from backend:', error);
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const checkTokenAndRefresh = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_token');
        if (token !== lastTokenRef.current) {
          lastTokenRef.current = token;
          console.log('[SHG OrderContext] JWT Token changed. Clearing state and refreshing orders...');
          if (!token) {
            setIncomingOrders([]);
            setAcceptedOrders([]);
            setRedirectedOrders([]);
            setDeliveredOrders([]);
            setPendingOrders([]);

            setReturnedOrders([]);
          } else {
            await refreshOrdersList();
          }
        }
      } catch (err) {
        console.error('Error checking token change in SHG:', err);
      }
    };

    checkTokenAndRefresh();
    const interval = setInterval(checkTokenAndRefresh, 1000);
    return () => clearInterval(interval);
  }, [refreshOrdersList]);

  const getStockItems = () => {
    return orders.filter(o => o.currentHolder === 'SHG');
  };

  const clearLocalStateForOrders = async (orderIds: string[]) => {
    try {
      const localPickedUpStr = await AsyncStorage.getItem('picked_up_pickups');
      let localPickedUp: string[] = localPickedUpStr ? JSON.parse(localPickedUpStr) : [];
      localPickedUp = localPickedUp.filter(id => !orderIds.includes(id));
      await AsyncStorage.setItem('picked_up_pickups', JSON.stringify(localPickedUp));
      setLocalPickedUpPickups(localPickedUp);

      const localRescheduledStr = await AsyncStorage.getItem('rescheduled_orders');
      let localRescheduled = localRescheduledStr ? JSON.parse(localRescheduledStr) : {};
      orderIds.forEach(id => {
        delete localRescheduled[id];
      });
      await AsyncStorage.setItem('rescheduled_orders', JSON.stringify(localRescheduled));
    } catch (err) {
      console.warn('Error clearing local state for accepted orders:', err);
    }
  };

  const acceptOrder = async (order: Order, selectedVehicle?: VehicleInfo) => {
    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
      const endpoint = `/orders/new/${rawId}/accept`;

      const payload: any = { legType: order.legType };
      if (selectedVehicle) {
        payload.selectedVehicleName = selectedVehicle.name;
        payload.selectedVehicleCapacity = selectedVehicle.capacity;
        payload.selectedVehicleType = selectedVehicle.name;
      }

      await axiosInstance.post(endpoint, payload);
      await clearLocalStateForOrders([order.id]);
      await refreshOrdersList();
    } catch (error) {
      console.error(`Error accepting order ${order.id}:`, error);
      throw error;
    }
  };

  const redirectOrder = async (order: Order, reason: string = '') => {
    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
      const endpoint = `/orders/${rawId}/redirect`;
      await axiosInstance.post(endpoint, {
        legType: order.legType || 'pickup',
        reason
      });
      await clearLocalStateForOrders([order.id]);
      await refreshOrdersList();
    } catch (error) {
      console.error(`Error redirecting order ${order.id}:`, error);
      throw error;
    }
  };

  const acceptOrders = async (ordersToAccept: Order[]) => {
    try {
      await Promise.all(ordersToAccept.map(order => {
        const rawId = order.id.replace('pickup-', '').replace('drop-', '');
        const endpoint = `/orders/new/${rawId}/accept`;
        return axiosInstance.post(endpoint, { legType: order.legType });
      }));
      await clearLocalStateForOrders(ordersToAccept.map(o => o.id));
      await refreshOrdersList();
    } catch (error) {
      console.error('Error accepting orders:', error);
      throw error;
    }
  };

  const acceptReturnOrders = async (orderIds: string[]) => {
    try {
      await Promise.all(orderIds.map(id => {
        const rawId = id.replace('pickup-', '').replace('drop-', '');
        return axiosInstance.post(`/orders/returns/${rawId}/accept`);
      }));
      await clearLocalStateForOrders(orderIds);
      await refreshOrdersList();

      setHighlightedOrders(prev => {
        const next = { ...prev };
        orderIds.forEach(id => { next[id] = 'new'; });
        return next;
      });
      setTimeout(() => {
        setHighlightedOrders(prev => {
          const next = { ...prev };
          orderIds.forEach(id => { delete next[id]; });
          return next;
        });
      }, 30000);
    } catch (error) {
      console.error('Error accepting return orders:', error);
      throw error;
    }
  };

  const acceptAllOrders = async () => {
    await acceptOrders(incomingOrders);
  };

  const rescheduleOrder = async (orderId: string, date: string, time: string, reason: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const isDemo = orderId.startsWith('RTO-') || orderId.includes('demo') || (order as any)?.isDemo;

      if (!isDemo && order) {
        const rawId = Number(orderId.replace('pickup-', '').replace('drop-', ''));
        const isDelivery = order.status === 'PickedUp' || (order.id.startsWith('RTO-') && order.legType === 'drop');

        const endpoint = isDelivery
          ? '/orders/reschedule/delivery'
          : '/orders/reschedule';

        await axiosInstance.post(endpoint, {
          orderId: rawId,
          date,
          time,
          reason,
        });
      }

      const localRescheduledStr = await AsyncStorage.getItem('rescheduled_orders');
      const localRescheduled = localRescheduledStr ? JSON.parse(localRescheduledStr) : {};
      localRescheduled[orderId] = { date, time, reason };
      await AsyncStorage.setItem('rescheduled_orders', JSON.stringify(localRescheduled));
      await refreshOrdersList();
    } catch (error) {
      console.error('Error rescheduling order:', error);
      throw error;
    }
  };

  const receiveOrder = async (order: Order, code?: string, activeType?: string) => {
    if (order.id.startsWith('RTO-') && order.status === 'COMPLETED') {
      const updatedOrder = { ...order, isRejectedDelivery: true };
      setReturnedOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      applyHighlight(order.id);
      return;
    }

    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
      if (order.isReturn && order.status === 'Accepted') {
        const endpoint = `/orders/returns/pickup/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: code || '1234' });
        applyHighlight(order.id);
        await refreshOrdersList();
        return;
      }

      const isPickupLeg = order.legType === 'pickup' || order.id.startsWith('pickup-');
      if (isPickupLeg) {
        const endpoint = `/orders/new/pickup/${rawId}/complete`;
        const paramLegType = (activeType === 'transporter' || order.isReturn) ? 'handover' : 'pickup';
        await axiosInstance.post(endpoint, { legType: paramLegType, code: code || '1234' });
        await refreshOrdersList();
      } else {
        const endpoint = `/orders/new/pickup/${rawId}/complete`;
        await axiosInstance.post(endpoint, { legType: 'drop', code: code || order.handoverCode || '1234' });
        await refreshOrdersList();
      }
    } catch (error) {
      console.error(`Error completing pickup for order ${order.id}:`, error);
      throw error;
    }
  };

  const notReceiveOrder = (order: Order) => {
    setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
    setPendingOrders(prev => [...prev, { ...order, status: 'Pending' }]);
  };

  const deliverOrder = async (order: Order, code?: string) => {
    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');

      if (order.id.startsWith('RTO-')) {
        // Complete the return order locally
        const completedOrder = { ...order, status: 'COMPLETED' as any };
        localCompletedReturnsRef.current = [...localCompletedReturnsRef.current, completedOrder];
        localAcceptedReturnsRef.current = localAcceptedReturnsRef.current.filter(o => o.id !== order.id);
        setReturnedOrders(prev => prev.filter(o => o.id !== order.id));
        setDeliveredOrders(prev => [...prev, completedOrder]);

        applyHighlight(order.id);
        await refreshOrdersList();
        return;
      }

      if (order.isReturn) {
        const endpoint = `/orders/returns/dilivery/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: code || '1234' });
        applyHighlight(order.id);
        await refreshOrdersList();
        return;
      }

      if (order.legType === 'pickup') {
        // Complete the pickup order on the backend now that it is delivered to the transporter
        const endpoint = `/orders/new/pickup/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: code || '1234' });

        const localPickedUpStr = await AsyncStorage.getItem('picked_up_pickups');
        let localPickedUp: string[] = localPickedUpStr ? JSON.parse(localPickedUpStr) : [];
        localPickedUp = localPickedUp.filter(id => id !== order.id);
        await AsyncStorage.setItem('picked_up_pickups', JSON.stringify(localPickedUp));
        setLocalPickedUpPickups(localPickedUp);

        const completedOrder = { ...order, status: 'COMPLETED' as any };
        localCompletedOrdersRef.current = [...localCompletedOrdersRef.current, completedOrder];

        await refreshOrdersList();
      } else {
        const endpoint = `/orders/new/dilivery/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: code || '1234' });

        const completedOrder = { ...order, status: 'COMPLETED' as any };
        localCompletedOrdersRef.current = [...localCompletedOrdersRef.current, completedOrder];

        await refreshOrdersList();
      }
    } catch (error) {
      console.error(`Error completing order ${order.id}:`, error);
    }
  };

  return (
    <OrderContext.Provider value={{
      incomingOrders,
      acceptedOrders,
      deliveredOrders,
      pendingOrders,
      returnedOrders,
      orders,
      highlightedOrders,
      getStockItems,
      acceptOrder,
      redirectOrder,
      acceptOrders,
      acceptAllOrders,
      receiveOrder,
      notReceiveOrder,
      deliverOrder,
      refreshOrdersList,
      isOrdersLoading,
      incomingReturnOrders,
      redirectedOrders,
      acceptReturnOrders,
      rescheduleOrder,
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
