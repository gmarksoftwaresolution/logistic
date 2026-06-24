import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../utils/api';

// Common structures
export interface PersonDetails {
  name: string;
  mobile: string;
  address: string;
  village?: string;
  pincode?: string;
}

export interface PickupOrder {
  id: string;
  uuid: string;
  sellerName: string;
  sellerMobile: string;
  sellerAddress: string;
  sellerVillage: string;
  sellerPincode: string;
  productCount: number;
  totalQty: number;
  totalWeight: number;
  orderDate: string;
  shgStatus: string;
  transporterStatus: string;
  mainStatus: string;
  status: string;
  created_at: string;
  updated_at: string;
  shgDetails?: PersonDetails;
  shgPickupSchedule?: string;
  transporterDetails?: PersonDetails;
  transporterPickupSchedule?: string;
  barcode?: string;
  currentDate?: string;
  warehouseReceivedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rescheduledBy?: string;
  sectionEnteredAt?: string;
}

export interface DropOrder {
  id: string;
  uuid: string;
  buyerName: string;
  buyerMobile: string;
  buyerAddress: string;
  buyerVillage: string;
  buyerPincode: string;
  productCount: number;
  totalQty: number;
  totalWeight: number;
  shgStatus: string;
  transporterStatus: string;
  mainStatus: string;
  orderDate?: string;
  created_at?: string;
  updated_at?: string;
  sellerName?: string;
  sellerMobile?: string;
  sellerAddress?: string;
  sellerVillage?: string;
  sellerPincode?: string;
  warehouseReceivedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rescheduledBy?: string;
  deliveredDate?: string;
  barcode?: string;
  shgDetails?: PersonDetails;
  shgPickupSchedule?: string;
  transporterDetails?: PersonDetails;
  transporterPickupSchedule?: string;
  status?: string;
  pickupStatus?: string;
  sectionEnteredAt?: string;
}

export interface ReturnOrder {
  id: string;
  uuid: string;
  buyerName: string;
  buyerMobile: string;
  buyerAddress: string;
  buyerVillage: string;
  buyerPincode: string;
  productCount: number;
  totalQty: number;
  totalWeight: number;
  orderDate: string;
  shgStatus: string;
  transporterStatus: string;
  mainStatus: string;
  status: string;
  created_at: string;
  updated_at: string;
  buyerDetails?: PersonDetails;
  shgDetails?: PersonDetails;
  shgPickupSchedule?: string;
  transporterDetails?: PersonDetails;
  transporterPickupSchedule?: string;
  sellerName?: string;
  sellerMobile?: string;
  sellerAddress?: string;
  sellerVillage?: string;
  sellerPincode?: string;
  completionDate?: string;
  barcode?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rescheduledBy?: string;
  sectionEnteredAt?: string;
}

export interface InventoryItem {
  id: string; // Order ID
  uuid: string;
  sellerName: string;
  sellerMobile?: string;
  sellerAddress?: string;
  sellerVillage?: string;
  buyerName: string;
  buyerMobile: string;
  buyerAddress: string;
  buyerVillage?: string;
  productCount: number;
  totalQty: number;
  totalWeight: number;
  status: string;
  shgName?: string;
  shgMobile?: string;
  shgAddress?: string;
  transporterName?: string;
  transporterMobile?: string;
  transporterAddress?: string;
  orderDate?: string;
  barcode?: string;
  storeDate?: string;
  sectionEnteredAt?: string;
}

export interface SHGProfile {
  id: string;
  name: string;
  leader: string;
  mobile: string;
  address: string;
  members: number;
  status: string;
  assignedOrders: number;
}

export interface TransporterProfile {
  id: string;
  name: string;
  mobile: string;
  address: string;
  vehicle: string;
  route: string;
  status: string;
  assignedOrders: number;
}

export interface Counts {
  pickup: {
    new: number;
    assigned: number;
    warehouse: number;
    rejected: number;
    rescheduled: number;
  };
  drop: {
    new: number;
    assigned: number;
    completed: number;
    rejected: number;
    rescheduled: number;
  };
  return: {
    transporter: number;
    buyer: number;
  };
  inventory: {
    stored: number;
    transporterReturn: number;
    buyerReturn: number;
  };
}

export interface AppContextType {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  counts: Counts;
  loadCounts: () => Promise<void>;

  pickupNewOrders: PickupOrder[];
  pickupAssignedOrders: PickupOrder[];
  pickupWarehouseOrders: PickupOrder[];
  pickupRejectedOrders: PickupOrder[];
  pickupRescheduledOrders: PickupOrder[];

  dropNewOrders: DropOrder[];
  dropAssignedOrders: DropOrder[];
  dropRejectedOrders: DropOrder[];
  dropRescheduledOrders: DropOrder[];
  dropCompletedOrders: DropOrder[];

  returnNewOrders: ReturnOrder[];
  returnAssignedOrders: ReturnOrder[];
  returnCompletedOrders: ReturnOrder[];
  returnPickupNewOrders: ReturnOrder[];
  returnPickupCompletedOrders: ReturnOrder[];
  returnDropNewOrders: ReturnOrder[];
  returnDropCompletedOrders: ReturnOrder[];

  incomingInventory: InventoryItem[];
  returnPickupInventory: InventoryItem[];
  dropInventory: InventoryItem[];
  returnDropInventory: InventoryItem[];

  shgList: SHGProfile[];
  transporterList: TransporterProfile[];

  // Action methods
  loadPickupNew: (status?: string, date?: string) => Promise<void>;
  loadPickupAssigned: (status?: string, date?: string) => Promise<void>;
  loadPickupWarehouse: (status?: string, date?: string) => Promise<void>;
  loadPickupRejected: (status?: string, date?: string) => Promise<void>;
  loadPickupRescheduled: (status?: string, date?: string) => Promise<void>;
  loadDropNew: (status?: string, date?: string) => Promise<void>;
  loadDropAssigned: (status?: string, date?: string) => Promise<void>;
  loadDropRejected: (status?: string, date?: string) => Promise<void>;
  loadDropRescheduled: (status?: string, date?: string) => Promise<void>;
  loadDropCompleted: (status?: string, date?: string) => Promise<void>;
  loadReturnsTransporter: (status?: string, date?: string) => Promise<void>;
  loadReturnsBuyer: (status?: string, date?: string) => Promise<void>;
  loadInventoryStored: (status?: string, date?: string) => Promise<void>;
  loadInventoryTransporterReturn: (status?: string, date?: string) => Promise<void>;
  loadInventoryBuyerReturn: (status?: string, date?: string) => Promise<void>;

  readyToStore: (orderId: string) => void;
  dispatchInventory: (orderId: string) => void;
  intakePickupOrders: (orderIds: string[]) => void;
  intakeReturnOrder: (orderId: string, returnType: 'pickup' | 'drop') => void;
  requestBuyerReturn: (dropOrderId: string) => void;
  generateOTP: (orderId: string) => string;
  generateBarcode: (orderId: string) => Promise<string>;
  approveSHG: (id: string) => void;
  approveTransporter: (id: string) => void;
  addNewSHG: (shg: Omit<SHGProfile, 'id' | 'assignedOrders'>) => void;
  addNewTransporter: (transporter: Omit<TransporterProfile, 'id' | 'assignedOrders'>) => void;
  assignPickupOrder: (orderId: string, shgId: string, transporterId: string) => void;
  simulateSHGAction: (orderId: string, type: 'pickup' | 'drop' | 'return-pickup' | 'return-drop', action: 'accept' | 'reject' | 'reschedule' | 'pick' | 'deliver' | 'return-delivered', payload?: any) => void;
  simulateTransporterAction: (orderId: string, type: 'pickup' | 'drop' | 'return-pickup' | 'return-drop', action: 'accept' | 'reject' | 'reschedule' | 'transit' | 'delivered-shg' | 'pickup-from-gmu' | 'shg-not-available' | 'return-to-gmu' | 'deliver-to-gmu' | 'drop-to-gmu', payload?: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const token = localStorage.getItem('gmu_token');
    const savedPage = localStorage.getItem('gmu_hub_current_page');
    if (token) {
      return savedPage && savedPage !== 'landing' ? savedPage : 'dashboard';
    }
    return 'landing';
  });

  const defaultCounts: Counts = {
    pickup: { new: 0, assigned: 0, warehouse: 0, rejected: 0, rescheduled: 0 },
    drop: { new: 0, assigned: 0, completed: 0, rejected: 0, rescheduled: 0 },
    return: { transporter: 0, buyer: 0 },
    inventory: { stored: 0, transporterReturn: 0, buyerReturn: 0 }
  };

  const [counts, setCounts] = useState<Counts>(defaultCounts);

  const loadCounts = async () => {
    try {
      const data = await api.orders.getCounts();
      setCounts(data);
    } catch (e) {
      console.error('Failed to load counts:', e);
    }
  };

  // Lists state
  const [pickupNewOrders, setPickupNewOrders] = useState<PickupOrder[]>([]);
  const [pickupAssignedOrders, setPickupAssignedOrders] = useState<PickupOrder[]>([]);
  const [pickupWarehouseOrders, setPickupWarehouseOrders] = useState<PickupOrder[]>([]);
  const [pickupRejectedOrders, setPickupRejectedOrders] = useState<PickupOrder[]>([]);
  const [pickupRescheduledOrders, setPickupRescheduledOrders] = useState<PickupOrder[]>([]);

  const [dropNewOrders, setDropNewOrders] = useState<DropOrder[]>([]);
  const [dropAssignedOrders, setDropAssignedOrders] = useState<DropOrder[]>([]);
  const [dropRejectedOrders, setDropRejectedOrders] = useState<DropOrder[]>([]);
  const [dropRescheduledOrders, setDropRescheduledOrders] = useState<DropOrder[]>([]);
  const [dropCompletedOrders, setDropCompletedOrders] = useState<DropOrder[]>([]);

  const [returnPickupNewOrders, setReturnPickupNewOrders] = useState<ReturnOrder[]>([]);
  const [returnPickupCompletedOrders, setReturnPickupCompletedOrders] = useState<ReturnOrder[]>([]);
  const [returnDropNewOrders, setReturnDropNewOrders] = useState<ReturnOrder[]>([]);
  const [returnDropCompletedOrders, setReturnDropCompletedOrders] = useState<ReturnOrder[]>([]);

  // Unsupported return fields that must exist to compile
  const [returnNewOrders] = useState<ReturnOrder[]>([]);
  const [returnAssignedOrders] = useState<ReturnOrder[]>([]);

  const [incomingInventory, setIncomingInventory] = useState<InventoryItem[]>([]);
  const [returnPickupInventory, setReturnPickupInventory] = useState<InventoryItem[]>([]);
  const [returnDropInventory, setReturnDropInventory] = useState<InventoryItem[]>([]);
  const [dropInventory] = useState<InventoryItem[]>([]);

  const [shgList, setShgList] = useState<SHGProfile[]>([]);
  const [transporterList, setTransporterList] = useState<TransporterProfile[]>([]);

  const returnCompletedOrders = [
    ...returnPickupCompletedOrders,
    ...returnDropCompletedOrders,
  ];

  // Dynamic details mapping helpers
  const mapOrder = (o: any): any => {
    const shgMember = shgList.find(s => s.id === o.pickupShgId || s.id === o.dropShgId || s.id === o.pickupReturnShgId);
    const shgDetails = shgMember ? {
      name: shgMember.name,
      mobile: shgMember.mobile,
      address: shgMember.address,
    } : undefined;

    const transMember = transporterList.find(t => t.id === o.pickupTransporterId || t.id === o.dropTransporterId || t.id === o.returnTransporterId);
    const transporterDetails = transMember ? {
      name: transMember.name,
      mobile: transMember.mobile,
      address: transMember.address,
    } : undefined;

    const isBuyerReturnFlow = [
      'RETURN_PENDING', 'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED',
      'RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING',
      'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB',
      'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'
    ].includes(o.mainStatus) || o.returnType === 'BUYER_RETURN';

    const isDropOrTransporterReturnFlow = [
      'STORED', 'DISPATCHED', 'DROP_ASSIGNED', 'DROP_SHG_PENDING', 'DROP_SHG_ACCEPTED',
      'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG',
      'DELIVERED', 'COMPLETED', 'ON_HOLD', 'TRANSPORTER_RETURN',
      'TRANSPORTER_RETURN_PENDING', 'TRANSPORTER_RETURN_COMPLETED', 'INVENTORY_TRANSPORTER_RETURN'
    ].includes(o.mainStatus) || o.returnType === 'TRANSPORTER_RETURN';

    const mappedShgStatus = isBuyerReturnFlow
      ? (
          o.mainStatus === 'RETURN_SHG_PENDING'
            ? 'pending'
            : o.mainStatus === 'RETURN_SHG_ACCEPTED'
              ? 'accepted'
              : [
                  'RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING',
                  'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB',
                  'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'
                ].includes(o.mainStatus)
                ? 'picked'
                : null
        )
      : isDropOrTransporterReturnFlow
        ? (o.dropTransporterStatus === 'SHG_NOT_AVAILABLE' ? 'shg not available' : (o.dropShgStatus || null))
        : (
            o.mainStatus === 'PICKUP_ASSIGNED' && o.pickupShgStatus
              ? o.pickupShgStatus
              : ['PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED'].includes(o.mainStatus)
                ? (o.pickupShgStatus || 'pending')
                : null
          );

    const mappedTransporterStatus = isBuyerReturnFlow
      ? (
          o.mainStatus === 'RETURN_TRANSPORTER_PENDING'
            ? 'pending'
            : o.mainStatus === 'RETURN_TRANSPORTER_ACCEPTED'
              ? 'accepted'
              : o.mainStatus === 'RETURN_IN_TRANSIT_TO_HUB'
                ? 'in_transit_to_hub'
                : ['BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(o.mainStatus)
                  ? 'delivered_to_gmu'
                  : null
        )
      : isDropOrTransporterReturnFlow
        ? (o.dropTransporterStatus || null)
        : (
            o.mainStatus === 'PICKUP_ASSIGNED' && o.pickupTransporterStatus
              ? o.pickupTransporterStatus
              : ['TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'TRANSPORTER_DECLINED'].includes(o.mainStatus)
                ? (o.pickupTransporterStatus || 'pending')
                : null
          );

    return {
      id: o.orderId,
      uuid: o.id,
      sellerName: o.sellerName,
      sellerMobile: o.sellerMobile,
      sellerAddress: [o.sellerHouseNo, o.sellerAddress, o.sellerVillage, o.sellerTaluka, o.sellerDistrict, o.sellerState, o.sellerPincode].filter(Boolean).join(', '),
      sellerVillage: o.sellerVillage,
      sellerPincode: o.sellerPincode,
      buyerName: o.buyerName,
      buyerMobile: o.buyerMobile,
      buyerAddress: [o.buyerHouseNo, o.buyerAddress, o.buyerVillage, o.buyerTaluka, o.buyerDistrict, o.buyerState, o.buyerPincode].filter(Boolean).join(', '),
      buyerVillage: o.buyerVillage,
      buyerPincode: o.buyerPincode,
      productCount: o.productCount,
      totalQty: o.totalQty,
      totalWeight: o.totalWeight,
      orderDate: o.createdAt ? o.createdAt.split('T')[0] : '-',
      shgStatus: mappedShgStatus,
      transporterStatus: mappedTransporterStatus,
      mainStatus: o.mainStatus,
      status: o.mainStatus,
      created_at: o.createdAt ? o.createdAt.replace('T', ' ').substring(0, 16) : '',
      updated_at: o.updatedAt ? o.updatedAt.replace('T', ' ').substring(0, 16) : '',
      shgDetails,
      shgPickupSchedule: o.rescheduledAt && o.rescheduleType?.includes('SHG') ? o.rescheduledAt.replace('T', ' ').substring(0, 16) : 'Tomorrow, 10:00 AM',
      transporterDetails,
      transporterPickupSchedule: o.rescheduledAt && o.rescheduleType?.includes('TRANSPORTER') ? o.rescheduledAt.replace('T', ' ').substring(0, 16) : 'Tomorrow, 12:00 PM',
      barcode: o.barcode || undefined,
      warehouseReceivedDate: o.warehouseReceivedAt ? o.warehouseReceivedAt.split('T')[0] : undefined,
      storedDate: o.storedAt ? o.storedAt.split('T')[0] : undefined,
      storeDate: o.storedAt ? o.storedAt.split('T')[0] : undefined,
      sectionEnteredAt: o.updatedAt || o.createdAt,
      rejectionReason: o.assignments?.find((a: any) => a.status === 'REJECTED')?.rejectionReason || 'Rejected by partner',
      rejectedBy: o.assignments?.find((a: any) => a.status === 'REJECTED')?.assigneeType || 'SHG',
      rescheduledBy: o.rescheduleType || 'SHG',
    };
  };

  const mapInventory = (o: any): InventoryItem => {
    const mapped = mapOrder(o);
    return {
      id: mapped.id,
      uuid: mapped.uuid,
      sellerName: mapped.sellerName,
      sellerMobile: mapped.sellerMobile,
      sellerAddress: mapped.sellerAddress,
      sellerVillage: mapped.sellerVillage,
      buyerName: mapped.buyerName,
      buyerMobile: mapped.buyerMobile,
      buyerAddress: mapped.buyerAddress,
      buyerVillage: mapped.buyerVillage,
      productCount: mapped.productCount,
      totalQty: mapped.totalQty,
      totalWeight: mapped.totalWeight,
      status: o.mainStatus || 'STORED',
      shgName: mapped.shgDetails?.name,
      shgMobile: mapped.shgDetails?.mobile,
      shgAddress: mapped.shgDetails?.address,
      transporterName: mapped.transporterDetails?.name,
      transporterMobile: mapped.transporterDetails?.mobile,
      transporterAddress: mapped.transporterDetails?.address,
      orderDate: mapped.orderDate,
      barcode: mapped.barcode,
      storeDate: mapped.storeDate,
      sectionEnteredAt: mapped.sectionEnteredAt,
    };
  };

  // Partners lists fetching on mount
  const fetchPartners = async () => {
    try {
      const shgMembers = await api.community.getShgMembers();
      const mappedShgs = shgMembers.map((item: any) => ({
        id: item.id,
        name: item.shgName || item.fullName,
        leader: item.leaderName || item.fullName,
        mobile: item.mobileNumber,
        address: [item.houseNo, item.deliveryAddress, item.village, item.pincode].filter(Boolean).join(', '),
        members: item.groupSize || 0,
        status: item.status === 'APPROVED' ? 'Active' : item.status === 'PENDING' ? 'Pending' : 'Inactive',
        assignedOrders: 0,
      }));
      setShgList(mappedShgs);

      const routePartners = await api.transporters.getRoutePartnerMembers();
      const personal = await api.transporters.getPersonalMembers();
      const mappedTransporters = [...routePartners, ...personal].map((item: any) => ({
        id: item.id,
        name: `${item.firstName} ${item.lastName}`,
        mobile: item.mobileNumber,
        address: [item.residentialAddress, item.village, item.pincode].filter(Boolean).join(', '),
        vehicle: item.vehicleType || 'N/A',
        route: [item.village, item.pincode].filter(Boolean).join(', '),
        status: item.status === 'APPROVED' ? 'Available' : item.status === 'PENDING' ? 'Pending' : 'Inactive',
        assignedOrders: 0,
      }));
      setTransporterList(mappedTransporters);
    } catch (e) {
      console.error('Failed to load SHG/Transporter partners list:', e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('gmu_token');
    if (token && currentPage !== 'landing') {
      fetchPartners();
      loadCounts();
    }
  }, [currentPage]);

  // API Load functions implementation
  const loadPickupNew = async (status?: string, date?: string) => {
    const data = await api.orders.getPickupNew(status, date);
    setPickupNewOrders(data.map(mapOrder));
  };

  const loadPickupAssigned = async (status?: string, date?: string) => {
    const data = await api.orders.getPickupAssigned(status, date);
    setPickupAssignedOrders(data.map(mapOrder));
  };

  const loadPickupWarehouse = async (status?: string, date?: string) => {
    const data = await api.orders.getPickupWarehouse(status, date);
    setPickupWarehouseOrders(data.map(mapOrder));
  };

  const loadPickupRejected = async (status?: string, date?: string) => {
    const data = await api.orders.getPickupRejected(status, date);
    setPickupRejectedOrders(data.map(mapOrder));
  };

  const loadPickupRescheduled = async (status?: string, date?: string) => {
    const data = await api.orders.getPickupRescheduled(status, date);
    setPickupRescheduledOrders(data.map(mapOrder));
  };

  const loadDropNew = async (status?: string, date?: string) => {
    const data = await api.orders.getDropNew(status, date);
    setDropNewOrders(data.map(mapOrder));
  };

  const loadDropAssigned = async (status?: string, date?: string) => {
    const data = await api.orders.getDropAssigned(status, date);
    setDropAssignedOrders(data.map(mapOrder));
  };

  const loadDropRejected = async (status?: string, date?: string) => {
    const data = await api.orders.getDropRejected(status, date);
    setDropRejectedOrders(data.map(mapOrder));
  };

  const loadDropRescheduled = async (status?: string, date?: string) => {
    const data = await api.orders.getDropRescheduled(status, date);
    setDropRescheduledOrders(data.map(mapOrder));
  };

  const loadDropCompleted = async (status?: string, date?: string) => {
    const data = await api.orders.getDropCompleted(status, date);
    setDropCompletedOrders(data.map(mapOrder));
  };

  const loadReturnsTransporter = async (status?: string, date?: string) => {
    const data = await api.orders.getReturnsTransporter(status, date);
    const mapped = data.map(mapOrder);
    setReturnDropNewOrders(mapped.filter((o: any) => o.mainStatus === 'TRANSPORTER_RETURN_PENDING'));
    setReturnDropCompletedOrders(mapped.filter((o: any) => o.mainStatus === 'TRANSPORTER_RETURN_COMPLETED'));
  };

  const loadReturnsBuyer = async (status?: string, date?: string) => {
    const data = await api.orders.getReturnsBuyer(status, date);
    const mapped = data.map(mapOrder);
    setReturnPickupNewOrders(mapped.filter((o: any) => !['BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'COMPLETED', 'RETURN_COMPLETED'].includes(o.mainStatus)));
    setReturnPickupCompletedOrders(mapped.filter((o: any) => o.mainStatus === 'BUYER_RETURN_COMPLETED'));
  };

  const loadInventoryStored = async (status?: string, date?: string) => {
    const data = await api.orders.getInventoryStored(status, date);
    setIncomingInventory(data.map(mapInventory));
  };

  const loadInventoryTransporterReturn = async (status?: string, date?: string) => {
    const data = await api.orders.getInventoryTransporterReturn(status, date);
    setReturnDropInventory(data.map(mapInventory));
  };

  const loadInventoryBuyerReturn = async (status?: string, date?: string) => {
    const data = await api.orders.getInventoryBuyerReturn(status, date);
    setReturnPickupInventory(data.map(mapInventory));
  };

  // Actions transition implementation
  const readyToStore = async (orderId: string) => {
    const order = pickupWarehouseOrders.find((o) => o.id === orderId) as any;
    await api.orders.store(order?.uuid || orderId);
    await loadCounts();
  };

  const dispatchInventory = async (orderId: string) => {
    const isTransporterReturn = returnDropInventory.some((item) => item.id === orderId);
    if (isTransporterReturn) {
      const order = returnDropInventory.find((item) => item.id === orderId) as any;
      await api.orders.transporterReturnDispatch(order?.uuid || orderId, order?.barcode || '');
    } else {
      const item = incomingInventory.find((item) => item.id === orderId) as any;
      if (item) {
        await api.orders.scan(item.uuid || orderId, item.barcode || '');
      }
    }
    await loadCounts();
  };

  const intakePickupOrders = async (orderIds: string[]) => {
    for (const id of orderIds) {
      const order = pickupAssignedOrders.find((o) => o.id === id) as any;
      await api.orders.warehouseIntake(order?.uuid || id);
    }
    await loadCounts();
  };

  const intakeReturnOrder = async (orderId: string, returnType: 'pickup' | 'drop') => {
    if (returnType === 'drop') {
      const order = returnDropNewOrders.find((o) => o.id === orderId) as any;
      await api.orders.transporterReturnIntake(order?.uuid || orderId);
    } else {
      const order = (returnPickupNewOrders.find((o) => o.id === orderId) || returnPickupCompletedOrders.find((o) => o.id === orderId)) as any;
      await api.orders.buyerReturnIntake(order?.uuid || orderId);
    }
    await loadCounts();
  };

  const requestBuyerReturn = async (dropOrderId: string) => {
    const order = dropCompletedOrders.find((o) => o.id === dropOrderId) as any;
    await api.orders.requestBuyerReturn(order?.uuid || dropOrderId);
    await loadCounts();
  };

  const generateOTP = (orderId: string) => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const generateBarcode = async (orderId: string) => {
    const order = pickupWarehouseOrders.find((o) => o.id === orderId) as any;
    const uuid = order?.uuid || orderId;
    const res = await api.orders.generateBarcode(uuid);
    await api.orders.store(uuid);
    await loadCounts();
    return res.barcode || `BAR-ORD-${orderId}`;
  };

  const approveSHG = (id: string) => {
    api.community.approve(id).then(() => fetchPartners());
  };

  const approveTransporter = (id: string) => {
    api.transporters.approve(id).then(() => fetchPartners());
  };

  const addNewSHG = (shg: Omit<SHGProfile, 'id' | 'assignedOrders'>) => {
    // Unsupported / not required by task, keep stub
  };

  const addNewTransporter = (transporter: Omit<TransporterProfile, 'id' | 'assignedOrders'>) => {
    // Unsupported / not required by task, keep stub
  };

  const assignPickupOrder = async (orderId: string, shgId: string, transporterId: string) => {
    const order = pickupNewOrders.find((o) => o.id === orderId) as any;
    const uuid = order?.uuid || orderId;
    await api.orders.shgAccept(uuid, shgId);
    await api.orders.broadcastTransporter(uuid);
    await api.orders.transporterAccept(uuid, transporterId);
    await loadCounts();
  };

  // Simulations implementation
  const simulateSHGAction = async (
    orderId: string,
    type: 'pickup' | 'drop' | 'return-pickup' | 'return-drop',
    action: 'accept' | 'reject' | 'reschedule' | 'pick' | 'deliver' | 'return-delivered',
    payload?: any
  ) => {
    const findUuid = (list: any[]) => {
      const found = list.find((o) => o.id === orderId);
      return found?.uuid || found?.id || orderId;
    };

    let uuid = orderId;
    const defaultShg = shgList[0] || { id: 'SHG-101' };

    if (type === 'pickup') {
      uuid = findUuid(pickupNewOrders.concat(pickupAssignedOrders).concat(pickupRejectedOrders).concat(pickupRescheduledOrders));
    } else if (type === 'drop') {
      uuid = findUuid(dropNewOrders.concat(dropAssignedOrders).concat(dropRejectedOrders).concat(dropRescheduledOrders));
    } else if (type === 'return-pickup') {
      uuid = findUuid(returnPickupNewOrders.concat(returnPickupCompletedOrders));
    } else if (type === 'return-drop') {
      uuid = findUuid(returnDropNewOrders.concat(returnDropCompletedOrders));
    }

    let shgId = defaultShg.id;
    try {
      const orderDetails = await api.orders.getDetails(uuid);
      const pendingAssignment = orderDetails?.assignments?.find(
        (a: any) => a.assigneeType === 'SHG' && a.status === 'PENDING'
      );
      if (pendingAssignment) {
        shgId = pendingAssignment.assigneeId;
      }
    } catch (e) {
      console.warn('Failed to fetch order details for simulation, falling back to default SHG:', e);
    }

    if (type === 'pickup') {
      if (action === 'accept') {
        await api.orders.shgAccept(uuid, shgId);
      } else if (action === 'reject') {
        await api.orders.shgReject(uuid, shgId);
      } else if (action === 'reschedule') {
        await api.orders.shgReschedule(uuid, shgId, payload?.duration || '24 HOURS');
      } else if (action === 'pick') {
        await api.orders.shgPicked(uuid);
      }
    } else if (type === 'drop') {
      if (action === 'accept') {
        await api.orders.dropShgAccept(uuid, shgId);
      } else if (action === 'reject') {
        await api.orders.dropShgReject(uuid, shgId);
      } else if (action === 'reschedule') {
        await api.orders.dropShgReschedule(uuid, shgId, payload?.duration || '24 HOURS');
      } else if (action === 'deliver') {
        await api.orders.dropComplete(uuid);
      }
    } else if (type === 'return-pickup') {
      if (action === 'accept') {
        await api.orders.buyerReturnShgAccept(uuid);
      } else if (action === 'pick') {
        await api.orders.buyerReturnShgPicked(uuid);
      }
    } else if (type === 'return-drop') {
      if (action === 'accept') {
        await api.orders.dropShgAccept(uuid, shgId);
      } else if (action === 'reject') {
        await api.orders.dropShgReject(uuid, shgId);
      } else if (action === 'return-delivered') {
        await api.orders.dropComplete(uuid);
      }
    }
    await loadCounts();
  };

  const simulateTransporterAction = async (
    orderId: string,
    type: 'pickup' | 'drop' | 'return-pickup' | 'return-drop',
    action: 'accept' | 'reject' | 'reschedule' | 'transit' | 'delivered-shg' | 'pickup-from-gmu' | 'shg-not-available' | 'return-to-gmu' | 'deliver-to-gmu' | 'drop-to-gmu',
    payload?: any
  ) => {
    const findUuid = (list: any[]) => {
      const found = list.find((o) => o.id === orderId);
      return found?.uuid || found?.id || orderId;
    };

    let uuid = orderId;
    const defaultTransporter = transporterList[0] || { id: 'TRN-201' };

    if (type === 'pickup') {
      uuid = findUuid(pickupAssignedOrders.concat(pickupRejectedOrders).concat(pickupRescheduledOrders));
    } else if (type === 'drop') {
      uuid = findUuid(dropAssignedOrders.concat(dropRejectedOrders).concat(dropRescheduledOrders));
    } else if (type === 'return-pickup') {
      uuid = findUuid(returnPickupNewOrders.concat(returnPickupCompletedOrders));
    } else if (type === 'return-drop') {
      uuid = findUuid(returnDropNewOrders.concat(returnDropCompletedOrders));
    }

    let transporterId = defaultTransporter.id;
    try {
      const orderDetails = await api.orders.getDetails(uuid);
      const pendingAssignment = orderDetails?.assignments?.find(
        (a: any) => a.assigneeType === 'TRANSPORTER' && a.status === 'PENDING'
      );
      if (pendingAssignment) {
        transporterId = pendingAssignment.assigneeId;
      }
    } catch (e) {
      console.warn('Failed to fetch order details for simulation, falling back to default transporter:', e);
    }

    if (type === 'pickup') {
      if (action === 'accept') {
        await api.orders.transporterAccept(uuid, transporterId);
      } else if (action === 'reject') {
        await api.orders.transporterReject(uuid, transporterId);
      } else if (action === 'reschedule') {
        await api.orders.transporterReschedule(uuid, transporterId);
      } else if (action === 'transit') {
        await api.orders.transporterPicked(uuid);
      }
    } else if (type === 'drop') {
      if (action === 'accept') {
        await api.orders.dropTransporterAccept(uuid, transporterId);
      } else if (action === 'reject') {
        await api.orders.dropTransporterReject(uuid, transporterId);
      } else if (action === 'reschedule') {
        await api.orders.dropTransporterReschedule(uuid, transporterId);
      } else if (action === 'delivered-shg') {
        await api.orders.dropTransporterDropsToShg(uuid);
      } else if (action === 'shg-not-available') {
        await api.orders.createTransporterReturn(uuid);
      }
    } else if (type === 'return-pickup') {
      if (action === 'accept') {
        await api.orders.buyerReturnTransporterAccept(uuid, transporterId);
      } else if (action === 'transit') {
        await api.orders.buyerReturnTransporterPicked(uuid);
      } else if (action === 'deliver-to-gmu') {
        await api.orders.buyerReturnTransporterDelivered(uuid);
      }
    } else if (type === 'return-drop') {
      if (action === 'accept') {
        await api.orders.dropTransporterAccept(uuid, transporterId);
      } else if (action === 'delivered-shg') {
        await api.orders.dropTransporterDropsToShg(uuid);
      } else if (action === 'return-to-gmu' || action === 'drop-to-gmu') {
        await api.orders.transporterReturnIntake(uuid);
      }
    }
    await loadCounts();
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        counts,
        loadCounts,
        pickupNewOrders,
        pickupAssignedOrders,
        pickupWarehouseOrders,
        pickupRejectedOrders,
        pickupRescheduledOrders,
        dropNewOrders,
        dropAssignedOrders,
        dropRejectedOrders,
        dropRescheduledOrders,
        dropCompletedOrders,
        returnNewOrders,
        returnAssignedOrders,
        returnCompletedOrders,
        returnPickupNewOrders,
        returnPickupCompletedOrders,
        returnDropNewOrders,
        returnDropCompletedOrders,
        incomingInventory,
        returnPickupInventory,
        dropInventory,
        returnDropInventory,
        shgList,
        transporterList,

        loadPickupNew,
        loadPickupAssigned,
        loadPickupWarehouse,
        loadPickupRejected,
        loadPickupRescheduled,
        loadDropNew,
        loadDropAssigned,
        loadDropRejected,
        loadDropRescheduled,
        loadDropCompleted,
        loadReturnsTransporter,
        loadReturnsBuyer,
        loadInventoryStored,
        loadInventoryTransporterReturn,
        loadInventoryBuyerReturn,

        readyToStore,
        dispatchInventory,
        intakePickupOrders,
        intakeReturnOrder,
        requestBuyerReturn,
        generateOTP,
        generateBarcode,
        approveSHG,
        approveTransporter,
        addNewSHG,
        addNewTransporter,
        assignPickupOrder,
        simulateSHGAction,
        simulateTransporterAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
