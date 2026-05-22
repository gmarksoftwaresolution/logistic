import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

interface OrderContextType {
  incomingOrders: Order[];
  acceptedOrders: Order[];
  deliveredOrders: Order[];
  pendingOrders: Order[];
  rejectedOrders: Order[];
  orders: Order[];
  getStockItems: () => Order[];
  acceptOrder: (order: Order) => void;
  acceptAllOrders: () => void;
  rejectOrder: (order: Order) => void;
  receiveOrder: (order: Order) => void;
  notReceiveOrder: (order: Order) => void;
  deliverOrder: (order: Order) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const MOCK_INCOMING = [
  {
    id: 'inc-1',
    orderId: 'ORD001',
    parcelName: 'Smart LED TV 32 Inch',
    category: 'TV - Electronics',
    categoryBg: 'bg-[#EEF2FF]',
    categoryText: 'text-[#4F46E5]',
    mobile: '8484830180',
    amount: '18,500',
    payment: 'Prepaid',
    address: 'Ch.Shivaji Maharaj Chauk, Chandgad',
    deliveryDay: '1 DAY DELIVERY',
    status: 'assigned',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=400&auto=format&fit=crop',
    transporterName: 'Shreedhar Patil',
    transporterMobile: '9875898598',
    transporterId: 'X6377GH',
    pickupTime: '10:20 AM',
    vehicleNumber: 'X6377GH',
    currentHolder: 'Transporter',
    remainingQty: 4,
    weight: '20',
    time: '25 mins ago'
  },
  {
    id: 'inc-2',
    orderId: 'ORD002',
    parcelName: 'Samsung Double Door Fridge',
    category: 'Fridge - Electric',
    categoryBg: 'bg-[#ECFDF5]',
    categoryText: 'text-[#059669]',
    mobile: '9875898598',
    amount: '32,000',
    payment: 'Online',
    address: 'Main Bazar Road, Gadhinglaj',
    deliveryDay: '1 DAY DELIVERY',
    status: 'assigned',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop',
    transporterName: 'Anil Patil',
    transporterMobile: '8484830180',
    transporterId: 'Y9882HJ',
    pickupTime: '11:00 AM',
    vehicleNumber: 'Y9882HJ',
    currentHolder: 'Transporter',
    remainingQty: 1,
    weight: '12',
    time: '45 mins ago'
  },
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
    time: '1 hr ago'
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
    time: '1 hr ago'
  }
];

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incomingOrders, setIncomingOrders] = useState<Order[]>(MOCK_INCOMING);
  const [acceptedOrders, setAcceptedOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [rejectedOrders, setRejectedOrders] = useState<Order[]>([]);

  // Compute all orders
  const orders = [...incomingOrders, ...acceptedOrders, ...deliveredOrders, ...pendingOrders, ...rejectedOrders];

  const getStockItems = () => {
    return orders.filter(o => o.currentHolder === 'SHG');
  };

  const acceptOrder = (order: Order) => {
    setIncomingOrders(prev => prev.filter(o => o.id !== order.id));
    setAcceptedOrders(prev => [...prev, {
      ...order,
      status: 'Accepted',
      currentHolder: 'SHG',
      acceptedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  const acceptAllOrders = () => {
    const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setAcceptedOrders(prev => [...prev, ...incomingOrders.map(o => ({ ...o, status: 'Accepted', currentHolder: 'SHG', acceptedAt: now }))]);
    setIncomingOrders([]);
  };

  const rejectOrder = (order: Order) => {
    setIncomingOrders(prev => prev.filter(o => o.id !== order.id));
    setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
    setRejectedOrders(prev => {
      if (prev.some(o => o.id === order.id)) return prev;
      return [...prev, {
        ...order,
        status: 'REJECTED',
        rejectedAt: order.rejectedAt || new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        rejectedBy: order.rejectedBy || 'SHG Hub',
      }];
    });
  };

  const receiveOrder = (order: Order) => {
    setAcceptedOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Received', currentHolder: 'SHG' } : o));
  };

  const notReceiveOrder = (order: Order) => {
    setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
    setPendingOrders(prev => [...prev, { ...order, status: 'Pending' }]);
  };

  const deliverOrder = (order: Order) => {
    setAcceptedOrders(prev => prev.filter(o => o.id !== order.id));
    setDeliveredOrders(prev => {
      if (prev.some(o => o.id === order.id)) return prev;
      return [...prev, {
        ...order,
        status: 'COMPLETED',
        completedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      }];
    });
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
      deliverOrder
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
