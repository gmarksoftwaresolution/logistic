import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  categoryBg?: string;
  categoryText?: string;
  scanned?: boolean;
  rejectReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  acceptedAt?: string;
  completedAt?: string;
  legType?: 'pickup' | 'drop';
}

interface OrderContextType {
  incomingOrders: Order[];
  acceptedOrders: Order[];
  deliveredOrders: Order[];
  pendingOrders: Order[];
  rejectedOrders: Order[];
  orders: Order[];
  getStockItems: () => Order[];
  acceptOrder: (order: Order) => Promise<void>;
  acceptAllOrders: () => Promise<void>;
  rejectOrder: (order: Order) => Promise<void>;
  receiveOrder: (order: Order) => void;
  notReceiveOrder: (order: Order) => void;
  deliverOrder: (order: Order) => Promise<void>;
  refreshOrdersList: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const mapDbOrderToUi = (dbOrder: any, type: 'pickup' | 'drop'): Order => {
  const items = dbOrder.items || [];
  const parcelName = items.map((i: any) => i.product?.name).filter(Boolean).join(', ') || 'General Package';
  const category = items[0]?.product?.category || 'Other';
  
  return {
    id: `${type}-${dbOrder.id}`,
    orderId: dbOrder.pickupOrderNumber || dbOrder.dropOrderNumber || `ORD-${dbOrder.id}`,
    parcelName,
    category,
    mobile: type === 'pickup' ? (dbOrder.seller?.phoneNumber || '') : (dbOrder.buyer?.phoneNumber || ''),
    amount: String(items.reduce((sum: number, i: any) => sum + (i.quantity * (i.product?.price || 0)), 0)),
    payment: 'Online',
    address: type === 'pickup' 
      ? `${dbOrder.seller?.fullName || 'Seller'}, ${dbOrder.seller?.address?.addressLine1 || ''}` 
      : `${dbOrder.buyer?.fullName || 'Buyer'}, ${dbOrder.deliveryAddress || ''}`,
    deliveryDay: '1 DAY DELIVERY',
    status: dbOrder.status === 'PENDING' ? 'assigned' : dbOrder.status === 'ACCEPTED' ? 'Accepted' : 'COMPLETED',
    image: items[0]?.product?.image || 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=400&auto=format&fit=crop',
    currentHolder: dbOrder.status === 'PENDING' ? 'Seller' : 'SHG',
    remainingQty: items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 1,
    weight: items.reduce((sum: number, i: any) => sum + (i.product?.weight || 0), 0) || 5,
    time: 'Just now',
    legType: type,
  };
};

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [rejectedOrders, setRejectedOrders] = useState<Order[]>([]);

  const orders = [...incomingOrders, ...acceptedOrders, ...deliveredOrders, ...pendingOrders, ...rejectedOrders];

  const refreshOrdersList = async () => {
    try {
      // Check if user is logged in
      const token = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
      if (!token) {
        return;
      }

      // 1. Fetch live assigned pickups
      const pickupResponse = await axiosInstance.get('/orders/pickup/assigned');
      const rawPickups = pickupResponse.data || [];
      
      // 2. Fetch live assigned drops
      const dropResponse = await axiosInstance.get('/orders/drop/assigned');
      const rawDrops = dropResponse.data || [];

      // Map pickups to UI shape
      const mappedPickups = rawPickups.map((o: any) => mapDbOrderToUi(o, 'pickup'));
      const mappedDrops = rawDrops.map((o: any) => mapDbOrderToUi(o, 'drop'));

      const allMapped = [...mappedPickups, ...mappedDrops];

      // Segment mapped orders by status
      setIncomingOrders(allMapped.filter(o => o.status === 'assigned'));
      setAcceptedOrders(allMapped.filter(o => o.status === 'Accepted'));
      setDeliveredOrders(allMapped.filter(o => o.status === 'COMPLETED'));
      
    } catch (error) {
      console.error('Error fetching live order lists from backend:', error);
    }
  };

  useEffect(() => {
    refreshOrdersList();
  }, []);

  const getStockItems = () => {
    return orders.filter(o => o.currentHolder === 'SHG');
  };

  const acceptOrder = async (order: Order) => {
    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
      const endpoint = order.legType === 'pickup' 
        ? `/orders/pickup/${rawId}/accept` 
        : `/orders/drop/${rawId}/accept`;
      
      await axiosInstance.post(endpoint);
      await refreshOrdersList();
    } catch (error) {
      console.error(`Error accepting order ${order.id}:`, error);
    }
  };

  const acceptAllOrders = async () => {
    try {
      await Promise.all(incomingOrders.map(o => acceptOrder(o)));
      await refreshOrdersList();
    } catch (error) {
      console.error('Error accepting all orders:', error);
    }
  };

  const rejectOrder = async (order: Order) => {
    try {
      // For now, move locally to rejectedOrders to preserve UI experience
      setIncomingOrders(prev => prev.filter(o => o.id !== order.id));
      setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
      setRejectedOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        return [...prev, {
          ...order,
          status: 'REJECTED',
          rejectedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          rejectedBy: 'SHG Hub',
        }];
      });
    } catch (error) {
      console.error('Error rejecting order:', error);
    }
  };

  const receiveOrder = (order: Order) => {
    setAcceptedOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Received', currentHolder: 'SHG' } : o));
  };

  const notReceiveOrder = (order: Order) => {
    setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
    setPendingOrders(prev => [...prev, { ...order, status: 'Pending' }]);
  };

  const deliverOrder = async (order: Order) => {
    try {
      const rawId = order.id.replace('pickup-', '').replace('drop-', '');
      const endpoint = order.legType === 'pickup' 
        ? `/orders/pickup/${rawId}/complete` 
        : `/orders/drop/${rawId}/complete`;
      
      await axiosInstance.post(endpoint);
      await refreshOrdersList();
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
      orders,
      getStockItems,
      acceptOrder,
      acceptAllOrders,
      rejectOrder,
      receiveOrder,
      notReceiveOrder,
      deliverOrder,
      refreshOrdersList,
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
