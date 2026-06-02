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

const MOCK_INCOMING = [
  {
    id: 'inc-3',
    orderId: 'ORD003',
    parcelName: 'Whirlpool Washing Machine 7kg',
    category: 'Washing Machine - Electric',
    categoryBg: 'bg-[#EFF6FF]',
    categoryText: 'text-[#2563EB]',
    mobile: '9654782390',
    amount: '22,400',
    payment: 'Prepaid',
    address: 'Near Gram Panchayat, Kowad',
    deliveryDay: '2 DAY DELIVERY',
    status: 'assigned',
    image: 'https://images.unsplash.com/photo-1610557892470-76d740220a3f?q=80&w=400&auto=format&fit=crop',
    transporterName: 'Sanjay Desai',
    transporterMobile: '9654782390',
    transporterId: 'Z1029KL',
    pickupTime: '02:30 PM',
    vehicleNumber: 'Z1029KL',
    currentHolder: 'Seller',
    remainingQty: 3,
    weight: '35',
    time: '1 hr ago',
    distance: 3.1
  },
  {
    id: 'inc-4',
    orderId: 'ORD004',
    parcelName: 'IFB Microwave Oven 20L',
    category: 'Microwave - Electronics',
    categoryBg: 'bg-[#FFF7ED]',
    categoryText: 'text-[#EA580C]',
    mobile: '8877665544',
    amount: '9,800',
    payment: 'Online',
    address: 'Market Yard, Ajara',
    deliveryDay: '1 DAY DELIVERY',
    status: 'assigned',
    image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?q=80&w=400&auto=format&fit=crop',
    transporterName: 'Rajesh Shinde',
    transporterMobile: '8877665544',
    transporterId: 'W8823NM',
    pickupTime: '04:15 PM',
    vehicleNumber: 'W8823NM',
    currentHolder: 'Seller',
    remainingQty: 1,
    weight: '20',
    time: '1 hr ago',
  },
  {
    id: 'inc-5',
    orderId: 'ORD005',
    parcelName: 'Sony WH-1000XM4 Headphones',
    category: 'Audio - Electronics',
    categoryBg: 'bg-[#FEE2E2]',
    categoryText: 'text-[#EF4444]',
    mobile: '9765432109',
    amount: '19,990',
    payment: 'COD',
    address: 'Gandhi Road, Belagavi',
    deliveryDay: '1 DAY DELIVERY',
    status: 'assigned',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop',
    transporterName: 'Vijay Kadam',
    transporterMobile: '9765432109',
    transporterId: 'V7362OP',
    pickupTime: '09:45 AM',
    vehicleNumber: 'V7362OP',
    currentHolder: 'Transporter',
    remainingQty: 2,
    weight: '3',
    time: '2 hrs ago',
    distance: 2.5
  },
  {
    id: 'inc-6',
    orderId: 'ORD006',
    parcelName: 'Apple iPad Air M1',
    category: 'Tablets - Electronics',
    categoryBg: 'bg-[#F5F3FF]',
    categoryText: 'text-[#7C3AED]',
    mobile: '9123456789',
    amount: '54,900',
    payment: 'Prepaid',
    address: 'Station Road, Nipani',
    deliveryDay: '2 DAY DELIVERY',
    status: 'assigned',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=400&auto=format&fit=crop',
    transporterName: 'Mahesh Shinde',
    transporterMobile: '9123456789',
    transporterId: 'A8293KL',
    pickupTime: '11:15 AM',
    vehicleNumber: 'A8293KL',
    currentHolder: 'Seller',
    remainingQty: 1,
    weight: '5',
    time: '3 hrs ago',
    distance: 7.1
  }
];

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

  const acceptAllOrders = () => {
    const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setAcceptedOrders(prev => [...prev, ...incomingOrders.map(o => ({ 
      ...o, 
      status: 'Accepted', 
      currentHolder: 'SHG', 
      acceptedAt: now 
    }))]);
    setIncomingOrders([]);
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
