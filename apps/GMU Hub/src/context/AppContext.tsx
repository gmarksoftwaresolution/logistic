import React, { createContext, useState, useContext } from 'react';

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
  sellerName: string;
  sellerMobile: string;
  sellerAddress: string;
  sellerVillage: string;
  sellerPincode: string;
  productCount: number;
  totalQty: number;
  totalWeight: number;
  orderDate: string;
  shgStatus: string; // pending, pending-acceptance, Accepted, picked, assigned
  transporterStatus: string; // pending, pending-acceptance, not assigned, Accepted, picked, assigned
  mainStatus: string; // pending, pending-acceptance, pickup assigned, pickup shg accepted, parcel at shg, transporter accepted, in transit to hub, at hub
  status: string; // active status identifier
  created_at: string;
  updated_at: string;
  // Assigned specifics
  shgDetails?: PersonDetails;
  shgPickupSchedule?: string;
  transporterDetails?: PersonDetails;
  transporterPickupSchedule?: string;
  // Warehouse specifics
  currentDate?: string;
  warehouseReceivedDate?: string;
  rejectedDate?: string;
}

export interface DropOrder {
  id: string;
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
  deliveredDate?: string;
  barcode?: string;
  shgDetails?: PersonDetails;
  shgPickupSchedule?: string;
  transporterDetails?: PersonDetails;
  transporterPickupSchedule?: string;
  status?: string;
}

export interface ReturnOrder {
  id: string;
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
  // Assigned specifics
  buyerDetails?: PersonDetails;
  shgDetails?: PersonDetails;
  shgPickupSchedule?: string;
  transporterDetails?: PersonDetails;
  transporterPickupSchedule?: string;
  // Seller details
  sellerName?: string;
  sellerMobile?: string;
  sellerAddress?: string;
  sellerVillage?: string;
  sellerPincode?: string;
  // Completed specifics
  completionDate?: string;
  barcode?: string;
}

export interface InventoryItem {
  id: string; // Order ID
  sellerName: string;
  sellerMobile?: string;
  sellerVillage?: string;
  buyerName: string;
  buyerMobile: string;
  buyerAddress: string;
  buyerVillage?: string;
  productCount: number;
  totalQty: number;
  totalWeight: number;
  status: string; // stored, dispatch, returned, pending, pending acceptance
  // Return Pickup Specifics
  shgName?: string;
  shgMobile?: string;
  shgAddress?: string;
  transporterName?: string;
  transporterMobile?: string;
  transporterAddress?: string;
  orderDate?: string;
  barcode?: string;
  storeDate?: string;
}

export interface SHGProfile {
  id: string;
  name: string;
  leader: string;
  mobile: string;
  address: string;
  members: number;
  status: string; // Active / Inactive / Pending
  assignedOrders: number;
}

export interface TransporterProfile {
  id: string;
  name: string;
  mobile: string;
  address: string;
  vehicle: string;
  route: string;
  status: string; // Available / Busy / Inactive
  assignedOrders: number;
}

export interface AppContextType {
  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // Pickup Orders state
  pickupNewOrders: PickupOrder[];
  pickupAssignedOrders: PickupOrder[];
  pickupWarehouseOrders: PickupOrder[];
  pickupRejectedOrders: PickupOrder[];
  pickupRescheduledOrders: PickupOrder[];

  // Drop Orders state
  dropNewOrders: DropOrder[];
  dropAssignedOrders: DropOrder[];
  dropRejectedOrders: DropOrder[];
  dropRescheduledOrders: DropOrder[];
  dropCompletedOrders: DropOrder[];

  // Return Orders state
  returnNewOrders: ReturnOrder[];
  returnAssignedOrders: ReturnOrder[];
  returnCompletedOrders: ReturnOrder[];
  returnPickupNewOrders: ReturnOrder[];
  returnPickupCompletedOrders: ReturnOrder[];
  returnDropNewOrders: ReturnOrder[];
  returnDropCompletedOrders: ReturnOrder[];

  // Inventory Management state
  incomingInventory: InventoryItem[];
  returnPickupInventory: InventoryItem[];
  dropInventory: InventoryItem[];
  returnDropInventory: InventoryItem[];

  // Partners Profiles
  shgList: SHGProfile[];
  transporterList: TransporterProfile[];

  // Actions
  readyToStore: (orderId: string) => void;
  dispatchInventory: (orderId: string) => void;
  generateOTP: (orderId: string) => string;
  generateBarcode: (orderId: string) => string;
  approveSHG: (id: string) => void;
  approveTransporter: (id: string) => void;
  addNewSHG: (shg: Omit<SHGProfile, 'id' | 'assignedOrders'>) => void;
  addNewTransporter: (transporter: Omit<TransporterProfile, 'id' | 'assignedOrders'>) => void;
  assignPickupOrder: (orderId: string, shgId: string, transporterId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- MOCK DATA ---

  // 1. Pickup Orders
  const [pickupNewOrders, setPickupNewOrders] = useState<PickupOrder[]>([
    {
      id: 'ORD-PICK-101',
      sellerName: 'Ramesh Agro Farms',
      sellerMobile: '9876543201',
      sellerAddress: 'Gat No. 12, Junnar Village',
      sellerVillage: 'Junnar',
      sellerPincode: '410502',
      productCount: 3,
      totalQty: 120,
      totalWeight: 240,
      orderDate: '2026-06-12',
      shgStatus: 'pending',
      transporterStatus: 'pending',
      mainStatus: 'pending',
      status: 'pending',
      created_at: '2026-06-12 10:00',
      updated_at: '2026-06-12 10:00',
    },
    {
      id: 'ORD-PICK-102',
      sellerName: 'Savita Organic Honey',
      sellerMobile: '9876543202',
      sellerAddress: 'Ward 2, Shirur Block',
      sellerVillage: 'Shirur',
      sellerPincode: '412210',
      productCount: 1,
      totalQty: 50,
      totalWeight: 75,
      orderDate: '2026-06-13',
      shgStatus: 'pending-acceptance',
      transporterStatus: 'pending',
      mainStatus: 'pending-acceptance',
      status: 'pending-acceptance',
      created_at: '2026-06-13 08:30',
      updated_at: '2026-06-13 08:30',
    },
  ]);

  const [pickupAssignedOrders, setPickupAssignedOrders] = useState<PickupOrder[]>([
    {
      id: 'ORD-PICK-201',
      sellerName: 'Baliraja Rice Mill',
      sellerMobile: '9876543203',
      sellerAddress: 'Market Yard Road, Manchar',
      sellerVillage: 'Manchar',
      sellerPincode: '410503',
      productCount: 2,
      totalQty: 200,
      totalWeight: 500,
      orderDate: '2026-06-11',
      shgStatus: 'Accepted',
      transporterStatus: 'Accepted',
      mainStatus: 'transporter accepted',
      status: 'pickup shg accepted',
      created_at: '2026-06-11 09:00',
      updated_at: '2026-06-11 14:00',
      shgDetails: { name: 'Manchar Mahila SHG', mobile: '9158098765', address: 'Gram Panchayat Road, Manchar' },
      shgPickupSchedule: '2026-06-14 10:00 AM',
      transporterDetails: { name: 'Rajesh Kumar', mobile: '9876543220', address: 'Plot 45, MIDC Area' },
      transporterPickupSchedule: '2026-06-14 11:30 AM',
    },
    {
      id: 'ORD-PICK-202',
      sellerName: 'Kalyani SHG Crafts',
      sellerMobile: '9876543204',
      sellerAddress: 'Opposite Maruti Temple, Junnar',
      sellerVillage: 'Junnar',
      sellerPincode: '410502',
      productCount: 4,
      totalQty: 80,
      totalWeight: 120,
      orderDate: '2026-06-12',
      shgStatus: 'picked',
      transporterStatus: 'Accepted',
      mainStatus: 'in transit to hub',
      status: 'parcel at shg',
      created_at: '2026-06-12 11:00',
      updated_at: '2026-06-13 12:00',
      shgDetails: { name: 'Savitri Co-op', mobile: '9876543213', address: 'Village D, Junnar' },
      shgPickupSchedule: '2026-06-13 09:00 AM',
      transporterDetails: { name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub' },
      transporterPickupSchedule: '2026-06-13 10:30 AM',
    },
  ]);

  const [pickupWarehouseOrders, setPickupWarehouseOrders] = useState<PickupOrder[]>([
    {
      id: 'ORD-PICK-301',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      productCount: 2,
      totalQty: 150,
      totalWeight: 300,
      orderDate: '2026-06-10',
      shgStatus: 'picked',
      transporterStatus: 'picked',
      mainStatus: 'at hub',
      status: 'hub received',
      created_at: '2026-06-10 14:00',
      updated_at: '2026-06-11 16:30',
      currentDate: '2026-06-13',
      warehouseReceivedDate: '2026-06-12',
      shgDetails: { name: 'Anita Mahila SHG', mobile: '9158098766', address: 'Gram Panchayat Road, Indapur' },
      shgPickupSchedule: '2026-06-12 10:00 AM',
      transporterDetails: { name: 'Sunil Transport', mobile: '9876543224', address: 'MIDC Road, Indapur' },
      transporterPickupSchedule: '2026-06-12 11:30 AM',
    },
    {
      id: 'ORD-PICK-302',
      sellerName: 'Sita Weaving Center',
      sellerMobile: '9876543206',
      sellerAddress: 'Village B, Shirur Block',
      sellerVillage: 'Shirur',
      sellerPincode: '412210',
      productCount: 1,
      totalQty: 45,
      totalWeight: 90,
      orderDate: '2026-06-11',
      shgStatus: 'picked',
      transporterStatus: 'picked',
      mainStatus: 'at hub',
      status: 'Barcode Generated',
      created_at: '2026-06-11 15:30',
      updated_at: '2026-06-12 11:00',
      currentDate: '2026-06-13',
      warehouseReceivedDate: '2026-06-13',
      shgDetails: { name: 'Sita Co-op SHG', mobile: '9158098767', address: 'Ward 2, Shirur Block' },
      shgPickupSchedule: '2026-06-13 10:00 AM',
      transporterDetails: { name: 'Fast Movers', mobile: '9876543223', address: 'Logistics Park, Karjat' },
      transporterPickupSchedule: '2026-06-13 11:30 AM',
    },
  ]);

  const [pickupRejectedOrders, setPickupRejectedOrders] = useState<PickupOrder[]>([
    {
      id: 'ORD-PICK-REJ-01',
      sellerName: 'Hari Wood Crafts',
      sellerMobile: '9876543207',
      sellerAddress: 'Village A, Karjat Road',
      sellerVillage: 'Karjat',
      sellerPincode: '410201',
      productCount: 5,
      totalQty: 15,
      totalWeight: 150,
      orderDate: '2026-06-09',
      shgStatus: 'pending',
      transporterStatus: 'pending',
      mainStatus: 'pending',
      status: 'pending',
      created_at: '2026-06-09 10:00',
      updated_at: '2026-06-09 12:00',
      rejectedDate: '2026-06-10',
    },
  ]);

  const [pickupRescheduledOrders, setPickupRescheduledOrders] = useState<PickupOrder[]>([
    {
      id: 'ORD-PICK-RES-01',
      sellerName: 'Baliraja Rice Mill',
      sellerMobile: '9876543203',
      sellerAddress: 'Market Yard Road, Manchar',
      sellerVillage: 'Manchar',
      sellerPincode: '410503',
      productCount: 1,
      totalQty: 90,
      totalWeight: 180,
      orderDate: '2026-06-11',
      shgStatus: 'Accepted',
      transporterStatus: 'Accepted',
      mainStatus: 'rescheduled',
      status: 'rescheduled',
      created_at: '2026-06-11 09:00',
      updated_at: '2026-06-14 10:00',
      shgDetails: { name: 'Manchar Mahila SHG', mobile: '9158098765', address: 'Gram Panchayat Road, Manchar' },
      shgPickupSchedule: '2026-06-16 10:00 AM (Rescheduled)',
      transporterDetails: { name: 'Rajesh Kumar', mobile: '9876543220', address: 'Plot 45, MIDC Area' },
      transporterPickupSchedule: '2026-06-16 11:30 AM (Rescheduled)',
    }
  ]);

  // 2. Drop Orders
  const [dropNewOrders, setDropNewOrders] = useState<DropOrder[]>([
    {
      id: 'ORD-DROP-101',
      buyerName: 'Urban Supermart Pune',
      buyerMobile: '9988776651',
      buyerAddress: 'FC Road, Shivajinagar, Pune',
      buyerVillage: 'Pune',
      buyerPincode: '411005',
      productCount: 3,
      totalQty: 120,
      totalWeight: 240,
      shgStatus: 'pending',
      transporterStatus: 'pending',
      mainStatus: 'shg_pending_acceptance',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      orderDate: '2026-06-12',
      barcode: 'BAR-ORD-DROP-101-3937',
    },
    {
      id: 'ORD-DROP-102',
      buyerName: 'Fresh Mandi Mumbai',
      buyerMobile: '9988776652',
      buyerAddress: 'Crawford Market, Mumbai',
      buyerVillage: 'Mumbai',
      buyerPincode: '400001',
      productCount: 2,
      totalQty: 90,
      totalWeight: 180,
      shgStatus: 'pending-acceptance',
      transporterStatus: 'pending',
      mainStatus: 'shg_pending_acceptance',
      sellerName: 'Sita Weaving Center',
      sellerMobile: '9876543206',
      sellerAddress: 'Village B, Shirur Block',
      sellerVillage: 'Shirur',
      sellerPincode: '412210',
      orderDate: '2026-06-13',
      barcode: 'BAR-ORD-DROP-102-1829',
    },
  ]);

  const [dropAssignedOrders, setDropAssignedOrders] = useState<DropOrder[]>([
    {
      id: 'ORD-DROP-201',
      buyerName: 'Gramin Mandi Mumbai',
      buyerMobile: '9988776653',
      buyerAddress: 'Shop 15, Vashi Market, Navi Mumbai',
      buyerVillage: 'Navi Mumbai',
      buyerPincode: '400703',
      productCount: 1,
      totalQty: 100,
      totalWeight: 200,
      shgStatus: 'Accepted',
      transporterStatus: 'Accepted',
      mainStatus: 'drop shg accepted',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      orderDate: '2026-06-11',
      barcode: 'BAR-ORD-DROP-201-4928',
      shgDetails: { name: 'Nari Shakti Group', mobile: '9876543210', address: 'Village A, Ward 4, Pune' },
      shgPickupSchedule: '2026-06-14 09:30 AM',
      transporterDetails: { name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub, District Pune' },
      transporterPickupSchedule: '2026-06-14 11:00 AM',
    },
  ]);

  const [dropRejectedOrders, setDropRejectedOrders] = useState<DropOrder[]>([
    {
      id: 'ORD-DROP-REJ-01',
      buyerName: 'Green Foods Outlet',
      buyerMobile: '9988776654',
      buyerAddress: 'Main Square Road, Satara',
      buyerVillage: 'Satara',
      buyerPincode: '415001',
      productCount: 2,
      totalQty: 40,
      totalWeight: 80,
      shgStatus: 'pending',
      transporterStatus: 'pending',
      mainStatus: 'pending',
      orderDate: '2026-06-11',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      rejectedDate: '2026-06-12',
      barcode: 'BAR-ORD-DROP-REJ-01-9582',
      shgDetails: { name: 'Savitri Co-op', mobile: '9876543213', address: 'Village D, Junnar' },
      transporterDetails: { name: 'Ravi Logistics', mobile: '9876543222', address: 'Industrial Estate, Phase 1' },
    },
  ]);

  const [dropRescheduledOrders, setDropRescheduledOrders] = useState<DropOrder[]>([
    {
      id: 'ORD-DROP-RES-01',
      buyerName: 'Gramin Mandi Mumbai',
      buyerMobile: '9988776653',
      buyerAddress: 'Shop 15, Vashi Market, Navi Mumbai',
      buyerVillage: 'Navi Mumbai',
      buyerPincode: '400703',
      productCount: 1,
      totalQty: 100,
      totalWeight: 200,
      shgStatus: 'Accepted',
      transporterStatus: 'Accepted',
      mainStatus: 'rescheduled',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      orderDate: '2026-06-11',
      barcode: 'BAR-ORD-DROP-RES-01-6184',
      shgDetails: { name: 'Gramin Vikas SHG', mobile: '9876543211', address: 'Village B, Shirur' },
      shgPickupSchedule: '2026-06-15 10:00 AM (Rescheduled)',
      transporterDetails: { name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub' },
      transporterPickupSchedule: '2026-06-15 11:30 AM (Rescheduled)',
    },
  ]);

  const [dropCompletedOrders, setDropCompletedOrders] = useState<DropOrder[]>([
    {
      id: 'ORD-DROP-CMP-01',
      buyerName: 'Urban Supermart Pune',
      buyerMobile: '9988776651',
      buyerAddress: 'FC Road, Shivajinagar, Pune',
      buyerVillage: 'Pune',
      buyerPincode: '411005',
      productCount: 2,
      totalQty: 60,
      totalWeight: 120,
      shgStatus: 'completed',
      transporterStatus: 'completed',
      mainStatus: 'completed',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      orderDate: '2026-06-08',
      deliveredDate: '2026-06-12',
      barcode: 'BAR-ORD-DROP-CMP-01-7294',
      shgDetails: { name: 'Nari Shakti Group', mobile: '9876543210', address: 'Village A, Ward 4, Pune' },
      shgPickupSchedule: '2026-06-12 09:30 AM',
      transporterDetails: { name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub, District Pune' },
      transporterPickupSchedule: '2026-06-12 11:00 AM',
    },
  ]);

  // 3. Return Orders
  const [returnNewOrders, setReturnNewOrders] = useState<ReturnOrder[]>([
    {
      id: 'ORD-RET-101',
      buyerName: 'Green Grocers Pune',
      buyerMobile: '9123456701',
      buyerAddress: 'Katraj Mandi Area, Pune',
      buyerVillage: 'Pune',
      buyerPincode: '411046',
      productCount: 2,
      totalQty: 30,
      totalWeight: 60,
      orderDate: '2026-06-13',
      shgStatus: 'pending',
      transporterStatus: 'pending',
      mainStatus: 'pending',
      status: 'pending',
      created_at: '2026-06-13 10:00',
      updated_at: '2026-06-13 10:00',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
    },
  ]);

  const [returnAssignedOrders, setReturnAssignedOrders] = useState<ReturnOrder[]>([
    {
      id: 'ORD-RET-201',
      buyerName: 'Health Foods Mumbai',
      buyerMobile: '9123456702',
      buyerAddress: 'Andheri West, Mumbai',
      buyerVillage: 'Mumbai',
      buyerPincode: '400053',
      productCount: 1,
      totalQty: 10,
      totalWeight: 20,
      orderDate: '2026-06-12',
      shgStatus: 'Accepted',
      transporterStatus: 'Accepted',
      mainStatus: 'pickup shg accepted',
      status: 'pickup shg accepted',
      created_at: '2026-06-12 09:00',
      updated_at: '2026-06-13 11:00',
      buyerDetails: { name: 'Health Foods Mumbai', mobile: '9123456702', address: 'Andheri West, Mumbai' },
      shgDetails: { name: 'Nari Shakti Group', mobile: '9876543210', address: 'Village A, Ward 4' },
      shgPickupSchedule: '2026-06-14 09:30 AM',
      transporterDetails: { name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub' },
      transporterPickupSchedule: '2026-06-14 11:00 AM',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      barcode: 'BAR-ORD-RET-201-1829',
    },
  ]);

  const [returnPickupNewOrders, setReturnPickupNewOrders] = useState<ReturnOrder[]>([
    {
      id: 'ORD-RET-201',
      buyerName: 'Health Foods Mumbai',
      buyerMobile: '9123456702',
      buyerAddress: 'Andheri West, Mumbai',
      buyerVillage: 'Mumbai',
      buyerPincode: '400053',
      productCount: 1,
      totalQty: 10,
      totalWeight: 20,
      orderDate: '2026-06-12',
      shgStatus: 'Accepted',
      transporterStatus: 'Accepted',
      mainStatus: 'pickup shg accepted',
      status: 'pickup shg accepted',
      created_at: '2026-06-12 09:00',
      updated_at: '2026-06-13 11:00',
      buyerDetails: { name: 'Health Foods Mumbai', mobile: '9123456702', address: 'Andheri West, Mumbai' },
      shgDetails: { name: 'Nari Shakti Group', mobile: '9876543210', address: 'Village A, Ward 4' },
      shgPickupSchedule: '2026-06-14 09:30 AM',
      transporterDetails: { name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub' },
      transporterPickupSchedule: '2026-06-14 11:00 AM',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      barcode: 'BAR-ORD-RET-201-1829',
    },
  ]);

  const [returnPickupCompletedOrders, setReturnPickupCompletedOrders] = useState<ReturnOrder[]>([
    {
      id: 'ORD-RET-COMP-01',
      buyerName: 'Organic Store Karjat',
      buyerMobile: '9123456703',
      buyerAddress: 'Katraj Mandi Area, Pune',
      buyerVillage: 'Karjat',
      buyerPincode: '410201',
      productCount: 1,
      totalQty: 25,
      totalWeight: 50,
      orderDate: '2026-06-10',
      shgStatus: 'completed',
      transporterStatus: 'completed',
      mainStatus: 'completed',
      status: 'returned',
      created_at: '2026-06-10 11:00',
      updated_at: '2026-06-11 15:00',
      completionDate: '2026-06-11 15:00',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      barcode: 'BAR-ORD-RET-COMP-01-4928',
      shgDetails: { name: 'Manchar Mahila SHG', mobile: '9158098765', address: 'Gram Panchayat Road, Manchar' },
      shgPickupSchedule: '2026-06-11 09:30 AM',
      transporterDetails: { name: 'Rajesh Kumar', mobile: '9876543220', address: 'Plot 45, MIDC Area' },
      transporterPickupSchedule: '2026-06-11 11:00 AM',
    },
  ]);

  const [returnDropNewOrders, setReturnDropNewOrders] = useState<ReturnOrder[]>([
    {
      id: 'ORD-RET-DROP-101',
      buyerName: 'Organic Store Karjat',
      buyerMobile: '9123456703',
      buyerAddress: 'Karjat Center Road',
      buyerVillage: 'Karjat',
      buyerPincode: '410201',
      sellerName: 'Anita Millet Farms',
      sellerMobile: '9876543205',
      sellerAddress: 'Plot 5, Indapur Chowk',
      sellerVillage: 'Indapur',
      sellerPincode: '413106',
      productCount: 1,
      totalQty: 25,
      totalWeight: 50,
      orderDate: '2026-06-11',
      shgStatus: 'Accepted',
      transporterStatus: 'Accepted',
      mainStatus: 'pickup shg accepted',
      status: 'active',
      created_at: '2026-06-11 10:00',
      updated_at: '2026-06-11 10:00',
      barcode: 'BAR-ORD-RET-DROP-101-7281',
      shgDetails: { name: 'Savitri Co-op', mobile: '9876543213', address: 'Village D, Junnar' },
      shgPickupSchedule: '2026-06-14 09:30 AM',
      transporterDetails: { name: 'Rajesh Kumar', mobile: '9876543220', address: 'Plot 45, MIDC Area' },
      transporterPickupSchedule: '2026-06-14 11:00 AM',
    },
  ]);

  const [returnDropCompletedOrders, setReturnDropCompletedOrders] = useState<ReturnOrder[]>([
    {
      id: 'ORD-RET-DROP-CMP-01',
      buyerName: 'Fresh Mandi Mumbai',
      buyerMobile: '9988776652',
      buyerAddress: 'Crawford Market, Mumbai',
      buyerVillage: 'Mumbai',
      buyerPincode: '400001',
      sellerName: 'Sita Weaving Center',
      sellerMobile: '9876543206',
      sellerAddress: 'Village B, Shirur Block',
      sellerVillage: 'Shirur',
      sellerPincode: '412210',
      productCount: 2,
      totalQty: 15,
      totalWeight: 30,
      orderDate: '2026-06-09',
      shgStatus: 'completed',
      transporterStatus: 'completed',
      mainStatus: 'completed',
      status: 'completed',
      created_at: '2026-06-09 11:00',
      updated_at: '2026-06-11 15:00',
      completionDate: '2026-06-11 15:00',
      barcode: 'BAR-ORD-RET-DROP-CMP-01-3829',
      shgDetails: { name: 'Gramin Vikas SHG', mobile: '9876543211', address: 'Village B, Shirur' },
      shgPickupSchedule: '2026-06-11 09:30 AM',
      transporterDetails: { name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub' },
      transporterPickupSchedule: '2026-06-11 11:00 AM',
    },
  ]);

  const returnCompletedOrders = [
    ...returnPickupCompletedOrders,
    ...returnDropCompletedOrders,
  ];

  // 4. Inventory items
  const [incomingInventory, setIncomingInventory] = useState<InventoryItem[]>([
    {
      id: 'ORD-INV-001',
      sellerName: 'Anita Farms',
      sellerMobile: '9876543201',
      sellerVillage: 'Indapur',
      buyerName: 'Metro Supermart',
      buyerMobile: '9876543212',
      buyerAddress: 'City Center, District H',
      buyerVillage: 'Pune',
      productCount: 2,
      totalQty: 100,
      totalWeight: 200,
      status: 'stored',
      orderDate: '2026-06-11',
      shgName: 'Anita Mahila SHG',
      shgMobile: '9158098766',
      shgAddress: 'Gram Panchayat Road, Indapur',
      transporterName: 'Sunil Transport',
      transporterMobile: '9876543224',
      transporterAddress: 'MIDC Road, Indapur',
      barcode: 'BAR-ORD-PICK-301-3937',
      storeDate: '2026-06-12',
    },
    {
      id: 'ORD-INV-002',
      sellerName: 'Gramin Vikas Co-op',
      sellerMobile: '9876543202',
      sellerVillage: 'Shirur',
      buyerName: 'Local Bazaar Pune',
      buyerMobile: '9876543213',
      buyerAddress: 'Hadapsar Market Yard, Pune',
      buyerVillage: 'Pune',
      productCount: 1,
      totalQty: 60,
      totalWeight: 120,
      status: 'dispatch',
      orderDate: '2026-06-12',
      shgName: 'Gramin Vikas SHG',
      shgMobile: '9876543211',
      shgAddress: 'Village B, Ward 2, Shirur',
      transporterName: 'Surya Logistics',
      transporterMobile: '9876543221',
      transporterAddress: 'Highway Hub, District Pune',
      barcode: 'BAR-ORD-PICK-302-2849',
      storeDate: '2026-06-13',
    },
  ]);

  const [returnPickupInventory, setReturnPickupInventory] = useState<InventoryItem[]>([
    {
      id: 'ORD-INV-003',
      sellerName: 'Kalyani SHG Products',
      sellerMobile: '9876543212',
      sellerVillage: 'Junnar',
      buyerName: 'West End Retail',
      buyerMobile: '9876543233',
      buyerAddress: 'South Avenue, District H',
      buyerVillage: 'Pune',
      productCount: 3,
      totalQty: 45,
      totalWeight: 90,
      status: 'returned',
      shgName: 'Kalyani SHG',
      shgMobile: '9876543212',
      transporterName: 'Rajesh Kumar',
      transporterMobile: '9876543220',
      orderDate: '2026-06-12',
      barcode: 'BAR-ORD-INV-003-4928',
      storeDate: '2026-06-12',
    },
  ]);

  const [dropInventory, setDropInventory] = useState<InventoryItem[]>([
    {
      id: 'ORD-INV-004',
      sellerName: 'Eco Weavers',
      buyerName: 'Crafts Emporium',
      buyerMobile: '9876543234',
      buyerAddress: 'Main Square Road',
      productCount: 1,
      totalQty: 75,
      totalWeight: 150,
      status: 'pending',
      orderDate: '2026-06-12',
    },
  ]);

  const [returnDropInventory, setReturnDropInventory] = useState<InventoryItem[]>([
    {
      id: 'ORD-INV-005',
      sellerName: 'Nutty Farms Cashews',
      sellerMobile: '9876543205',
      sellerVillage: 'Indapur',
      buyerName: 'Dry Fruits Hub',
      buyerMobile: '9876543235',
      buyerAddress: 'Kothrud, Pune',
      buyerVillage: 'Pune',
      productCount: 1,
      totalQty: 20,
      totalWeight: 40,
      status: 'pending acceptance',
      orderDate: '2026-06-13',
      barcode: 'BAR-ORD-INV-005-9582',
      storeDate: '2026-06-13',
    },
  ]);

  // 5. Partner Profiles
  const [shgList, setShgList] = useState<SHGProfile[]>([
    { id: 'SHG-101', name: 'Nari Shakti Group', leader: 'Kamala Devi', mobile: '9876543210', address: 'Village A, Ward 4, Pune', members: 15, status: 'Active', assignedOrders: 3 },
    { id: 'SHG-102', name: 'Gramin Vikas SHG', leader: 'Sita Sharma', mobile: '9876543211', address: 'Village B, Ward 2, Shirur', members: 12, status: 'Active', assignedOrders: 2 },
    { id: 'SHG-103', name: 'Kalyani SHG', leader: 'Radha Bai', mobile: '9876543212', address: 'Village C, Ward 1, Junnar', members: 20, status: 'Active', assignedOrders: 4 },
    { id: 'SHG-104', name: 'Savitri Co-op', leader: 'Meena Patel', mobile: '9876543213', address: 'Village D, Ward 5, Karjat', members: 10, status: 'Active', assignedOrders: 1 },
    { id: 'SHG-105', name: 'Eco Weavers', leader: 'Anjali Verma', mobile: '9876543214', address: 'Village E, Ward 3, Indapur', members: 25, status: 'Inactive', assignedOrders: 0 },
  ]);

  const [transporterList, setTransporterList] = useState<TransporterProfile[]>([
    { id: 'TRN-201', name: 'Rajesh Kumar', mobile: '9876543220', address: 'Plot 45, MIDC Area, Pune', vehicle: 'Mini Truck', route: 'Pune-Shirur', status: 'Available', assignedOrders: 2 },
    { id: 'TRN-202', name: 'Surya Logistics', mobile: '9876543221', address: 'Highway Hub, District Pune', vehicle: 'Heavy Truck', route: 'Pune-Junnar', status: 'Available', assignedOrders: 3 },
    { id: 'TRN-203', name: 'Ravi Logistics', mobile: '9876543222', address: 'Industrial Estate, Phase 1', vehicle: 'Tempo Traveler', route: 'Local Pune', status: 'Busy', assignedOrders: 5 },
    { id: 'TRN-204', name: 'Fast Movers', mobile: '9876543223', address: 'Logistics Park, Karjat', vehicle: 'Pickup Truck', route: 'Karjat-Vashi', status: 'Available', assignedOrders: 1 },
    { id: 'TRN-205', name: 'Safe Transport', mobile: '9876543224', address: 'Near Toll Plaza, Satara', vehicle: 'Bolero Camper', route: 'Satara-Pune', status: 'Inactive', assignedOrders: 0 },
  ]);

  // --- ACTIONS ---

  // Moves warehouse order to incoming inventory
  const readyToStore = (orderId: string) => {
    const order = pickupWarehouseOrders.find((o) => o.id === orderId);
    if (!order) return;

    // Remove from Warehouse orders
    setPickupWarehouseOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Add to incoming inventory
    const newItem: InventoryItem = {
      id: order.id,
      sellerName: order.sellerName,
      sellerMobile: order.sellerMobile,
      sellerVillage: order.sellerVillage,
      buyerName: 'Mandi Wholesale', // default fallback
      buyerMobile: '9900112233',
      buyerAddress: 'Gram Mandi Hub Store',
      buyerVillage: 'Pune',
      productCount: order.productCount,
      totalQty: order.totalQty,
      totalWeight: order.totalWeight,
      status: 'stored',
      shgName: order.shgDetails?.name,
      shgMobile: order.shgDetails?.mobile,
      shgAddress: order.shgDetails?.address,
      transporterName: order.transporterDetails?.name,
      transporterMobile: order.transporterDetails?.mobile,
      transporterAddress: order.transporterDetails?.address,
      orderDate: order.orderDate,
      barcode: generateBarcode(order.id),
      storeDate: new Date().toISOString().split('T')[0],
    };
    setIncomingInventory((prev) => [...prev, newItem]);
  };

  // Dispatches item from incoming inventory
  const dispatchInventory = (orderId: string) => {
    setIncomingInventory((prev) =>
      prev.map((item) => (item.id === orderId ? { ...item, status: 'dispatch' } : item))
    );
    setReturnDropInventory((prev) =>
      prev.map((item) => (item.id === orderId ? { ...item, status: 'dispatch' } : item))
    );
  };

  const generateOTP = (orderId: string) => {
    const otpVal = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`Generated OTP for order ${orderId}: ${otpVal}`);
    return otpVal;
  };

  const generateBarcode = (orderId: string) => {
    // Return standard dummy code or string format
    return `BAR-${orderId}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const approveSHG = (id: string) => {
    setShgList((prev) =>
      prev.map((shg) => (shg.id === id ? { ...shg, status: 'Active' } : shg))
    );
  };

  const approveTransporter = (id: string) => {
    setTransporterList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Available' } : t))
    );
  };

  const addNewSHG = (shg: Omit<SHGProfile, 'id' | 'assignedOrders'>) => {
    const newShgItem: SHGProfile = {
      ...shg,
      id: `SHG-${100 + shgList.length + 1}`,
      assignedOrders: 0,
    };
    setShgList((prev) => [...prev, newShgItem]);
  };

  const addNewTransporter = (transporter: Omit<TransporterProfile, 'id' | 'assignedOrders'>) => {
    const newTransporterItem: TransporterProfile = {
      ...transporter,
      id: `TRN-${200 + transporterList.length + 1}`,
      assignedOrders: 0,
    };
    setTransporterList((prev) => [...prev, newTransporterItem]);
  };

  // Helper action to assign details for demo purposes
  const assignPickupOrder = (orderId: string, shgId: string, transporterId: string) => {
    const newOrder = pickupNewOrders.find((o) => o.id === orderId);
    const shg = shgList.find((s) => s.id === shgId);
    const transporter = transporterList.find((t) => t.id === transporterId);

    if (newOrder && shg && transporter) {
      setPickupNewOrders((prev) => prev.filter((o) => o.id !== orderId));
      
      const assigned: PickupOrder = {
        ...newOrder,
        shgStatus: 'Accepted',
        transporterStatus: 'Accepted',
        mainStatus: 'pickup assigned',
        status: 'pickup assigned',
        shgDetails: {
          name: shg.name,
          mobile: shg.mobile,
          address: shg.address,
        },
        shgPickupSchedule: '2026-06-15 10:00 AM',
        transporterDetails: {
          name: transporter.name,
          mobile: transporter.mobile,
          address: transporter.address,
        },
        transporterPickupSchedule: '2026-06-15 12:30 PM',
      };
      setPickupAssignedOrders((prev) => [...prev, assigned]);

      // increment assigned count
      setShgList(prev => prev.map(s => s.id === shgId ? { ...s, assignedOrders: s.assignedOrders + 1 } : s));
      setTransporterList(prev => prev.map(t => t.id === transporterId ? { ...t, assignedOrders: t.assignedOrders + 1 } : t));
    }
  };

  return (
    <AppContext.Provider
      value={{
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
        readyToStore,
        dispatchInventory,
        generateOTP,
        generateBarcode,
        approveSHG,
        approveTransporter,
        addNewSHG,
        addNewTransporter,
        assignPickupOrder,
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
