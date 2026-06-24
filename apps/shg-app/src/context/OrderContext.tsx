import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';
import { STORAGE_KEYS } from '../utils/storage';

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
  rejectReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  acceptedAt?: string;
  completedAt?: string;
  legType?: 'pickup' | 'drop';
  isRejectedDelivery?: boolean;
  fromLocation?: string;
  toLocation?: string;
  rescheduledTime?: string;
  rescheduledDate?: string;
  isReturn?: boolean;
  buyerName?: string;
  sellerName?: string;
}

interface OrderContextType {
  incomingOrders: Order[];
  acceptedOrders: Order[];
  deliveredOrders: Order[];
  pendingOrders: Order[];
  rejectedOrders: Order[];
  returnedOrders: Order[];
  orders: Order[];
  highlightedOrders: Record<string, 'new' | 'updated'>;
  getStockItems: () => Order[];
  acceptOrder: (order: Order) => Promise<void>;
  acceptOrders: (orders: Order[]) => Promise<void>;
  acceptAllOrders: () => Promise<void>;
  rejectOrder: (order: Order) => Promise<void>;
  receiveOrder: (order: Order) => Promise<void>;
  notReceiveOrder: (order: Order) => void;
  deliverOrder: (order: Order) => Promise<void>;
  refreshOrdersList: () => Promise<void>;
  isOrdersLoading: boolean;
  incomingReturnOrders: Order[];
  acceptReturnOrders: (orderIds: string[]) => void;
  rejectReturnOrders: (orderIds: string[], reason: string) => void;
  rescheduleOrder: (orderId: string, date: string, time: string, reason: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);



const mapDbOrderToUi = (dbOrder: any, type: 'pickup' | 'drop', isReturnOrder?: boolean): Order => {
  const items = dbOrder.items || [];
  const parcelName = items.map((i: any) => i.product?.name).filter(Boolean).join(', ') || '';
  const category = items[0]?.product?.category || '';

  const masterId = dbOrder.masterOrderId || dbOrder.id;

  // Use master order items if available for correct quantity/weight representing the full order
  const orderItems = dbOrder.masterOrder?.items?.length > 0 ? dbOrder.masterOrder.items : items;

  const dbQty = orderItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
  const qty = dbQty > 0 ? dbQty : 1;

  const sellerAddressArr = [
    dbOrder.seller?.address?.addressLine1,
    dbOrder.seller?.address?.addressLine2,
    dbOrder.seller?.address?.village,
    dbOrder.seller?.address?.district,
    dbOrder.masterOrder?.items?.[0]?.seller?.address?.addressLine1,
    dbOrder.masterOrder?.items?.[0]?.seller?.address?.village
  ].filter(Boolean);
  const actualPickupAddress = sellerAddressArr.length > 0 ? sellerAddressArr[0] : '';

  const buyerAddressArr = [
    dbOrder.buyer?.address?.addressLine1,
    dbOrder.buyer?.address?.addressLine2,
    dbOrder.buyer?.address?.village,
    dbOrder.buyer?.address?.district,
    dbOrder.masterOrder?.buyer?.address?.addressLine1,
    dbOrder.masterOrder?.buyer?.address?.village
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
      orderId: dbOrder.masterOrder?.orderNumber || `ORD-${masterId}`,
      parcelName,
      category,
      mobile: type === 'pickup' ? (dbOrder.seller?.phoneNumber || '') : (dbOrder.buyer?.phoneNumber || dbOrder.masterOrder?.buyer?.phoneNumber || ''),
      amount: String(orderItems.reduce((sum: number, i: any) => sum + (i.quantity * (i.product?.price || 0)), 0)),
      payment: dbOrder.masterOrder?.paymentMethod || 'Online',
      address: finalAddress,
      sourceAddress: finalSourceAddress,
      deliveryDay: dateStr,
      date: dateStr,
      status: (dbOrder.status === 'PENDING' || dbOrder.status === 'RETURN_PENDING') ? 'assigned' :
              (dbOrder.status === 'ACCEPTED' || dbOrder.status === 'RETURN_ACCEPTED') ? 'Accepted' :
              (dbOrder.status === 'PICKED_UP' || dbOrder.status === 'RETURN_PICKED_UP') ? 'PickedUp' :
              dbOrder.status === 'REJECTED' ? 'REJECTED' : 'COMPLETED',
      isReturn: isReturnFlag,
      image: items[0]?.product?.image || '',
      currentHolder: (dbOrder.status === 'PENDING' || dbOrder.status === 'RETURN_PENDING') ? 'Seller' : 'SHG',
      remainingQty: qty,
      weight: orderItems.reduce((sum: number, i: any) => sum + (i.product?.weight || 0), 0) || '',
      distance: dbOrder.distance || dbOrder.masterOrder?.distance || '',
      time: timeStr,
    legType: type,
    rejectReason: type === 'pickup'
      ? dbOrder.tracking?.find((t: any) => t.status === 'REJECTED')?.remarks?.replace('Pickup leg rejected by SHG. Reason: ', '')
      : dbOrder.tracking?.find((t: any) => t.status === 'REJECTED')?.remarks?.replace('Delivery leg rejected by SHG. Reason: ', ''),
    rejectedAt: type === 'pickup'
      ? dbOrder.tracking?.find((t: any) => t.status === 'REJECTED')?.updatedAt
      : dbOrder.tracking?.find((t: any) => t.status === 'REJECTED')?.updatedAt,
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
    buyerName: dbOrder.buyer?.fullName || dbOrder.masterOrder?.buyer?.fullName || '',
    sellerName: dbOrder.seller?.fullName || dbOrder.masterOrder?.items?.[0]?.seller?.fullName || '',
  };
};

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [rejectedOrders, setRejectedOrders] = useState<Order[]>([]);
  const [returnedOrders, setReturnedOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(true);
  const [highlightedOrders, setHighlightedOrders] = useState<Record<string, 'new' | 'updated'>>({});

  const [incomingReturnOrders, setIncomingReturnOrders] = useState<Order[]>([]);
  const localAcceptedReturnsRef = useRef<Order[]>([]);
  const localRejectedReturnsRef = useRef<Order[]>([]);
  const localCompletedReturnsRef = useRef<Order[]>([]);
  const localCompletedOrdersRef = useRef<Order[]>([]);

  const [localPickedUpPickups, setLocalPickedUpPickups] = useState<string[]>([]);
  const [rejectedDeliveries, setRejectedDeliveries] = useState<string[]>([]);

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

        const rejectedVal = await AsyncStorage.getItem('rejected_deliveries');
        if (rejectedVal) {
          setRejectedDeliveries(JSON.parse(rejectedVal));
        }
      } catch (e) {
        console.warn('Failed to load local data from storage:', e);
      }
    };
    loadLocalData();
  }, []);

  const previousOrdersRef = useRef<Record<string, { status: string; legType: string }>>({});

  const orders = [...incomingOrders, ...acceptedOrders, ...deliveredOrders, ...pendingOrders, ...rejectedOrders, ...returnedOrders];

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

      const localRejectedStr = await AsyncStorage.getItem('rejected_deliveries');
      const localRejected: string[] = localRejectedStr ? JSON.parse(localRejectedStr) : [];

      const localRescheduledStr = await AsyncStorage.getItem('rescheduled_orders');
      const localRescheduled: Record<string, {date: string, time: string, reason: string}> = localRescheduledStr ? JSON.parse(localRescheduledStr) : {};

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

      // Map pickups to UI shape
      const mappedPickups = rawPickups.map((o: any) => {
        const order = mapDbOrderToUi(o, o.legType || 'pickup', false);
        if (order.status === 'Accepted' && localPickedUp.includes(order.id)) {
          order.status = 'PickedUp';
        }
        if (localRejected.includes(order.id)) {
          order.isRejectedDelivery = true;
        }
        return order;
      });
      const mappedDrops = rawDrops.map((o: any) => {
        const order = mapDbOrderToUi(o, 'drop', false);
        if (localRejected.includes(order.id)) {
          order.isRejectedDelivery = true;
        }
        return order;
      });

      const allMapped = [...mappedPickups, ...mappedDrops];

      // Filter out completed/accepted pickup orders if there is an active/completed drop order for the same master order assigned to us
      const finalMapped = allMapped.filter(order => {
        if (order.legType === 'pickup') {
          const hasDropOrder = allMapped.some(o => o.legType === 'drop' && o.orderId === order.orderId);
          if (hasDropOrder) {
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
      setIncomingOrders(sortedIncoming);

      const sortedAccepted = finalMapped.filter(o => o.status === 'Accepted' || o.status === 'PickedUp').sort((a, b) => {
        const aNum = parseInt(a.id.split('-').pop() || '0', 10);
        const bNum = parseInt(b.id.split('-').pop() || '0', 10);
        return bNum - aNum;
      });
      setAcceptedOrders(sortedAccepted);

      const mappedReturns = rawReturns.map((o: any) => {
        const order = mapDbOrderToUi(o, o.legType, true);
        if (localRejected.includes(order.id)) {
          order.isRejectedDelivery = true;
        }
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

      const sortedRejected = finalMapped.filter(o => o.status === 'REJECTED').sort((a, b) => {
        const aNum = parseInt(a.id.split('-').pop() || '0', 10);
        const bNum = parseInt(b.id.split('-').pop() || '0', 10);
        return bNum - aNum;
      });
      const rawMappedRejected = [...sortedRejected, ...rejectedReturnsFromBackend, ...localRejectedReturnsRef.current];
      const uniqueRejectedMap = new Map<string, Order>();
      rawMappedRejected.forEach(o => uniqueRejectedMap.set(o.id, o));
      setRejectedOrders(Array.from(uniqueRejectedMap.values()));

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
        if (localRejected.includes(o.id)) {
          return { ...o, isRejectedDelivery: true };
        }
        if (localRescheduled[o.id]) {
          return { ...o, rescheduledDate: localRescheduled[o.id].date, rescheduledTime: localRescheduled[o.id].time };
        }
        return o;
      });
      setReturnedOrders(mappedReturned);

      // Completed = Everything Completed
      const backendCompleted = finalMapped.filter(o => o.status === 'COMPLETED');
      const returnCompleted = mappedReturns.filter(o => o.status === 'COMPLETED');
      setDeliveredOrders([...backendCompleted, ...returnCompleted, ...localCompletedReturnsRef.current, ...localCompletedOrdersRef.current]);

    } catch (error) {
      console.warn('Error fetching live order lists from backend:', error);
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrdersList();
  }, []);

  const getStockItems = () => {
    return orders.filter(o => o.currentHolder === 'SHG');
  };

  const acceptOrder = async (order: Order) => {
    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
      const endpoint = `/orders/new/${rawId}/accept`;

      await axiosInstance.post(endpoint, { legType: order.legType });
      await refreshOrdersList();
    } catch (error) {
      console.error(`Error accepting order ${order.id}:`, error);
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

  const rejectReturnOrders = async (orderIds: string[], reason: string) => {
    try {
      await Promise.all(orderIds.map(id => {
        const rawId = id.replace('pickup-', '').replace('drop-', '');
        const order = incomingReturnOrders.find(o => o.id === id);
        const endpoint = order?.legType === 'pickup' 
          ? `/orders/returns/pickup/${rawId}/reject`
          : `/orders/returns/${rawId}/reject`;
        return axiosInstance.post(endpoint, { reason });
      }));

      // Update local state ONLY on API success
      const rejectedOrdersToAdd = incomingReturnOrders
        .filter(o => orderIds.includes(o.id))
        .map(o => ({
          ...o,
          status: 'REJECTED' as any,
          rejectedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          rejectedBy: 'SHG Hub',
        }));
      
      setIncomingReturnOrders(prev => prev.filter(o => !orderIds.includes(o.id)));
      setRejectedOrders(prev => [...prev, ...rejectedOrdersToAdd]);

      orderIds.forEach(id => applyHighlight(id));

      await refreshOrdersList();
    } catch (error) {
      console.error('Error rejecting return orders:', error);
      await refreshOrdersList(); // Revert/Refresh on failure
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
        const isDelivery = order.status === 'PickedUp' || (order.id.startsWith('RTO-') && order.legType === 'drop') || order.isRejectedDelivery;

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

  const rejectOrder = async (order: Order) => {
    try {
      // Intercept rejections in the delivery phase to transition them to "Return to Source" flow
      if (order.status === 'PickedUp' || (order.id.startsWith('RTO-') && order.legType === 'drop')) {
        const localRejectedStr = await AsyncStorage.getItem('rejected_deliveries');
        const localRejected: string[] = localRejectedStr ? JSON.parse(localRejectedStr) : [];
        if (!localRejected.includes(order.id)) {
          localRejected.push(order.id);
          await AsyncStorage.setItem('rejected_deliveries', JSON.stringify(localRejected));
          setRejectedDeliveries(localRejected);
        }
        await refreshOrdersList();
        return;
      }

      const isDemo = order.id.startsWith('RTO-') || order.id.includes('demo') || (order as any).isDemo;
      
      if (isDemo) {
        // Fallback local logic for demo/static orders
        setIncomingOrders(prev => prev.filter(o => o.id !== order.id));
        setIncomingReturnOrders(prev => prev.filter(o => o.id !== order.id));
        setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
        setReturnedOrders(prev => prev.filter(o => o.id !== order.id));
        localAcceptedReturnsRef.current = localAcceptedReturnsRef.current.filter(o => o.id !== order.id);
        
        const rejectedOrder = {
          ...order,
          status: 'REJECTED' as any,
          rejectedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          rejectedBy: 'SHG Hub',
        };
        
        localRejectedReturnsRef.current = [...localRejectedReturnsRef.current, rejectedOrder];
        
        setRejectedOrders(prev => {
          if (prev.some(o => o.id === order.id)) return prev;
          return [...prev, rejectedOrder];
        });

        if (order.isReturn || order.id.startsWith('RTO-')) {
          applyHighlight(order.id);
        }
        return;
      }

      const rawId = order.id.replace('pickup-', '').replace('drop-', '');

      let endpoint = '';
      if (order.isReturn) {
        endpoint = order.legType === 'pickup'
          ? `/orders/returns/pickup/${rawId}/reject`
          : `/orders/returns/${rawId}/reject`;
      } else if (order.status === 'Accepted') {
        endpoint = `/orders/new/pickup/${rawId}/reject`;
      } else {
        endpoint = `/orders/new/${rawId}/reject`;
      }

      // 1. Call API FIRST
      await axiosInstance.post(endpoint, { reason: order.rejectReason || '' });

      // 2. Wait for API success response, THEN update local state
      setIncomingOrders(prev => prev.filter(o => o.id !== order.id));
      setIncomingReturnOrders(prev => prev.filter(o => o.id !== order.id));
      setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
      setReturnedOrders(prev => prev.filter(o => o.id !== order.id));
      
      const rejectedOrderData = {
        ...order,
        status: 'REJECTED' as any,
        rejectedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        rejectedBy: 'SHG Hub',
      };
      
      setRejectedOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        return [...prev, rejectedOrderData];
      });

      if (order.isReturn) {
        applyHighlight(order.id);
      }

      if (order.legType === 'pickup') {
        const localPickedUpStr = await AsyncStorage.getItem('picked_up_pickups');
        let localPickedUp: string[] = localPickedUpStr ? JSON.parse(localPickedUpStr) : [];
        localPickedUp = localPickedUp.filter(id => id !== order.id);
        await AsyncStorage.setItem('picked_up_pickups', JSON.stringify(localPickedUp));
        setLocalPickedUpPickups(localPickedUp);
      }

      await refreshOrdersList();

    } catch (error) {
      console.error('Error rejecting order:', error);
      await refreshOrdersList(); // Revert on failure
      throw error;
    }
  };

  const receiveOrder = async (order: Order) => {
    if (order.id.startsWith('RTO-')) {
      // It's a dummy return order. Process it locally to move it to Delivery Returns Tab.
      const updatedOrder = { ...order, legType: 'drop' as 'drop' };
      localAcceptedReturnsRef.current = localAcceptedReturnsRef.current.map(o => o.id === order.id ? updatedOrder : o);
      setReturnedOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      applyHighlight(order.id);
      return;
    }

    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
      if (order.isReturn) {
        const endpoint = `/orders/returns/pickup/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: '1234' });
        applyHighlight(order.id);
        await refreshOrdersList();
        return;
      }

      if (order.legType === 'pickup') {
        // Local simulation: move to PickedUp status locally to place it in the Delivery tab
        const localPickedUpStr = await AsyncStorage.getItem('picked_up_pickups');
        const localPickedUp: string[] = localPickedUpStr ? JSON.parse(localPickedUpStr) : [];
        if (!localPickedUp.includes(order.id)) {
          localPickedUp.push(order.id);
          await AsyncStorage.setItem('picked_up_pickups', JSON.stringify(localPickedUp));
          setLocalPickedUpPickups(localPickedUp);
        }
        await refreshOrdersList();
      } else {
        const endpoint = `/orders/new/pickup/${rawId}/complete`;
        await axiosInstance.post(endpoint, { legType: 'drop', code: '1234' });
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

  const deliverOrder = async (order: Order) => {
    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');

      if (order.id.startsWith('RTO-')) {
        // Complete the return order locally
        const completedOrder = { ...order, status: 'COMPLETED' as any };
        localCompletedReturnsRef.current = [...localCompletedReturnsRef.current, completedOrder];
        localAcceptedReturnsRef.current = localAcceptedReturnsRef.current.filter(o => o.id !== order.id);
        setReturnedOrders(prev => prev.filter(o => o.id !== order.id));
        setDeliveredOrders(prev => [...prev, completedOrder]);

        // Remove from rejected deliveries
        const localRejectedStr = await AsyncStorage.getItem('rejected_deliveries');
        let localRejected: string[] = localRejectedStr ? JSON.parse(localRejectedStr) : [];
        localRejected = localRejected.filter(id => id !== order.id);
        await AsyncStorage.setItem('rejected_deliveries', JSON.stringify(localRejected));
        setRejectedDeliveries(localRejected);

        applyHighlight(order.id);
        await refreshOrdersList();
        return;
      }

      if (order.isRejectedDelivery) {
        // Complete the order on backend (return to origin complete)
        const endpoint = order.legType === 'pickup'
          ? `/orders/new/pickup/${rawId}/complete`
          : `/orders/new/dilivery/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: '1234' });

        // Remove from rejected deliveries
        const localRejectedStr = await AsyncStorage.getItem('rejected_deliveries');
        let localRejected: string[] = localRejectedStr ? JSON.parse(localRejectedStr) : [];
        localRejected = localRejected.filter(id => id !== order.id);
        await AsyncStorage.setItem('rejected_deliveries', JSON.stringify(localRejected));
        setRejectedDeliveries(localRejected);

        // Also clean up picked_up_pickups if it was a pickup leg
        if (order.legType === 'pickup') {
          const localPickedUpStr = await AsyncStorage.getItem('picked_up_pickups');
          let localPickedUp: string[] = localPickedUpStr ? JSON.parse(localPickedUpStr) : [];
          localPickedUp = localPickedUp.filter(id => id !== order.id);
          await AsyncStorage.setItem('picked_up_pickups', JSON.stringify(localPickedUp));
          setLocalPickedUpPickups(localPickedUp);
        }

        await refreshOrdersList();
        return;
      }

      if (order.isReturn) {
        const endpoint = `/orders/returns/dilivery/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: '1234' });
        applyHighlight(order.id);
        await refreshOrdersList();
        return;
      }

      if (order.legType === 'pickup') {
        // Complete the pickup order on the backend now that it is delivered to the transporter
        const endpoint = `/orders/new/pickup/${rawId}/complete`;
        await axiosInstance.post(endpoint, { code: '1234' });

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
        await axiosInstance.post(endpoint, { code: '1234' });
        
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
      rejectedOrders,
      returnedOrders,
      orders,
      highlightedOrders,
      getStockItems,
      acceptOrder,
      acceptOrders,
      acceptAllOrders,
      rejectOrder,
      receiveOrder,
      notReceiveOrder,
      deliverOrder,
      refreshOrdersList,
      isOrdersLoading,
      incomingReturnOrders,
      acceptReturnOrders,
      rejectReturnOrders,
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
