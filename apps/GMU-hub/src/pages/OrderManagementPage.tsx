import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Tabs } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { PickupOrder, DropOrder, ReturnOrder } from '../context/AppContext';
import {
  Eye,
  ShieldAlert,
  ClipboardCheck,
  CheckCircle2,
  Check,
  AlertTriangle,
  Copy,
  Download,
  X,
  FileText,
  MoreVertical,
  Phone,
  MapPin,
  Calendar,
  Truck,
  Clock,
  Package,
  Layers,
  QrCode,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Store,
  Users,
  Home,
  User
} from 'lucide-react';
import { api } from '../utils/api';

const CANONICAL_STATUS_MAP: Record<string, string> = {
  'order placed & registered': 'Order Placed & Registered',
  'order placed': 'Order Placed & Registered',
  'pending': 'Order Placed & Registered',
  'created': 'Order Placed & Registered',
  'registered': 'Order Placed & Registered',
  'pickup shg assigned & accepted': 'Pickup SHG Assigned & Accepted',
  'shg accepted': 'Pickup SHG Assigned & Accepted',
  'collected & scanned by shg': 'Collected & Scanned by SHG',
  'shg pickup': 'Collected & Scanned by SHG',
  'shg_pickup': 'Collected & Scanned by SHG',
  'shg scan': 'Collected & Scanned by SHG',
  'parcel_at_shg': 'Collected & Scanned by SHG',
  'transporter route assigned & accepted': 'Transporter Route Assigned & Accepted',
  'transporter accepted': 'Transporter Route Assigned & Accepted',
  'accepted_pickup': 'Transporter Route Assigned & Accepted',
  'picked up by transporter (in transit to hub)': 'Picked up by Transporter',
  'picked up by transporter': 'Picked up by Transporter',
  'transporter pickup': 'Picked up by Transporter',
  'transporter_pickup': 'Picked up by Transporter',
  'parcel_picked': 'Picked up by Transporter',
  'in_transit_to_hub': 'Picked up by Transporter',
  'received & quality checked at gmu hub': 'Received & Quality Checked at GMU Hub',
  'hub intake': 'Received & Quality Checked at GMU Hub',
  'hub_received': 'Received & Quality Checked at GMU Hub',
  'at_gmu': 'Received & Quality Checked at GMU Hub',
  'stored': 'Received & Quality Checked at GMU Hub',
  'stored in hub inventory': 'Received & Quality Checked at GMU Hub',
  'stored_in_hub': 'Received & Quality Checked at GMU Hub',
  'drop shg assigned & accepted': 'Drop SHG Assigned & Accepted',
  'drop shg accepted': 'Drop SHG Assigned & Accepted',
  'drop transporter route assigned & accepted': 'Drop Transporter Route Assigned & Accepted',
  'drop transporter accepted': 'Drop Transporter Route Assigned & Accepted',
  'dispatched from hub (in transit to drop center)': 'Dispatched from Hub',
  'dispatched from hub': 'Dispatched from Hub',
  'dispatched': 'Dispatched from Hub',
  'out_for_delivery': 'Dispatched from Hub',
  'drop transporter pickup': 'Dispatched from Hub',
  'transporter drop pickup': 'Dispatched from Hub',
  'transporter_drop_pickup': 'Dispatched from Hub',
  'transporter picked up from hub': 'Transporter Picked Up from Hub',
  'received at destination shg center': 'Received at Destination SHG Center',
  'drop shg pickup': 'Received at Destination SHG Center',
  'shg drop pickup': 'Received at Destination SHG Center',
  'shg_drop_pickup': 'Received at Destination SHG Center',
  'at_buyer_shg': 'Received at Destination SHG Center',
  'delivered & handed over to buyer': 'Delivered & Handed Over to Buyer',
  'delivered': 'Delivered & Handed Over to Buyer',
  'completed': 'Delivered & Handed Over to Buyer',
};

const getExpectedDeliveryDate = (startDate: string | undefined) => {
  if (!startDate) return '-';
  try {
    const d = new Date(startDate.split(' ')[0]);
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '-';
  }
};

const STAGE_ORDER: Record<string, number> = {
  'Order Placed & Registered': 1,
  'Collected & Scanned by SHG': 2,
  'Transporter Route Assigned & Accepted': 3,
  'Picked up by Transporter': 4,
  'Received & Quality Checked at GMU Hub': 5,
  'Dispatched from Hub': 6,
  'Transporter Picked Up from Hub': 7,
  'Received at Destination SHG Center': 8,
  'Delivered & Handed Over to Buyer': 9,
};

const getUpdatedTimeAgo = (order: any) => {
  const updatedTime = order.rawUpdatedAt || order.updatedAt;
  if (!updatedTime) return 'Updated 1 min ago';

  const diffMs = Date.now() - new Date(updatedTime).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins <= 1) {
    return 'Updated 1 min ago';
  }
  if (diffMins < 60) {
    return `Updated ${diffMins} mins ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
};

export const OrderManagementPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const {
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
    returnPickupNewOrders,
    returnPickupCompletedOrders,
    returnDropNewOrders,
    returnDropCompletedOrders,
    readyToStore,
    dispatchInventory,
    intakePickupOrders,
    intakeReturnOrder,
    shgList,
    transporterList,
    assignPickupOrder,
    requestBuyerReturn,
    generateQr,
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
    mapOrder,
  } = useAppContext();

  // Top level sections: new | in_transit | completed | returned | rejected
  const [activeTopTab, setActiveTopTab] = useState<'new' | 'in_transit' | 'completed' | 'returned' | 'rejected'>((localStorage.getItem('gmu_active_tab') as any) || 'new');

  useEffect(() => {
    const syncActiveTab = () => {
      const val = localStorage.getItem('gmu_active_tab');
      if (val && ['new', 'in_transit', 'completed', 'returned', 'rejected'].includes(val)) {
        setActiveTopTab(val as any);
      }
    };
    window.addEventListener('storage', syncActiveTab);
    const interval = setInterval(syncActiveTab, 150);
    return () => {
      window.removeEventListener('storage', syncActiveTab);
      clearInterval(interval);
    };
  }, []);

  const handleTabChange = (tab: 'new' | 'in_transit' | 'completed' | 'returned' | 'rejected') => {
    localStorage.setItem('gmu_active_tab', tab);
    setActiveTopTab(tab);
  };

  const [addOrderFlow, setAddOrderFlow] = useState<'pickup' | 'drop'>('pickup');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Expanded cards state
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Unified Page Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [villageFilter, setVillageFilter] = useState('all');
  const [pincodeFilter, setPincodeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [transitStatusFilter, setTransitStatusFilter] = useState('all');

  // Pagination for transit view
  const [transitPage, setTransitPage] = useState(1);
  const transitItemsPerPage = 10;

  // Pagination for return view
  const [returnPage, setReturnPage] = useState(1);
  const returnItemsPerPage = 10;

  // Return Sub-Tabs: transporter | buyer
  const [activeReturnSubTab, setActiveReturnSubTab] = useState<'transporter' | 'buyer'>('transporter');



  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeOrder, setIntakeOrder] = useState<any | null>(null);
  const [intakeType, setIntakeType] = useState<'pickup' | 'return-pickup' | 'return-drop' | null>(null);

  // Modern Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const [isParcelQrModalOpen, setIsParcelQrModalOpen] = useState(false);
  const [parcelQrList, setParcelQrList] = useState<any[]>([]);
  const [parcelQrOrderId, setParcelQrOrderId] = useState<string | null>(null);
  const [parcelQrOrder, setParcelQrOrder] = useState<any>(null);

  // Side Drawer details for clicked timeline nodes
  const [isNodeDrawerOpen, setIsNodeDrawerOpen] = useState(false);
  const [activeNodeTitle, setActiveNodeTitle] = useState('');
  const [activeNodeDetails, setActiveNodeDetails] = useState<Record<string, any> | null>(null);

  const handleNodeClick = async (nodeLabel: string, nodeDetails: any, parentOrder?: any) => {
    if (!nodeDetails) return;
    setActiveNodeTitle(nodeLabel);
    setActiveNodeDetails(nodeDetails);
    setIsNodeDrawerOpen(true);

    if (parentOrder) {
      const initialMerged = getMergedOrder(parentOrder.id || parentOrder.orderId || '', {
        pickupNew: pickupNewOrders,
        pickupAssigned: pickupAssignedOrders,
        pickupWarehouse: pickupWarehouseOrders,
        pickupRejected: pickupRejectedOrders,
        pickupRescheduled: pickupRescheduledOrders,
        dropNew: dropNewOrders,
        dropAssigned: dropAssignedOrders,
        dropRejected: dropRejectedOrders,
        dropRescheduled: dropRescheduledOrders,
        dropCompleted: dropCompletedOrders,
        returnPickupNew: returnPickupNewOrders,
        returnPickupCompleted: returnPickupCompletedOrders,
        returnDropNew: returnDropNewOrders,
        returnDropCompleted: returnDropCompletedOrders,
      }) || parentOrder;

      setSelectedOrderDetails(initialMerged);

      try {
        const fresh = await api.orders.getDetails(parentOrder.uuid || parentOrder.id);
        if (fresh) {
          const flowType = (fresh.phase === 'DROP' || parentOrder.phase === 'DROP') ? 'drop' : 'pickup';
          const mapped = mapOrder(fresh, flowType);

          const allTrackingEvents = [
            ...(initialMerged.tracking || []),
            ...(fresh.tracking || []),
            ...(mapped.tracking || []),
          ];

          const uniqueTrackingMap = new Map();
          allTrackingEvents.forEach((t) => {
            const rawTitle = String(t.status || t.action || '').toLowerCase().trim();
            const canonicalTitle = CANONICAL_STATUS_MAP[rawTitle] || t.status || t.action;
            if (canonicalTitle) {
              const key = canonicalTitle.toLowerCase().trim();
              if (!uniqueTrackingMap.has(key)) {
                uniqueTrackingMap.set(key, { ...t, status: canonicalTitle });
              }
            }
          });

          const mergedTracking = Array.from(uniqueTrackingMap.values()).sort((a: any, b: any) => {
            const rankA = STAGE_ORDER[a.status] || 99;
            const rankB = STAGE_ORDER[b.status] || 99;
            if (rankA !== rankB) return rankA - rankB;
            const timeA = new Date(a.timestamp || a.scanTime || a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.timestamp || b.scanTime || b.updatedAt || b.createdAt || 0).getTime();
            return timeA - timeB;
          });

          setSelectedOrderDetails({
            ...initialMerged,
            ...mapped,
            tracking: mergedTracking.length > 0 ? mergedTracking : (mapped.tracking || initialMerged.tracking),
          });
        }
      } catch (e) {
        console.warn('Failed to load fresh order details in handleNodeClick:', e);
      }
    }
  };

  // Helper to extract person-specific timeline events from selectedOrderDetails
  const getPersonHistoryTimeline = (nodeTitle: string, orderDetails: any) => {
    if (!orderDetails || !orderDetails.tracking || !Array.isArray(orderDetails.tracking)) {
      return [];
    }

    const titleUpper = (nodeTitle || '').toUpperCase();

    return orderDetails.tracking.filter((t: any) => {
      const statusStr = (t.status || t.action || '').toString();
      const statusLower = statusStr.toLowerCase();

      if (titleUpper.includes('SELLER')) {
        return statusLower.includes('order placed');
      }
      if (titleUpper.includes('PICKUP SHG')) {
        return statusLower.includes('pickup shg') || statusLower.includes('collected') || statusLower.includes('shg pickup') || statusLower.includes('shg accepted');
      }
      if (titleUpper.includes('PICKUP TRANSPORTER')) {
        return statusLower.includes('transporter route') || statusLower.includes('picked up by transporter') || statusLower.includes('transporter pickup') || statusLower.includes('transporter accepted');
      }
      if (titleUpper.includes('HUB') || titleUpper.includes('GMU')) {
        return statusLower.includes('gmu hub') || statusLower.includes('hub inventory') || statusLower.includes('hub intake') || statusLower.includes('stored');
      }
      if (titleUpper.includes('DROP TRANSPORTER')) {
        return statusLower.includes('drop transporter') || statusLower.includes('dispatched from hub');
      }
      if (titleUpper.includes('DROP SHG') || titleUpper.includes('BUYER')) {
        return statusLower.includes('destination shg') || statusLower.includes('delivered') || statusLower.includes('drop shg');
      }
      return true;
    });
  };

  // Intake QR Verification state
  const [intakeParcels, setIntakeParcels] = useState<any[]>([]);
  const [loadingIntakeParcels, setLoadingIntakeParcels] = useState(false);
  const [scanningParcel, setScanningParcel] = useState<any | null>(null);

  useEffect(() => {
    if (isIntakeModalOpen && intakeOrder) {
      setLoadingIntakeParcels(false);
      const orderIds = intakeOrder.isBulk ? intakeOrder.selectedIds : [intakeOrder.id];
      const initialParcels = orderIds.map((id: any, index: number) => ({
        parcelId: id,
        productName: intakeOrder.fullOrder?.productName || 'Order Package',
        parcelNumber: index + 1,
        totalParcels: orderIds.length,
        weight: `${intakeOrder.weight || 0.75} kg`,
        parcelStatus: 'HUB_RECEIVED',
      }));
      setIntakeParcels(initialParcels);
    } else {
      setIntakeParcels([]);
      setLoadingIntakeParcels(false);
    }
  }, [isIntakeModalOpen, intakeOrder]);

  // Auto-fetch/generate QR codes when opening the View Modal
  useEffect(() => {
    if (isViewModalOpen && selectedOrderDetails && (!selectedOrderDetails.parcels || selectedOrderDetails.parcels.length === 0)) {
      const autoFetchQr = async () => {
        setIsGeneratingQr(true);
        try {
          const targetId = selectedOrderDetails.uuid || selectedOrderDetails.id;
          const res = await api.orders.generateQr(targetId, false);
          if (res && Array.isArray(res) && res.length > 0) {
            setSelectedOrderDetails((prev: any) => prev ? { ...prev, parcels: res } : prev);
          }
        } catch (err) {
          console.warn("Auto-generate QR failed in OrderManagementPage:", err);
        } finally {
          setIsGeneratingQr(false);
        }
      };
      autoFetchQr();
    }
  }, [isViewModalOpen, selectedOrderDetails?.id]);

  const handleSimulatedIntakeScan = async (parcel: any) => {
    setScanningParcel(parcel);
    // Instant optimistic UI update for 0ms visual responsiveness
    setIntakeParcels(prev =>
      prev.map(p => p.parcelId === parcel.parcelId ? { ...p, parcelStatus: 'HUB_RECEIVED' } : p)
    );

    try {
      if (parcel.verificationToken) {
        await api.orders.verifyQr(parcel.parcelId, parcel.verificationToken, 'GMU');
      }
    } catch (err: any) {
      console.warn('Verify QR error in intake scan:', err);
    } finally {
      setScanningParcel(null);
    }
  };

  // QR Scan Modal State for Returns
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrItem, setQrItem] = useState<ReturnOrder | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Parcel & QR states
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [isParcelPreviewOpen, setIsParcelPreviewOpen] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const handleGenerateAllQr = async (orderId: string) => {
    setIsGeneratingQr(true);
    try {
      const res = await api.qr.generate(orderId, false);
      if (res && res.length > 0) {
        const fresh = await api.orders.getDetails(selectedOrderDetails.uuid || selectedOrderDetails.id);
        if (fresh) {
          const mapped = mapOrder(fresh, 'pickup');
          setSelectedOrderDetails(mapped);
        }
      }
    } catch (err: any) {
      alert("Failed to generate QR codes: " + (err.message || err));
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleDownloadAllQr = (parcelsList: any[]) => {
    if (!parcelsList || parcelsList.length === 0) return;
    parcelsList.forEach((p, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = p.qrImage;
        link.download = `QR_${p.orderId}_Parcel_${p.parcelNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 300);
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  // Add Order Modal States
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [sellerName, setSellerName] = useState('');
  const [sellerMobile, setSellerMobile] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerVillage, setSellerVillage] = useState('');
  const [sellerTaluka, setSellerTaluka] = useState('');
  const [sellerDistrict, setSellerDistrict] = useState('');
  const [sellerState, setSellerState] = useState('');
  const [sellerPincode, setSellerPincode] = useState('');
  const [sellerVillages, setSellerVillages] = useState<string[]>([]);

  const [buyerName, setBuyerName] = useState('');
  const [buyerMobile, setBuyerMobile] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerVillage, setBuyerVillage] = useState('');
  const [buyerTaluka, setBuyerTaluka] = useState('');
  const [buyerDistrict, setBuyerDistrict] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerPincode, setBuyerPincode] = useState('');
  const [buyerVillages, setBuyerVillages] = useState<string[]>([]);

  const [formOrderId, setFormOrderId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
  const [priority, setPriority] = useState('Medium');

  const [products, setProducts] = useState<any[]>([
    { name: '', category: 'FOOD', quantity: 1, unit: 'Packet', weight: 0.5, price: 100 }
  ]);

  const [validationError, setValidationError] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const fetchAddressDetails = async (pincode: string, isSeller: boolean) => {
    if (pincode.length !== 6) return;
    try {
      let result: any = null;

      // 1. Try local DB API (pincode_directory table)
      try {
        const localRes = await fetch(`http://localhost:3001/api/location/pincode/${pincode}`);
        if (localRes.ok) {
          const localData = await localRes.json();
          if (localData && localData.villages && localData.villages.length > 0) {
            result = {
              state: localData.state,
              district: localData.district,
              taluka: localData.taluka,
              villages: localData.villages,
            };
          }
        }
      } catch (e) {
        console.warn("Local location lookup failed, falling back:", e);
      }

      // 2. Fallback to Postal API if local DB does not have the pincode yet
      if (!result) {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success') {
          const postOffices = data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            const first = postOffices[0];
            const villages = [...new Set(postOffices.map((po: any) => po.Name))].sort();
            result = {
              state: first.State,
              district: first.District,
              taluka: first.Block === 'NA' ? first.District : first.Block,
              villages: villages
            };
          }
        }
      }

      if (!result) {
        result = {
          state: "Maharashtra",
          district: "Kolhapur",
          taluka: "Gadhinglaj",
          villages: ["Village " + pincode, "Center " + pincode, "Local Area " + pincode]
        };
      }

      if (isSeller) {
        setSellerState(result.state);
        setSellerDistrict(result.district);
        setSellerTaluka(result.taluka);
        setSellerVillages(result.villages);
        if (result.villages.length > 0) {
          setSellerVillage(result.villages[0]);
        }
      } else {
        setBuyerState(result.state);
        setBuyerDistrict(result.district);
        setBuyerTaluka(result.taluka);
        setBuyerVillages(result.villages);
        if (result.villages.length > 0) {
          setBuyerVillage(result.villages[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch address for pincode:", pincode, err);
    }
  };

  const handleSellerPincodeChange = (val: string) => {
    setSellerPincode(val);
    if (val.trim().length === 6) {
      fetchAddressDetails(val.trim(), true);
    }
  };

  const handleBuyerPincodeChange = (val: string) => {
    setBuyerPincode(val);
    if (val.trim().length === 6) {
      fetchAddressDetails(val.trim(), false);
    }
  };

  const handleOpenAddOrderModalPickup = () => {
    setAddOrderFlow('pickup');
    handleOpenAddOrderModal();
  };

  const handleOpenAddOrderModal = () => {
    setSellerName('');
    setSellerMobile('');
    setSellerAddress('');
    setSellerVillage('');
    setSellerTaluka('');
    setSellerDistrict('');
    setSellerState('');
    setSellerPincode('');
    setSellerVillages([]);

    setBuyerName('');
    setBuyerMobile('');
    setBuyerAddress('');
    setBuyerVillage('');
    setBuyerTaluka('');
    setBuyerDistrict('');
    setBuyerState('');
    setBuyerPincode('');
    setBuyerVillages([]);

    setFormOrderId('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDeliveryDate(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
    setPriority('Medium');

    setProducts([{ name: '', category: 'FOOD', quantity: 1, unit: 'Packet', weight: 0.5, price: 100 }]);
    setValidationError('');
    setIsCreatingOrder(false);
    setIsAddOrderOpen(true);
  };

  const handleAddProduct = () => {
    setProducts([...products, { name: '', category: 'FOOD', quantity: 1, unit: 'Packet', weight: 0.5, price: 100 }]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const totalProductsCount = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
  const totalWeight = parseFloat(products.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.weight || 0), 0).toFixed(2));
  const totalPrice = products.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.price || 0), 0);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!sellerName.trim() || !sellerMobile.trim() || !sellerVillage.trim() || !sellerPincode.trim()) {
      setValidationError('Seller Name, Mobile, Village, and Pincode are required.');
      return;
    }
    if (!buyerName.trim() || !buyerMobile.trim() || !buyerVillage.trim() || !buyerPincode.trim()) {
      setValidationError('Buyer Name, Mobile, Village, and Pincode are required.');
      return;
    }
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.name.trim()) {
        setValidationError(`Product #${i + 1} Name is required.`);
        return;
      }
      if (Number(p.quantity || 0) <= 0) {
        setValidationError(`Product #${i + 1} Quantity must be greater than 0.`);
        return;
      }
      if (Number(p.weight || 0) <= 0) {
        setValidationError(`Product #${i + 1} Weight must be greater than 0.`);
        return;
      }
    }

    setIsCreatingOrder(true);
    try {
      const payload = {
        orderId: formOrderId.trim() || undefined,
        sellerName: sellerName.trim(),
        sellerMobile: sellerMobile.trim(),
        sellerVillage: sellerVillage.trim(),
        sellerTaluka: sellerTaluka.trim(),
        sellerDistrict: sellerDistrict.trim(),
        sellerState: sellerState.trim(),
        sellerPincode: sellerPincode.trim(),
        buyerName: buyerName.trim(),
        buyerMobile: buyerMobile.trim(),
        buyerVillage: buyerVillage.trim(),
        buyerTaluka: buyerTaluka.trim(),
        buyerDistrict: buyerDistrict.trim(),
        buyerState: buyerState.trim(),
        buyerPincode: buyerPincode.trim(),
        productCount: totalProductsCount,
        totalQty: totalQuantity,
        totalWeight: totalWeight,
        priority,
        orderDate,
        expectedDeliveryDate,
        products: products.map(p => ({
          name: p.name.trim(),
          category: p.category,
          quantity: Number(p.quantity),
          unit: p.unit,
          weight: Number(p.weight),
          price: Number(p.price),
        })),
      };

      if (addOrderFlow === 'drop') {
        await api.orders.createDrop(payload);
      } else {
        await api.orders.create(payload);
      }

      loadData();
      setIsAddOrderOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleSimulateScan = async () => {
    if (!qrItem) return;
    setIsScanning(true);
    setScanMessage('Scanning QR Code...');
    try {
      if (activeActionMenu === 'drop' || qrItem.mainStatus?.includes('TRANSPORTER_RETURN')) {
        await api.orders.transporterReturnScan(qrItem.uuid || qrItem.id, qrItem.barcode || '');
        setQrScanSuccess(true);
        setScanMessage('Transporter return scanned and moved to inventory successfully.');
      } else {
        await api.orders.buyerReturnScan(qrItem.uuid || qrItem.id, qrItem.barcode || '');
        setQrScanSuccess(true);
        setScanMessage('Buyer return scanned and moved to inventory successfully.');
      }
      setIsQrModalOpen(false);
      await loadData();
    } catch (err: any) {
      setScanMessage(err.message || 'Failed to process return scan.');
    } finally {
      setIsScanning(false);
    }
  };

  // Dynamic details mapping helpers
  const getMergedOrder = (orderId: string, allLists: any) => {
    const {
      pickupNew,
      pickupAssigned,
      pickupWarehouse,
      pickupRejected,
      pickupRescheduled,
      dropNew,
      dropAssigned,
      dropRejected,
      dropRescheduled,
      dropCompleted,
      returnPickupNew,
      returnPickupCompleted,
      returnDropNew,
      returnDropCompleted,
    } = allLists;

    const tempPrimary = returnPickupCompleted.find((o: any) => o.id === orderId) ||
      returnDropCompleted.find((o: any) => o.id === orderId) ||
      returnPickupNew.find((o: any) => o.id === orderId) ||
      returnDropNew.find((o: any) => o.id === orderId) ||
      dropCompleted.find((o: any) => o.id === orderId) ||
      dropRescheduled.find((o: any) => o.id === orderId) ||
      dropRejected.find((o: any) => o.id === orderId) ||
      dropAssigned.find((o: any) => o.id === orderId) ||
      dropNew.find((o: any) => o.id === orderId) ||
      pickupWarehouse.find((o: any) => o.id === orderId) ||
      pickupRescheduled.find((o: any) => o.id === orderId) ||
      pickupRejected.find((o: any) => o.id === orderId) ||
      pickupAssigned.find((o: any) => o.id === orderId) ||
      pickupNew.find((o: any) => o.id === orderId);

    if (!tempPrimary) return null;

    const baseNumber = tempPrimary.orderId?.split('-').pop() || tempPrimary.id?.split('-').pop() || '';
    const matchBase = (o: any) => {
      if (o.id === orderId) return true;
      if (!baseNumber) return false;
      const num = o.orderId || o.id || '';
      return num.endsWith(baseNumber);
    };

    const pNew = pickupNew.find(matchBase);
    const pAssigned = pickupAssigned.find(matchBase);
    const pWh = pickupWarehouse.find(matchBase);
    const pRej = pickupRejected.find(matchBase);
    const pRes = pickupRescheduled.find(matchBase);

    const dNew = dropNew.find(matchBase);
    const dAssigned = dropAssigned.find(matchBase);
    const dRej = dropRejected.find(matchBase);
    const dRes = dropRescheduled.find(matchBase);
    const dComp = dropCompleted.find(matchBase);

    const retPNew = returnPickupNew.find(matchBase);
    const retPComp = returnPickupCompleted.find(matchBase);
    const retDNew = returnDropNew.find(matchBase);
    const retDComp = returnDropCompleted.find(matchBase);

    const primary = tempPrimary;

    const allTracking = [
      ...(primary?.tracking || []),
      ...(pNew?.tracking || []),
      ...(pAssigned?.tracking || []),
      ...(pWh?.tracking || []),
      ...(pRej?.tracking || []),
      ...(pRes?.tracking || []),
      ...(dNew?.tracking || []),
      ...(dAssigned?.tracking || []),
      ...(dRej?.tracking || []),
      ...(dRes?.tracking || []),
      ...(dComp?.tracking || []),
      ...(retPNew?.tracking || []),
      ...(retPComp?.tracking || []),
      ...(retDNew?.tracking || []),
      ...(retDComp?.tracking || []),
    ];



    const uniqueTrackingMap = new Map();
    allTracking.forEach((t) => {
      const rawTitle = String(t.status || t.action || '').toLowerCase().trim();
      const canonicalTitle = CANONICAL_STATUS_MAP[rawTitle] || t.status || t.action;
      if (canonicalTitle) {
        const key = canonicalTitle.toLowerCase().trim();
        if (!uniqueTrackingMap.has(key)) {
          uniqueTrackingMap.set(key, { ...t, status: canonicalTitle });
        }
      }
    });

    const uniqueTracking = Array.from(uniqueTrackingMap.values()).sort((a: any, b: any) => {
      const rankA = STAGE_ORDER[a.status] || 99;
      const rankB = STAGE_ORDER[b.status] || 99;
      if (rankA !== rankB) return rankA - rankB;
      const timeA = new Date(a.timestamp || a.scanTime || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.scanTime || b.updatedAt || b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    const pickupShgDetails = pAssigned?.shgDetails || pWh?.shgDetails || pRej?.shgDetails || pRes?.shgDetails || pNew?.shgDetails || tempPrimary.pickupShgDetails;
    const dropShgDetails = dAssigned?.shgDetails || dRej?.shgDetails || dRes?.shgDetails || dComp?.shgDetails || dNew?.shgDetails || tempPrimary.dropShgDetails;
    const returnShgDetails = retPNew?.shgDetails || retPComp?.shgDetails || retDNew?.shgDetails || retDComp?.shgDetails || tempPrimary.returnShgDetails;

    const pickupTransporterDetails = pAssigned?.transporterDetails || pWh?.transporterDetails || pRej?.transporterDetails || pRes?.transporterDetails || tempPrimary.pickupTransporterDetails;
    const dropTransporterDetails = dAssigned?.transporterDetails || dRej?.transporterDetails || dRes?.transporterDetails || dComp?.transporterDetails || tempPrimary.dropTransporterDetails;
    const returnTransporterDetails = retPNew?.transporterDetails || retPComp?.transporterDetails || retDNew?.transporterDetails || retDComp?.transporterDetails || tempPrimary.returnTransporterDetails;

    const allParcels = [
      ...(primary?.parcels || []),
      ...(pWh?.parcels || []),
      ...(dAssigned?.parcels || []),
      ...(dComp?.parcels || []),
    ];
    const uniqueParcelsMap = new Map();
    allParcels.forEach((p: any) => {
      const key = p.parcelId || p.barcode || p.id || `${p.productName}-${p.weight}`;
      if (!uniqueParcelsMap.has(key)) {
        uniqueParcelsMap.set(key, p);
      }
    });
    const deduplicatedParcels = Array.from(uniqueParcelsMap.values());

    const allItems = [
      ...(primary?.items || []),
      ...(pWh?.items || []),
      ...(dAssigned?.items || []),
      ...(dComp?.items || []),
    ];
    const uniqueItemsMap = new Map();
    allItems.forEach((i: any) => {
      const key = `${i.name || i.productName}-${i.quantity}-${i.weight}`;
      if (!uniqueItemsMap.has(key)) {
        uniqueItemsMap.set(key, i);
      }
    });
    const deduplicatedItems = Array.from(uniqueItemsMap.values());

    return {
      ...primary,
      items: deduplicatedItems.length > 0 ? deduplicatedItems : primary?.items,
      parcels: deduplicatedParcels.length > 0 ? deduplicatedParcels : primary?.parcels,

      pickupShgStatus: pNew?.shgStatus || pAssigned?.shgStatus || pWh?.shgStatus || pRej?.shgStatus || pRes?.shgStatus,
      pickupTransporterStatus: pAssigned?.transporterStatus || pWh?.transporterStatus || pRej?.transporterStatus || pRes?.transporterStatus,
      dropShgStatus: dNew?.shgStatus || dAssigned?.shgStatus || dRej?.shgStatus || dRes?.shgStatus || dComp?.shgStatus,
      dropTransporterStatus: dAssigned?.transporterStatus || dRej?.transporterStatus || dRes?.transporterStatus || dComp?.transporterStatus,

      pickupShgDetails,
      dropShgDetails,
      returnShgDetails,
      pickupTransporterDetails,
      dropTransporterDetails,
      returnTransporterDetails,

      tracking: uniqueTracking,
    };
  };

  const loadData = async (isManualRefresh = false, isSilent = false) => {
    const hasData = (activeTopTab === 'new' && (pickupNewOrders.length > 0 || dropNewOrders.length > 0)) ||
      (activeTopTab === 'in_transit' && (pickupAssignedOrders.length > 0 || pickupWarehouseOrders.length > 0 || dropAssignedOrders.length > 0 || returnDropNewOrders.length > 0)) ||
      (activeTopTab === 'completed' && (dropCompletedOrders.length > 0 || returnPickupCompletedOrders.length > 0)) ||
      (activeTopTab === 'rejected' && (pickupRejectedOrders.length > 0 || dropRejectedOrders.length > 0));

    if (!isSilent && (!hasData || isManualRefresh)) {
      setIsLoading(true);
    } else if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setErrorMsg('');
    try {
      const sf = statusFilter === 'all' ? undefined : statusFilter;
      const df = dateFilter || undefined;

      await Promise.all([
        loadPickupNew(sf, df),
        loadPickupAssigned(sf, df),
        loadPickupWarehouse(sf, df),
        loadPickupRescheduled(sf, df),
        loadDropNew(sf, df),
        loadDropAssigned(sf, df),
        loadDropRescheduled(sf, df),
        loadDropCompleted(sf, df),
        loadReturnsTransporter(sf, df),
        loadReturnsBuyer(sf, df),
        loadPickupRejected(sf, df),
        loadDropRejected(sf, df),
      ]);
    } catch (e: any) {
      if (!isSilent) {
        setErrorMsg(e.message || 'Failed to load data from server.');
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData(false, true);
    }, 4000);
    return () => clearInterval(timer);
  }, [
    activeTopTab,
    statusFilter,
    dateFilter
  ]);

  useEffect(() => {
    setStatusFilter('all');
    setDateFilter('');
    setSearchQuery('');
    setPriorityFilter('all');
    setVillageFilter('all');
    setPincodeFilter('all');
    setLocationFilter('all');
    setTransitPage(1);
  }, [activeTopTab]);



  // Handle View Action
  const handleViewOrder = async (order: any) => {
    const initialMerged = getMergedOrder(order.id || order.orderId || '', {
      pickupNew: pickupNewOrders,
      pickupAssigned: pickupAssignedOrders,
      pickupWarehouse: pickupWarehouseOrders,
      pickupRejected: pickupRejectedOrders,
      pickupRescheduled: pickupRescheduledOrders,
      dropNew: dropNewOrders,
      dropAssigned: dropAssignedOrders,
      dropRejected: dropRejectedOrders,
      dropRescheduled: dropRescheduledOrders,
      dropCompleted: dropCompletedOrders,
      returnPickupNew: returnPickupNewOrders,
      returnPickupCompleted: returnPickupCompletedOrders,
      returnDropNew: returnDropNewOrders,
      returnDropCompleted: returnDropCompletedOrders,
    }) || order;

    setSelectedOrderDetails(initialMerged);
    setIsViewModalOpen(true);
    try {
      const fresh = await api.orders.getDetails(order.uuid || order.id);
      if (fresh) {
        const flowType = (fresh.phase === 'DROP' || order.phase === 'DROP') ? 'drop' : 'pickup';
        const mapped = mapOrder(fresh, flowType);

        const allTrackingEvents = [
          ...(initialMerged.tracking || []),
          ...(fresh.tracking || []),
          ...(mapped.tracking || []),
        ];

        const uniqueTrackingMap = new Map();
        allTrackingEvents.forEach((t) => {
          const rawTitle = String(t.status || t.action || '').toLowerCase().trim();
          const canonicalTitle = CANONICAL_STATUS_MAP[rawTitle] || t.status || t.action;
          if (canonicalTitle) {
            const key = canonicalTitle.toLowerCase().trim();
            if (!uniqueTrackingMap.has(key)) {
              uniqueTrackingMap.set(key, { ...t, status: canonicalTitle });
            }
          }
        });

        const mergedTracking = Array.from(uniqueTrackingMap.values()).sort((a: any, b: any) => {
          const rankA = STAGE_ORDER[a.status] || 99;
          const rankB = STAGE_ORDER[b.status] || 99;
          if (rankA !== rankB) return rankA - rankB;
          const timeA = new Date(a.timestamp || a.scanTime || a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.timestamp || b.scanTime || b.updatedAt || b.createdAt || 0).getTime();
          return timeA - timeB;
        });

        setSelectedOrderDetails({
          ...initialMerged,
          ...mapped,
          tracking: mergedTracking.length > 0 ? mergedTracking : (mapped.tracking || initialMerged.tracking),
        });
      }
    } catch (e) {
      console.warn('Failed to load fresh order details:', e);
    }
  };

  // Handle Intake Action
  const handleIntakeClick = (order: any, type: 'pickup' | 'return-pickup' | 'return-drop') => {
    setIntakeOrder({
      id: order.id,
      uuid: order.uuid,
      orderId: order.orderId,
      fullOrder: order,
      isBulk: false,
      sellerName: order.sellerName,
      buyerName: order.buyerName,
      shgName: order.pickupShgDetails?.name || order.shgDetails?.name,
      transporterName: order.pickupTransporterDetails?.name || order.transporterDetails?.name,
      qty: order.totalQty || order.quantity || 1,
      weight: order.totalWeight || order.weight || 0,
    });
    setIntakeType(type);
    setIsIntakeModalOpen(true);
  };

  const handleConfirmIntake = async () => {
    if (!intakeOrder || !intakeType) return;
    const currentOrder = intakeOrder;
    const currentType = intakeType;

    // Instant modal close for 0ms visual responsiveness
    setIsIntakeModalOpen(false);
    setIntakeOrder(null);
    setIntakeType(null);
    setActionProcessing(true);

    try {
      if (currentType === 'pickup') {
        const orderIds = currentOrder.isBulk ? currentOrder.selectedIds : [currentOrder.uuid || currentOrder.id];
        await intakePickupOrders(orderIds);
        showNotification(`Intake Successful! Order #${currentOrder.id} status updated to STORED, added to Hub Inventory, and Phase 2 started.`, 'success');
      } else if (currentType === 'return-pickup') {
        await intakeReturnOrder(currentOrder.id, 'pickup');
        showNotification(`Buyer Return Intake Successful! Order #${currentOrder.id} added to Inventory.`, 'success');
      } else if (currentType === 'return-drop') {
        await intakeReturnOrder(currentOrder.id, 'drop');
        showNotification(`Transporter Return Intake Successful! Order #${currentOrder.id} added to Inventory.`, 'success');
      }
      // Re-trigger live page reload without requiring manual refresh
      await loadData(false, true);
    } catch (err: any) {
      showNotification(err.message || 'Intake action failed.', 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle QR Codes Action
  const handleParcelQrClick = async (orderId: string) => {
    const order = pickupWarehouseOrders.find((o) => o.id === orderId) ||
      pickupNewOrders.find((o) => o.id === orderId) ||
      pickupAssignedOrders.find((o) => o.id === orderId) ||
      dropNewOrders.find((o) => o.id === orderId) ||
      dropAssignedOrders.find((o) => o.id === orderId) ||
      dropCompletedOrders.find((o) => o.id === orderId);
    setParcelQrOrder(order || null);
    setParcelQrOrderId(orderId);
    setIsParcelQrModalOpen(true);
    setParcelQrList([]);
    try {
      setActionProcessing(true);
      const res = await generateQr(orderId, false);
      setParcelQrList(res || []);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch QR codes.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleOpenQrModal = (item: ReturnOrder) => {
    setQrItem(item);
    setIsQrModalOpen(true);
    setQrScanSuccess(false);
    setIsScanning(false);
    setScanMessage('');
  };

  const sortNewestFirst = (orders: any[]) => {
    return [...orders].sort((a, b) => {
      const timeA = a.rawUpdatedAt ? new Date(a.rawUpdatedAt).getTime() : (a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0);
      const timeB = b.rawUpdatedAt ? new Date(b.rawUpdatedAt).getTime() : (b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0);
      if (timeA !== timeB) return timeB - timeA;
      const getNum = (idStr: string) => {
        const match = idStr?.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getNum(b.id) - getNum(a.id);
    });
  };

  // Aggregate All Lists into unique Orders
  const allMergedOrders = sortNewestFirst(
    Array.from(
      new Map(
        [
          ...pickupNewOrders,
          ...pickupAssignedOrders,
          ...pickupWarehouseOrders,
          ...pickupRejectedOrders,
          ...pickupRescheduledOrders,
          ...dropNewOrders,
          ...dropAssignedOrders,
          ...dropRejectedOrders,
          ...dropRescheduledOrders,
          ...dropCompletedOrders,
          ...returnPickupNewOrders,
          ...returnPickupCompletedOrders,
          ...returnDropNewOrders,
          ...returnDropCompletedOrders,
        ].map((o) => [o.id, o])
      ).values()
    ).map((o) => getMergedOrder(o.id, {
      pickupNew: pickupNewOrders,
      pickupAssigned: pickupAssignedOrders,
      pickupWarehouse: pickupWarehouseOrders,
      pickupRejected: pickupRejectedOrders,
      pickupRescheduled: pickupRescheduledOrders,
      dropNew: dropNewOrders,
      dropAssigned: dropAssignedOrders,
      dropRejected: dropRejectedOrders,
      dropRescheduled: dropRescheduledOrders,
      dropCompleted: dropCompletedOrders,
      returnPickupNew: returnPickupNewOrders,
      returnPickupCompleted: returnPickupCompletedOrders,
      returnDropNew: returnDropNewOrders,
      returnDropCompleted: returnDropCompletedOrders,
    })).filter(Boolean)
  );

  const uniqueVillages = allMergedOrders
    .flatMap(o => [o.sellerVillage, o.buyerVillage].filter(Boolean))
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .sort();

  const uniquePincodes = allMergedOrders
    .flatMap(o => [o.sellerPincode, o.buyerPincode].filter(Boolean))
    .filter((p, idx, arr) => arr.indexOf(p) === idx)
    .sort();

  // Search & Filter helper
  const filterAndSearchOrders = (orders: any[]) => {
    return orders.filter((order) => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matches =
          order.id?.toLowerCase().includes(query) ||
          order.barcode?.toLowerCase().includes(query) ||
          order.sellerName?.toLowerCase().includes(query) ||
          order.sellerMobile?.toLowerCase().includes(query) ||
          order.buyerName?.toLowerCase().includes(query) ||
          order.buyerMobile?.toLowerCase().includes(query) ||
          order.shgDetails?.name?.toLowerCase().includes(query) ||
          order.shgDetails?.mobile?.toLowerCase().includes(query) ||
          order.transporterDetails?.name?.toLowerCase().includes(query) ||
          order.transporterDetails?.mobile?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // 2. Status Filter
      if (statusFilter && statusFilter !== 'all') {
        const sf = statusFilter.toLowerCase();
        if (sf === 'delayed') {
          if (!order.rescheduleType) return false;
        } else {
          if (order.mainStatus?.toLowerCase() !== sf && order.status?.toLowerCase() !== sf) return false;
        }
      }

      // 3. Priority Filter
      if (priorityFilter && priorityFilter !== 'all') {
        if (order.priority?.toLowerCase() !== priorityFilter.toLowerCase()) return false;
      }

      // 4. Village Filter
      if (villageFilter && villageFilter !== 'all') {
        const vf = villageFilter.toLowerCase();
        if (order.sellerVillage?.toLowerCase() !== vf && order.buyerVillage?.toLowerCase() !== vf) return false;
      }

      // 5. Pincode Filter
      if (pincodeFilter && pincodeFilter !== 'all') {
        if (order.sellerPincode !== pincodeFilter && order.buyerPincode !== pincodeFilter) return false;
      }

      // 6. Current Location Filter
      if (locationFilter && locationFilter !== 'all') {
        const loc = locationFilter.toLowerCase();
        if (loc === 'shg') {
          const isAtShg = ['PARCEL_AT_SHG', 'DROP_SHG_ACCEPTED', 'PARCEL_AT_DROP_SHG', 'RETURN_PARCEL_AT_SHG'].includes(order.mainStatus);
          if (!isAtShg) return false;
        } else if (loc === 'transporter') {
          const isAtTrans = ['IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_BUYER', 'RETURN_IN_TRANSIT_TO_HUB', 'RETURN_PARCEL_AT_TRANSPORTER'].includes(order.mainStatus);
          if (!isAtTrans) return false;
        } else if (loc === 'gmu') {
          const isAtGmu = ['PARCEL_AT_GMU', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'STORED', 'DISPATCHED', 'RETURN_PARCEL_AT_GMU'].includes(order.mainStatus);
          if (!isAtGmu) return false;
        } else if (loc === 'seller') {
          const isAtSeller = ['NEW', 'ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'PICKUP_ASSIGNED'].includes(order.mainStatus);
          if (!isAtSeller) return false;
        } else if (loc === 'buyer') {
          const isAtBuyer = ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER'].includes(order.mainStatus);
          if (!isAtBuyer) return false;
        }
      }

      // 7. Date Filter (today / yesterday)
      if (dateFilter) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const rawDate = order.orderDate || order.created_at || '';
        const orderDateStr = rawDate ? rawDate.split(' ')[0].split('T')[0] : '';

        if (dateFilter === 'today') {
          if (orderDateStr !== todayStr) return false;
        } else if (dateFilter === 'yesterday') {
          if (orderDateStr !== yesterdayStr) return false;
        } else if (dateFilter.length === 10) {
          if (orderDateStr !== dateFilter) return false;
        }
      }

      return true;
    });
  };

  // Universal Indian Standard Time (IST) Formatter
  const formatIndianDateTime = (isoDateString?: string | Date | null) => {
    if (!isoDateString) return '-';
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return String(isoDateString);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const splitIndianDateTime = (isoDateString?: string | Date | null) => {
    if (!isoDateString) return { date: '-', time: '-', full: '-' };
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return { date: String(isoDateString), time: '', full: String(isoDateString) };
    const date = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { date, time, full: `${date} • ${time}` };
  };

  // Graphical tracking nodes calculator
  const getTimelineNodes = (order: any) => {
    const getLogsForStage = (stageKeywords: string[]) => {
      if (!order.tracking || order.tracking.length === 0) return 'No scan events logged.';
      const matching = order.tracking.filter((t: any) =>
        stageKeywords.some(kw => t.status?.toUpperCase().includes(kw) || t.remarks?.toUpperCase().includes(kw) || t.action?.toUpperCase().includes(kw))
      );
      if (matching.length === 0) return 'No scan events logged yet for this stage.';
      return matching.map((t: any) => {
        const timeStr = formatIndianDateTime(t.scanTime || t.updatedAt || t.createdAt || t.time);
        const actionStr = t.remarks || t.action || t.status || 'Verified';
        const roleStr = t.userRole ? ` (${t.userRole})` : '';
        return `• [${timeStr}] ${actionStr}${roleStr}`;
      }).join('\n');
    };

    const isBuyerReturn = order.returnType === 'BUYER_RETURN' || [
      'RETURN_PENDING', 'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
      'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
      'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED',
      'RETURN_PARCEL_AT_TRANSPORTER', 'RETURN_PARCEL_AT_GMU', 'RETURN_PARCEL_AT_HUB'
    ].includes(order.mainStatus);

    if (isBuyerReturn) {
      // 1. Buyer: always completed
      const buyerState = 'completed';

      // 2. SHG: active if status is PENDING or ACCEPTED, completed if PICKED or later
      let shgState: 'completed' | 'active' | 'pending' = 'pending';
      if (['RETURN_PICKED_BY_SHG', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(order.mainStatus) || ['PICKED', 'RETURN_PICKED_BY_SHG'].includes(order.pickupShgStatus || '')) {
        shgState = 'completed';
      } else if (['RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG'].includes(order.mainStatus)) {
        shgState = 'active';
      }

      // 3. Transporter: active if PENDING or ACCEPTED, completed if IN_TRANSIT or later
      let transporterState: 'completed' | 'active' | 'pending' = 'pending';
      if (['RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(order.mainStatus) || order.pickupTransporterStatus === 'IN_TRANSIT_TO_HUB') {
        transporterState = 'completed';
      } else if (['RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG'].includes(order.mainStatus)) {
        transporterState = 'active';
      }

      // 4. GMU Hub: active if IN_TRANSIT or RECEIVED, completed if INVENTORY/COMPLETED
      let gmuHubState: 'completed' | 'active' | 'pending' = 'pending';
      if (['INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(order.mainStatus)) {
        gmuHubState = 'completed';
      } else if (['RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED'].includes(order.mainStatus)) {
        gmuHubState = 'active';
      }

      return [
        {
          id: 'buyer',
          label: 'Buyer',
          state: buyerState,
          details: {
            'Person Name': order.buyerName || 'N/A',
            'Role': 'Consignee / Buyer',
            'Mobile Number': order.buyerMobile || 'N/A',
            'Address': order.buyerAddress || 'N/A',
            'Order ID': order.id,
            'Accepted (Date & Time)': formatIndianDateTime(order.createdAt),
            'Status': 'RETURN_INITIATED',
            'History': getLogsForStage(['RETURN_SHG_PENDING'])
          }
        },
        {
          id: 'shg',
          label: 'SHG',
          state: shgState,
          details: order.pickupShgDetails || order.shgDetails ? {
            'Person Name': order.pickupShgDetails?.name || order.shgDetails?.name || 'N/A',
            'Role': 'Return Pickup SHG',
            'Mobile': order.pickupShgDetails?.mobile || order.shgDetails?.mobile || 'N/A',
            'Address': order.pickupShgDetails?.address || order.shgDetails?.address || 'N/A',
            'Order ID': order.id,
            'Accepted (Date & Time)': formatIndianDateTime(order.pickupShgAcceptedAt || order.pickupShgDetails?.acceptedAt),
            'Pickup (Date & Time)': formatIndianDateTime(order.pickupShgPickedAt || order.pickupShgDetails?.pickedAt),
            'Status': order.shgStatus || 'PENDING',
            'History': getLogsForStage(['RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PARCEL_AT_SHG'])
          } : null
        },
        {
          id: 'transporter',
          label: 'Transporter',
          state: transporterState,
          details: order.pickupTransporterDetails || order.transporterDetails ? {
            'Person Name': order.pickupTransporterDetails?.name || order.transporterDetails?.name || 'N/A',
            'Role': 'Return Transporter',
            'Mobile': order.pickupTransporterDetails?.mobile || order.transporterDetails?.mobile || 'N/A',
            'Address': order.pickupTransporterDetails?.address || order.transporterDetails?.address || 'N/A',
            'Order ID': order.id,
            'Accepted (Date & Time)': formatIndianDateTime(order.pickupTransporterAcceptedAt || order.pickupTransporterDetails?.acceptedAt),
            'Pickup (Date & Time)': formatIndianDateTime(order.pickupTransporterPickedAt || order.pickupTransporterDetails?.pickedAt),
            'Status': order.transporterStatus || 'PENDING',
            'History': getLogsForStage(['RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB'])
          } : null
        },
        {
          id: 'gmu_hub',
          label: 'GMU Hub',
          state: gmuHubState,
          details: {
            'Warehouse': 'GMU Hub Central Warehouse',
            'Order ID': order.id,
            'Pickup (Intake Date & Time)': formatIndianDateTime(order.warehouseReceivedAt || order.warehouseReceivedDate),
            'Drop (Stored Date & Time)': formatIndianDateTime(order.storedAt || order.storedDate),
            'Status': ['INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(order.mainStatus) ? 'STORED' : (order.mainStatus === 'BUYER_RETURN_COMPLETED' ? 'RECEIVED' : 'PENDING'),
            'History': getLogsForStage(['BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'])
          }
        }
      ];
    }

    // 1. Seller: always completed
    const sellerState = 'completed';

    // Check if Phase 1 has concluded or GMU Hub / Phase 2 has started
    const isPhase1Concluded = [
      'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED', 'BARCODE_GENERATED',
      'DROP_PENDING', 'DROP_CREATED', 'DROP_ASSIGNED', 'DROP_SHG_ACCEPTED',
      'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG',
      'DISPATCHED', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG',
      'DELIVERED', 'COMPLETED'
    ].includes((order.mainStatus || '').toUpperCase()) ||
      order.phase === 'DROP' ||
      Boolean(order.dropShgId || order.dropTransporterId || order.warehouseReceivedAt || order.storedAt);

    // 2. Pickup SHG: completed if order is picked or Phase 1 concluded
    let pickupShgState: 'completed' | 'active' | 'pending' = 'pending';
    const isShgPicked = isPhase1Concluded || [
      'PICKED', 'DROPPED', 'COMPLETED'
    ].includes((order.pickupShgStatus || '').toUpperCase()) || [
      'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER'
    ].includes((order.mainStatus || '').toUpperCase());

    if (isShgPicked || order.isPickupRedirected || order.pickupShgStatus === 'REDIRECTED') {
      pickupShgState = 'completed';
    } else if (['NEW', 'ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED'].includes((order.mainStatus || '').toUpperCase())) {
      pickupShgState = 'active';
    }

    // 3. Pickup Transporter: completed if parcel is delivered to hub or Phase 1 concluded
    let pickupTransporterState: 'completed' | 'active' | 'pending' = 'pending';
    const isTransPickupCompleted = isPhase1Concluded || [
      'DROPPED', 'COMPLETED'
    ].includes((order.pickupTransporterStatus || '').toUpperCase());

    if (isTransPickupCompleted) {
      pickupTransporterState = 'completed';
    } else if (['TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_SHG', 'REDIRECTED', 'IN_TRANSIT_TO_HUB'].includes((order.mainStatus || '').toUpperCase()) || ['ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKED'].includes((order.pickupTransporterStatus || '').toUpperCase())) {
      pickupTransporterState = 'active';
    }

    // 4. GMU Hub: completed if dispatched from hub or later status
    let gmuHubState: 'completed' | 'active' | 'pending' = 'pending';
    const isHubCompleted = ['DISPATCHED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'COMPLETED'].includes(order.mainStatus);
    if (isHubCompleted) {
      gmuHubState = 'completed';
    } else if (['IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'STORED', 'DROP_ASSIGNED', 'DROP ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED'].includes(order.mainStatus) || order.phase === 'DROP') {
      gmuHubState = 'active';
    }

    // 5. Drop Transporter: completed if parcel is at drop SHG/delivered
    let dropTransporterState: 'completed' | 'active' | 'pending' = 'pending';
    const isDropTransCompleted = ['PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'COMPLETED'].includes(order.mainStatus) || order.dropTransporterStatus === 'DROPPED' || order.dropTransporterStatus === 'COMPLETED';
    if (isDropTransCompleted) {
      dropTransporterState = 'completed';
    } else if (['DROP_ASSIGNED', 'DROP ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_BUYER', 'DISPATCHED'].includes(order.mainStatus) || order.phase === 'DROP') {
      dropTransporterState = 'active';
    }

    // 6. Drop SHG: completed if delivered/completed
    let dropShgState: 'completed' | 'active' | 'pending' = 'pending';
    const isDropShgCompleted = ['COMPLETED', 'DELIVERED'].includes(order.mainStatus) || order.dropShgStatus === 'DROPPED' || order.dropShgStatus === 'COMPLETED';
    if (isDropShgCompleted) {
      dropShgState = 'completed';
    } else if (['PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG'].includes(order.mainStatus) || (order.phase === 'DROP' && (order.dropShgStatus === 'PICKED' || order.dropShgStatus === 'PICKED_UP'))) {
      dropShgState = 'active';
    }

    // 7. Buyer: completed if delivered
    let buyerState: 'completed' | 'active' | 'pending' = 'pending';
    const isBuyerCompleted = ['COMPLETED', 'DELIVERED'].includes(order.mainStatus);
    if (isBuyerCompleted) {
      buyerState = 'completed';
    } else if (['PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG'].includes(order.mainStatus)) {
      buyerState = 'active';
    }

    const foundPickupShg = order.pickupShgDetails || (order.pickupShgId ? shgList.find((s: any) => String(s.id) === String(order.pickupShgId) || String(s.userId) === String(order.pickupShgId)) : null);
    const foundPickupTransporter = order.pickupTransporterDetails || (order.pickupTransporterId ? transporterList.find((t: any) => String(t.id) === String(order.pickupTransporterId) || String(t.userId) === String(order.pickupTransporterId)) : null);
    const foundDropShg = order.dropShgDetails || (order.dropShgId ? shgList.find((s: any) => String(s.id) === String(order.dropShgId) || String(s.userId) === String(order.dropShgId)) : null);
    const isDropTransporterAccepted = ['ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'COMPLETED', 'DELIVERED'].includes((order.dropTransporterStatus || '').toUpperCase());
    const foundDropTransporter = isDropTransporterAccepted ? (order.dropTransporterDetails || (order.dropTransporterId ? transporterList.find((t: any) => String(t.id) === String(order.dropTransporterId) || String(t.userId) === String(order.dropTransporterId)) : null)) : null;

    const cleanPersonName = (rawName?: string, defaultFallback: string = 'N/A') => {
      if (!rawName) return defaultFallback;
      return String(rawName).replace(/\s*\([^)]*\)/g, '').trim() || defaultFallback;
    };

    const getExactPickupShgStatus = () => {
      const st = (order.pickupShgStatus || '').toUpperCase();
      const main = (order.mainStatus || '').toUpperCase();
      if (['STORED', 'IN_TRANSIT_TO_HUB', 'DELIVERED_TO_HUB', 'DISPATCHED', 'COMPLETED'].includes(main) || ['PICKED', 'DELIVERED_TO_HUB', 'HANDED_OVER'].includes(st)) {
        return 'SHG Picked & Dropped to Transporter';
      }
      if (st === 'PICKED') return 'Parcel Picked from Seller';
      if (st === 'ACCEPTED' || main === 'PICKUP_SHG_ACCEPTED') return 'SHG Accepted';
      return 'SHG Pending';
    };

    const getExactPickupTransporterStatus = () => {
      const st = (order.pickupTransporterStatus || '').toUpperCase();
      const main = (order.mainStatus || '').toUpperCase();
      if (['STORED', 'DISPATCHED', 'COMPLETED'].includes(main) || st === 'DELIVERED_TO_HUB') {
        return 'Transporter Dropped to Hub';
      }
      if (st === 'PARCEL_PICKED' || main === 'IN_TRANSIT_TO_HUB') return 'In Transit to Hub';
      if (st === 'ACCEPTED' || st === 'TRANSPORTER_ACCEPTED') return 'Transporter Accepted';
      return 'Transporter Broadcast Pending';
    };

    const getExactDropTransporterStatus = () => {
      const st = (order.dropTransporterStatus || '').toUpperCase();
      const main = (order.mainStatus || '').toUpperCase();
      if (['PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED'].includes(main) || st === 'DELIVERED_TO_DROP_SHG') {
        return 'Transporter Dropped to Drop SHG';
      }
      if (['IN_TRANSIT_TO_DROP_SHG', 'DISPATCHED'].includes(main) || st === 'IN_TRANSIT_TO_DROP_SHG') return 'In Transit to Drop SHG';
      if (st === 'ACCEPTED' || st === 'DROP_TRANSPORTER_ACCEPTED') return 'Transporter Accepted';
      return 'Transporter Broadcast Pending';
    };

    const getExactDropShgStatus = () => {
      const st = (order.dropShgStatus || '').toUpperCase();
      const main = (order.mainStatus || '').toUpperCase();
      if (['DELIVERED', 'COMPLETED'].includes(main) || st === 'DELIVERED_TO_BUYER') return 'Delivered to Buyer';
      if (main === 'PARCEL_AT_DROP_SHG' || st === 'PARCEL_RECEIVED_AT_SHG') return 'Parcel Received at Drop SHG';
      if (st === 'ACCEPTED' || st === 'DROP_SHG_ACCEPTED') return 'Drop SHG Accepted';
      return 'Drop SHG Pending';
    };

    const nodes: Array<{ id: string; label: string; state: string; details: Record<string, any> | null }> = [
      {
        id: 'seller', label: 'Seller', state: sellerState, details: {
          'Person Name': cleanPersonName(order.sellerName || order.seller?.fullName, 'N/A'),
          'Role': 'Seller / Farmer',
          'Mobile Number': order.sellerMobile || order.seller?.mobile || 'N/A',
          'Address': order.sellerAddress || order.seller?.address || 'N/A',
          'Order ID': order.id,
          'Parcel Information': `${order.productCount || 1} product(s), Weight: ${order.weight || '0.5'} KG, Qty: ${order.quantity || 1} units`,
          'Accepted (Date & Time)': formatIndianDateTime(order.orderDate || order.createdAt),
          'Expected Delivery': getExpectedDeliveryDate(order.orderDate),
          'Status': 'PLACED',
          'History': getLogsForStage(['PLACED', 'PENDING_PICKUP', 'SELLER'])
        }
      },
      {
        id: 'pickup_shg', label: 'Pickup SHG', state: pickupShgState, details: {
          'Person Name': cleanPersonName(foundPickupShg?.leader || foundPickupShg?.crpName || foundPickupShg?.name || order.shgDetails?.name, 'N/A'),
          'Role': 'Pickup Self Help Group Member',
          'Mobile': foundPickupShg?.mobile || foundPickupShg?.phone || order.shgDetails?.mobile || 'N/A',
          'Address': foundPickupShg?.address || order.shgDetails?.address || 'N/A',
          'Order ID': order.id,
          'Accepted (Date & Time)': formatIndianDateTime(order.pickupShgAcceptedAt || (pickupShgState === 'completed' || pickupShgState === 'active' ? (order.createdAt || order.orderDate) : null)),
          'Pickup (Date & Time)': formatIndianDateTime(order.pickupShgPickedAt || (pickupShgState === 'completed' ? (order.storedAt || order.warehouseReceivedAt || order.updatedAt) : null)),
          'Status': getExactPickupShgStatus(),
          'History': getLogsForStage(['PICKUP_SHG', 'SHG_ACCEPTED', 'PARCEL_AT_SHG', 'PICKED'])
        }
      },
      {
        id: 'pickup_transporter', label: 'Pickup Transporter', state: pickupTransporterState, details: {
          'Person Name': (foundPickupTransporter || order.pickupTransporterDetails) ? cleanPersonName(foundPickupTransporter?.name || foundPickupTransporter?.fullName || order.pickupTransporterDetails?.name, 'Waiting for Transporter') : 'Waiting for Transporter',
          'Role': 'Pickup Transporter',
          'Mobile': (foundPickupTransporter || order.pickupTransporterDetails) ? (foundPickupTransporter?.mobile || foundPickupTransporter?.phone || order.pickupTransporterDetails?.mobile || 'N/A') : 'N/A',
          'Address': (foundPickupTransporter || order.pickupTransporterDetails) ? (foundPickupTransporter?.address || order.pickupTransporterDetails?.address || 'N/A') : 'N/A',
          'Vehicle': (foundPickupTransporter || order.pickupTransporterDetails) ? (foundPickupTransporter?.vehicle || foundPickupTransporter?.vehicleNumber || order.pickupTransporterDetails?.vehicle || 'N/A') : 'N/A',
          'Order ID': order.id,
          'Accepted (Date & Time)': formatIndianDateTime(order.pickupTransporterAcceptedAt || (pickupTransporterState === 'completed' || pickupTransporterState === 'active' ? (order.createdAt || order.orderDate) : null)),
          'Pickup (Date & Time)': formatIndianDateTime(order.pickupTransporterPickedAt || (pickupTransporterState === 'completed' ? (order.storedAt || order.warehouseReceivedAt || order.updatedAt) : null)),
          'Status': getExactPickupTransporterStatus(),
          'History': getLogsForStage(['TRANSPORTER_PICKUP', 'IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER'])
        }
      },
      {
        id: 'gmu_hub', label: 'GMU Hub', state: gmuHubState, details: {
          'Warehouse': 'GMU Hub Central Warehouse',
          'Order ID': order.id,
          'Parcel Information': `${order.productCount || 1} product(s), Weight: ${order.weight || '0.5'} KG, Qty: ${order.quantity || 1} units`,
          'Pickup (Intake Date & Time)': formatIndianDateTime(order.gmuHubIntakeAt || order.warehouseReceivedDate || order.warehouseReceivedAt || (gmuHubState === 'completed' || isPhase1Concluded ? (order.storedAt || order.createdAt) : null)),
          'Drop (Stored Date & Time)': formatIndianDateTime(order.gmuHubStoredAt || order.storedDate || order.storedAt || (gmuHubState === 'completed' || isPhase1Concluded ? (order.storedAt || order.createdAt) : null)),
          'Status': (isHubCompleted || order.mainStatus === 'STORED' || order.storedAt) ? 'STORED IN GMU HUB' : 'PENDING HUB INTAKE',
          'History': getLogsForStage(['WAREHOUSE', 'STORED', 'HUB_RECEIVED', 'PARCEL_AT_GMU'])
        }
      },
      {
        id: 'drop_transporter', label: 'Drop Transporter', state: dropTransporterState, details: {
          'Person Name': (isDropTransporterAccepted && (foundDropTransporter || order.dropTransporterDetails)) ? cleanPersonName(foundDropTransporter?.name || foundDropTransporter?.fullName || order.dropTransporterDetails?.name, 'Waiting for Transporter') : 'Waiting for Transporter',
          'Role': 'Drop Transporter',
          'Mobile': (isDropTransporterAccepted && (foundDropTransporter || order.dropTransporterDetails)) ? (foundDropTransporter?.mobile || foundDropTransporter?.phone || order.dropTransporterDetails?.mobile || 'N/A') : 'N/A',
          'Address': (isDropTransporterAccepted && (foundDropTransporter || order.dropTransporterDetails)) ? (foundDropTransporter?.address || order.dropTransporterDetails?.address || 'N/A') : 'N/A',
          'Vehicle': (isDropTransporterAccepted && (foundDropTransporter || order.dropTransporterDetails)) ? (foundDropTransporter?.vehicle || foundDropTransporter?.vehicleNumber || order.dropTransporterDetails?.vehicle || 'N/A') : 'N/A',
          'Order ID': order.id,
          'Accepted (Date & Time)': formatIndianDateTime(order.dropTransporterAcceptedAt || (dropTransporterState === 'completed' || dropTransporterState === 'active' ? (order.dispatchedAt || order.storedAt || order.updatedAt) : null)),
          'Pickup (Date & Time)': formatIndianDateTime(order.dropTransporterPickedAt || (dropTransporterState === 'completed' ? (order.dispatchedAt || order.updatedAt) : null)),
          'Status': getExactDropTransporterStatus(),
          'History': getLogsForStage(['TRANSPORTER_DROP_PICKUP', 'IN_TRANSIT_TO_BUYER', 'DROP_TRANSPORTER', 'DISPATCHED'])
        }
      },
      {
        id: 'drop_shg', label: 'Drop SHG', state: dropShgState, details: {
          'Person Name': cleanPersonName(foundDropShg?.leader || foundDropShg?.crpName || foundDropShg?.name || order.dropShgDetails?.name, 'N/A'),
          'Role': 'Drop Self Help Group Member',
          'Mobile': foundDropShg?.mobile || foundDropShg?.phone || order.dropShgDetails?.mobile || 'N/A',
          'Address': foundDropShg?.address || order.dropShgDetails?.address || 'N/A',
          'Order ID': order.id,
          'Accepted (Date & Time)': formatIndianDateTime(order.dropShgAcceptedAt || (dropShgState === 'completed' || dropShgState === 'active' ? (order.dispatchedAt || order.updatedAt) : null)),
          'Pickup (Date & Time)': formatIndianDateTime(order.dropShgPickedAt || (dropShgState === 'completed' ? order.updatedAt : null)),
          'Status': getExactDropShgStatus(),
          'History': getLogsForStage(['DROP_SHG', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'SHG_DROP_PICKUP'])
        }
      },
      {
        id: 'buyer', label: 'Buyer', state: buyerState, details: {
          'Person Name': order.buyerName || order.buyer?.fullName || 'N/A',
          'Role': 'Consignee / Buyer',
          'Mobile Number': order.buyerMobile || order.buyer?.mobile || 'N/A',
          'Address': order.buyerAddress || order.buyer?.address || 'N/A',
          'Order ID': order.id,
          'Receive (Date & Time)': formatIndianDateTime(order.buyerDeliveredAt || order.deliveredAt || (isBuyerCompleted ? order.updatedAt : null)),
          'Status': isBuyerCompleted ? 'DELIVERED' : 'PENDING',
          'History': getLogsForStage(['DELIVERED', 'COMPLETED', 'BUYER', 'FINAL_DELIVERY'])
        }
      }
    ];

    return nodes;
  };

  // Section Partition
  const isOrderRejected = (o: any) => {
    return ['REJECTED', 'SHG_PICKUP_DECLINED', 'TRANSPORTER_DECLINED', 'DECLINED'].includes(o.mainStatus) ||
      o.pickupShgStatus?.toLowerCase() === 'rejected' ||
      o.pickupTransporterStatus?.toLowerCase() === 'rejected' ||
      o.dropShgStatus?.toLowerCase() === 'rejected' ||
      o.dropTransporterStatus?.toLowerCase() === 'rejected' ||
      o.assignments?.some((a: any) => a.status?.toLowerCase() === 'rejected');
  };

  const isOrderNew = (o: any) => {
    if (o.pickupShgId || o.pickupShgDetails || o.mainStatus === 'PICKUP_ASSIGNED' || (o.pickupShgStatus && o.pickupShgStatus !== 'pending')) {
      return false;
    }
    return ['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING'].includes(o.mainStatus);
  };

  const isOrderReturn = (o: any) => {
    return (
      Boolean(o.returnType) ||
      Boolean(o.mainStatus && o.mainStatus.includes('RETURN'))
    );
  };

  const isTransporterReturnOrder = (o: any) => {
    if (o.returnType === 'TRANSPORTER_RETURN') return true;
    if (['TRANSPORTER_RETURN_PENDING', 'TRANSPORTER_RETURN_COMPLETED', 'INVENTORY_TRANSPORTER_RETURN'].includes(o.mainStatus)) return true;
    if (returnDropNewOrders.some((r: any) => r.id === o.id) || returnDropCompletedOrders.some((r: any) => r.id === o.id)) return true;
    return false;
  };

  const isBuyerReturnOrder = (o: any) => {
    if (o.returnType === 'BUYER_RETURN') return true;
    if ([
      'RETURN_PENDING', 'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG',
      'RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED',
      'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED',
      'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED', 'RETURN_PARCEL_AT_TRANSPORTER',
      'RETURN_PARCEL_AT_GMU', 'RETURN_PARCEL_AT_HUB'
    ].includes(o.mainStatus)) return true;
    if (returnPickupNewOrders.some((r: any) => r.id === o.id) || returnPickupCompletedOrders.some((r: any) => r.id === o.id)) return true;
    return false;
  };

  const newOrdersList = filterAndSearchOrders(
    allMergedOrders.filter(
      (o: any) =>
        !isOrderRejected(o) && isOrderNew(o)
    )
  );

  const inTransitOrdersList = filterAndSearchOrders(
    allMergedOrders.filter((o: any) => {
      if (isOrderRejected(o)) return false;
      if (isOrderNew(o)) return false;

      const isCompleted = ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'RETURN_COMPLETED', 'BUYER_RETURN_COMPLETED', 'TRANSPORTER_RETURN_COMPLETED'].includes(o.mainStatus);
      if (isCompleted) return false;

      // Stage filtering for Transit tab
      if (transitStatusFilter !== 'all') {
        const nodes = getTimelineNodes(o);
        const activeNode = nodes.find(n => n.state === 'active');
        if (!activeNode || activeNode.id !== transitStatusFilter) return false;
      }

      return true;
    })
  );

  const completedOrdersList = filterAndSearchOrders(
    allMergedOrders.filter((o: any) =>
      !isOrderRejected(o) &&
      !isOrderReturn(o) &&
      ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'RETURN_COMPLETED', 'BUYER_RETURN_COMPLETED', 'TRANSPORTER_RETURN_COMPLETED'].includes(o.mainStatus)
    )
  );

  const transporterReturnOrdersList = filterAndSearchOrders(
    allMergedOrders.filter((o: any) => isOrderReturn(o) && isTransporterReturnOrder(o))
  );

  const buyerReturnOrdersList = filterAndSearchOrders(
    allMergedOrders.filter((o: any) => isOrderReturn(o) && !isTransporterReturnOrder(o))
  );

  const returnOrdersList = filterAndSearchOrders(
    allMergedOrders.filter((o: any) => isOrderReturn(o))
  );

  const transporterRejectOrdersList = filterAndSearchOrders(
    allMergedOrders.filter((o: any) =>
      isOrderRejected(o) &&
      !isOrderReturn(o) &&
      o.returnType !== 'TRANSPORTER_RETURN'
    )
  );



  const delayedCount = allMergedOrders.filter((o: any) =>
    o.rescheduleType ||
    ['delayed', 'DELAYED'].includes(o.pickupShgStatus) ||
    ['delayed', 'DELAYED'].includes(o.pickupTransporterStatus) ||
    ['delayed', 'DELAYED'].includes(o.dropTransporterStatus) ||
    ['delayed', 'DELAYED'].includes(o.dropShgStatus)
  ).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrdersCount = allMergedOrders.filter((o: any) => {
    const oDate = o.orderDate || (o.created_at ? o.created_at.split(' ')[0] : '');
    return oDate && oDate.includes(todayStr);
  }).length;

  const calculateProgressWidth = (nodes: any[]) => {
    const completedIndex = nodes.reduce((max: number, node: any, idx: number) => {
      if (node.state === 'completed') return idx;
      return max;
    }, -1);

    if (completedIndex === -1) return '0%';
    if (completedIndex === nodes.length - 1) return '100%';

    const basePercent = (completedIndex / (nodes.length - 1)) * 100;
    const activeNext = nodes[completedIndex + 1]?.state === 'active';
    const extra = activeNext ? (0.5 / (nodes.length - 1)) * 100 : 0;
    return `${Math.min(basePercent + extra, 100)}%`;
  };



  const getNodeTimeAndDate = (order: any, nodeLabel: string) => {
    const lbl = nodeLabel.toLowerCase();
    let timestamp: string | null = null;

    const isBuyerReturn = order.returnType === 'BUYER_RETURN' || [
      'RETURN_PENDING', 'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
      'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
      'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED',
      'RETURN_PARCEL_AT_TRANSPORTER', 'RETURN_PARCEL_AT_GMU', 'RETURN_PARCEL_AT_HUB'
    ].includes(order.mainStatus);

    if (order.tracking && order.tracking.length > 0) {
      let statusKeywords: string[] = [];
      if (isBuyerReturn) {
        if (lbl === 'buyer') {
          statusKeywords = ['RETURN_SHG_PENDING'];
        } else if (lbl === 'shg') {
          statusKeywords = ['RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG'];
        } else if (lbl === 'transporter') {
          statusKeywords = ['RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB'];
        } else if (lbl === 'gmu hub' || lbl === 'last hub' || lbl === 'hub') {
          statusKeywords = ['BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'];
        }
      } else {
        if (lbl === 'seller') {
          statusKeywords = ['ORDER_PLACED', 'CREATED', 'PLACED'];
        } else if (lbl === 'pickup shg') {
          statusKeywords = ['PARCEL_AT_SHG', 'PICKED', 'PICKUP_SHG_ACCEPTED', 'SHG_ACCEPTED'];
        } else if (lbl === 'pickup transporter') {
          statusKeywords = ['TRANSPORTER_ACCEPTED', 'TRANSPORTER_PICKUP', 'IN_TRANSIT_TO_HUB'];
        } else if (lbl === 'gmu hub') {
          statusKeywords = ['HUB_RECEIVED', 'PARCEL_AT_GMU', 'STORED', 'DISPATCHED'];
        } else if (lbl === 'drop transporter') {
          statusKeywords = ['DROP_TRANSPORTER', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_DROP_SHG'];
        } else if (lbl === 'drop shg') {
          statusKeywords = ['DROP_SHG', 'DROP_SHG_ACCEPTED', 'PARCEL_AT_DROP_SHG'];
        } else if (lbl === 'buyer') {
          statusKeywords = ['DELIVERED', 'COMPLETED'];
        }
      }

      const event = order.tracking.find((t: any) =>
        statusKeywords.some(kw => t.status === kw || t.status?.toUpperCase().includes(kw))
      );
      if (event) {
        timestamp = event.updatedAt || event.scanTime || event.createdAt;
      }
    }

    if (!timestamp) {
      if (isBuyerReturn) {
        if (lbl === 'buyer') {
          timestamp = order.createdAt;
        } else if (lbl === 'shg') {
          timestamp = order.shgDetails?.acceptedAt || order.acceptedAt;
        } else if (lbl === 'transporter') {
          timestamp = order.transporterDetails?.acceptedAt;
        } else if (lbl === 'gmu hub') {
          timestamp = order.storedAt || order.warehouseReceivedAt;
        }
      } else {
        if (lbl === 'seller') {
          timestamp = order.createdAt || order.orderDate;
        } else if (lbl === 'pickup shg') {
          timestamp = order.pickupShgDetails?.acceptedAt || order.acceptedAt;
        } else if (lbl === 'pickup transporter') {
          timestamp = order.pickupTransporterDetails?.acceptedAt;
        } else if (lbl === 'gmu hub') {
          timestamp = order.warehouseReceivedDate || order.warehouseReceivedAt;
        } else if (lbl === 'drop transporter') {
          timestamp = order.dropTransporterDetails?.acceptedAt;
        } else if (lbl === 'drop shg') {
          timestamp = order.dropShgDetails?.acceptedAt;
        } else if (lbl === 'buyer') {
          timestamp = order.deliveredAt || order.completedAt;
        }
      }
    }

    if (timestamp) {
      const dt = new Date(timestamp);
      if (!isNaN(dt.getTime())) {
        const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const date = dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        return { time, date };
      }
    }
    return null;
  };



  // Redesign Columns for New & Completed sections
  const pickupNewColumns = [
    { header: 'Order ID', accessor: 'id' as keyof PickupOrder },
    { header: 'Seller Name', accessor: 'sellerName' as keyof PickupOrder },
    { header: 'Seller Mobile', accessor: 'sellerMobile' as keyof PickupOrder },
    { header: 'Seller Village/City', accessor: 'sellerVillage' as keyof PickupOrder },
    { header: 'Seller Pincode', accessor: 'sellerPincode' as keyof PickupOrder },
    { header: 'Product Count', accessor: 'productCount' as keyof PickupOrder },
    { header: 'Total Qty', accessor: 'totalQty' as keyof PickupOrder },
    { header: 'Total Weight (KG)', accessor: 'totalWeight' as keyof PickupOrder },
    { header: 'Start Date', accessor: (row: any) => (row.orderDate ? row.orderDate.split(' ')[0].split('T')[0] : (row.created_at ? row.created_at.split(' ')[0] : '-')) },
    { header: 'Expected Delivery Date', accessor: (row: any) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    {
      header: 'SHG Status',
      accessor: (row: any) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={row.pickupShgStatus || 'pending'} />
          {(row.isPickupRedirected || row.pickupShgStatus === 'REDIRECTED') && (
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
              Redirected
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Action', accessor: (row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewOrder(row);
          }}
          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#073318] rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-1.5 px-3 font-semibold text-xs transition-colors cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </button>
      )
    },
  ];

  const completedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof DropOrder },
    {
      header: 'Status', accessor: (row: any) => (
        <span className="bg-emerald-50 text-[#073318] border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider font-sans">
          Completed
        </span>
      )
    },
    {
      header: 'QR Codes', accessor: (row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleParcelQrClick(row.id);
          }}
          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#073318] rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
        >
          <QrCode className="h-2.5 w-2.5" />
          <span>View QRs</span>
        </button>
      )
    },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof DropOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof DropOrder },
    { header: 'Completed Date', accessor: (row: any) => row.deliveredAt ? row.deliveredAt.split('T')[0] : (row.updated_at ? row.updated_at.split(' ')[0] : '-') },
    { header: 'Priority', accessor: (row: any) => <StatusBadge status={row.priority} /> },
    { header: 'Product Count', accessor: 'productCount' as keyof DropOrder },
    { header: 'Total Qty', accessor: 'totalQty' as keyof DropOrder },
    {
      header: 'Action', accessor: (row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewOrder(row);
            }}
            className="p-1.5 hover:bg-slate-150 text-[#073318] rounded-lg border border-slate-200 flex items-center justify-center gap-1 font-semibold text-xs cursor-pointer shadow-xs"
          >
            <Eye className="h-3 w-3" />
            <span>View</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(`Downloading logistics report for order ${row.id}`);
            }}
            className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex items-center justify-center gap-1 font-semibold text-xs cursor-pointer shadow-xs"
          >
            <span>PDF</span>
          </button>

          {row.mainStatus !== 'RETURN_PENDING' && row.mainStatus !== 'RETURN_COMPLETED' && !row.returnType && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to request a return for this buyer?')) {
                  setActionProcessing(true);
                  try {
                    await requestBuyerReturn(row.uuid || row.id);
                    alert('Buyer return request created successfully.');
                    await loadData();
                  } catch (err: any) {
                    alert(err.message || 'Failed to request return.');
                  } finally {
                    setActionProcessing(false);
                  }
                }
              }}
              className="p-1.5 hover:bg-rose-50 text-rose-700 rounded-lg border border-rose-100 flex items-center justify-center gap-1 font-semibold text-xs cursor-pointer shadow-xs"
            >
              <span>Return</span>
            </button>
          )}
        </div>
      )
    },
  ];



  const returnColumns = [
    {
      header: 'Order ID',
      accessor: (row: any) => (
        <div className="flex items-center gap-1 font-black text-slate-800 tracking-tight">
          <span>{row.id}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(row.id);
              showNotification(`Copied Order ID ${row.id} to clipboard!`, 'success');
            }}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Copy Order ID"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )
    },
    {
      header: 'Seller Name',
      accessor: (row: any) => row.sellerName || row.seller?.fullName || 'N/A'
    },
    {
      header: 'Seller Village',
      accessor: (row: any) => row.sellerVillage || row.seller?.village || row.sellerAddress || 'N/A'
    },
    {
      header: 'Buyer Name',
      accessor: (row: any) => row.buyerName || row.buyer?.fullName || 'N/A'
    },
    {
      header: 'Buyer Address',
      accessor: (row: any) => row.buyerAddress || row.buyer?.address || 'N/A'
    },
    {
      header: 'Product Count',
      accessor: (row: any) => row.productCount || (row.items ? row.items.length : 1)
    },
    {
      header: 'Total Weight',
      accessor: (row: any) => `${row.totalWeight || row.weight || 0} kg`
    },
    {
      header: 'Reject Reason',
      accessor: (row: any) => {
        const ptStatus = (row.pickupTransporterStatus || '').toUpperCase();
        const main = (row.mainStatus || '').toUpperCase();
        const isPickedUp = ['PICKED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'DROPPED', 'DELIVERED_TO_HUB', 'COMPLETED'].includes(ptStatus) || ['IN_TRANSIT_TO_HUB', 'PARCEL_PICKED', 'DELIVERED_TO_HUB', 'COMPLETED'].includes(main);
        const isPrePickup = !isPickedUp && row.returnType !== 'TRANSPORTER_RETURN';
        
        const isInvalidReason = (str?: string | null) => !str || str.toLowerCase().includes('registered') || str.toLowerCase().includes('synchronized');
        const candidateReason = (!isInvalidReason(row.rejectReason) ? row.rejectReason : null) ||
          (!isInvalidReason(row.remarks) ? row.remarks : null) ||
          (!isInvalidReason(row.pickupRejectReason) ? row.pickupRejectReason : null) ||
          (!isInvalidReason(row.dropRejectReason) ? row.dropRejectReason : null) ||
          (!isInvalidReason(row.tracking?.[0]?.remarks) ? row.tracking[0].remarks : null);
        const reason = candidateReason || (isPrePickup ? 'Pre-Pickup Declined by Transporter' : 'Recipient Unavailable - Return to Hub');
          
        const rejectedBy = row.rejectedByName || row.pickupTransporterName || row.pickupTransporterDetails?.name || row.dropTransporterName || row.dropTransporterDetails?.name || 'Transporter';
        return (
          <div className="flex flex-col gap-0.5 text-left max-w-[220px]">
            <span className="font-extrabold text-xs text-rose-700 leading-tight">
              {reason}
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              By: {rejectedBy}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: (row: any) => {
        const ptStatus = (row.pickupTransporterStatus || '').toUpperCase();
        const main = (row.mainStatus || '').toUpperCase();
        const isPickedUp = ['PICKED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'DROPPED', 'DELIVERED_TO_HUB', 'COMPLETED'].includes(ptStatus) || ['IN_TRANSIT_TO_HUB', 'PARCEL_PICKED', 'DELIVERED_TO_HUB', 'COMPLETED'].includes(main);
        const isPrePickup = !isPickedUp && row.returnType !== 'TRANSPORTER_RETURN';
        return (
          <div className="flex flex-col gap-1 items-start">
            <StatusBadge status={row.mainStatus} />
            <span className="inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded uppercase tracking-wider">
              {isPrePickup ? '⚠️ Pre-Pickup Rejection' : (isTransporterReturnOrder(row) ? '🚛 Transporter Return' : '👤 Buyer Return')}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Action',
      accessor: (row: any) => {
        const ptStatus = (row.pickupTransporterStatus || '').toUpperCase();
        const main = (row.mainStatus || '').toUpperCase();
        const isPickedUp = ['PICKED', 'PARCEL_PICKED', 'IN_TRANSIT_TO_HUB', 'DROPPED', 'DELIVERED_TO_HUB', 'COMPLETED'].includes(ptStatus) || ['IN_TRANSIT_TO_HUB', 'PARCEL_PICKED', 'DELIVERED_TO_HUB', 'COMPLETED'].includes(main);
        const isPrePickup = !isPickedUp && row.returnType !== 'TRANSPORTER_RETURN';
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewOrder(row);
              }}
              title="View Details"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#073318] rounded-xl border border-slate-200 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <Eye className="h-3.5 w-3.5 text-[#073318]" />
              <span>View</span>
            </button>

            {!isPrePickup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIntakeClick(row, isTransporterReturnOrder(row) ? 'return-drop' : 'return-pickup');
                }}
                title="In Take"
                className="px-2.5 py-1.5 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                <QrCode className="h-3.5 w-3.5 text-[#B2D534]" />
                <span>IN TTAKE</span>
              </button>
            )}
          </div>
        );
      }
    },
  ];


  return (
    <Layout currentPage="order-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Modern Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Order Management</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">Track every parcel from Seller to Buyer.</p>
            </div>
          </div>


          {/* Compact Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            {/* Search Bar */}
            <div className="flex-1 min-w-[200px] relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search ID, Barcode, Seller, Buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#073318]/50"
              />
            </div>


            <button
              onClick={handleOpenAddOrderModalPickup}
              className="px-3.5 py-1.5 bg-[#B2D534] hover:bg-[#B2D534]/90 text-[#073318] rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3px]" />
              <span>Add Order</span>
            </button>
          </div>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex bg-slate-100 border border-slate-200 rounded-2xl p-1 max-w-2xl">
            <button
              onClick={() => handleTabChange('new')}
              className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTopTab === 'new'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <span>New Orders</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTopTab === 'new' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'}`}>
                {newOrdersList.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('in_transit')}
              className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTopTab === 'in_transit'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <span>In Transit</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTopTab === 'in_transit' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'}`}>
                {inTransitOrdersList.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('completed')}
              className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTopTab === 'completed'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <span>Completed</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTopTab === 'completed' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'}`}>
                {completedOrdersList.length}
              </span>
            </button>



            <button
              onClick={() => handleTabChange('returned')}
              className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTopTab === 'returned'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <span>Return Orders</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTopTab === 'returned' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'}`}>
                {returnOrdersList.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('rejected')}
              className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTopTab === 'rejected'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <span>Transporter Reject</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTopTab === 'rejected' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'}`}>
                {transporterRejectOrdersList.length}
              </span>
            </button>
          </div>

          {/* Shifted Filter Date & Refresh Component */}
          <div className="flex items-center gap-3">
            {activeTopTab === 'new' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                <span className="text-[10px] font-extrabold text-[#073318]/70 uppercase tracking-wider whitespace-nowrap">Start Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent border-0 text-xs focus:outline-none cursor-pointer font-extrabold text-slate-750"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="text-red-500 hover:text-red-750 font-extrabold text-xs ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {activeTopTab === 'in_transit' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-205/80 rounded-xl px-3 py-1.5 shadow-xs">
                <span className="text-[10px] font-extrabold text-[#073318]/70 uppercase tracking-wider whitespace-nowrap">Stage:</span>
                <select
                  value={transitStatusFilter}
                  onChange={(e) => {
                    setTransitStatusFilter(e.target.value);
                    setTransitPage(1);
                  }}
                  className="bg-transparent border-0 text-xs focus:outline-none cursor-pointer font-extrabold text-slate-750 pr-4"
                >
                  <option value="all">All Stages</option>
                  <option value="pickup_shg">Pickup SHG</option>
                  <option value="pickup_transporter">Pickup Transporter</option>
                  <option value="gmu_hub">GMU Hub</option>
                  <option value="drop_transporter">Drop Transporter</option>
                  <option value="drop_shg">Drop SHG</option>
                </select>
              </div>
            )}

            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-4 py-2 text-xs font-extrabold text-white bg-[#073318] hover:bg-[#073318]/95 disabled:opacity-75 border border-[#073318] rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* ---------------- SECTION 1: NEW ORDERS ---------------- */}
        {activeTopTab === 'new' && (
          <div className="space-y-4">
            {newOrdersList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3 font-semibold shadow-xs">
                <span className="text-4xl block">📦</span>
                <p className="text-sm">No new orders found matching the filter criteria.</p>
              </div>
            ) : (
              <DataTable
                columns={pickupNewColumns}
                data={newOrdersList}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={() => loadData(true)}
                hideDateAndRefresh={true}
                hideSearchAndFilters={true}
                grabToScroll={true}
              />
            )}
          </div>
        )}

        {/* ---------------- SECTION 2: IN TRANSIT ORDERS ---------------- */}
        {activeTopTab === 'in_transit' && (
          <div className="space-y-6">
            <style dangerouslySetInnerHTML={{
              __html: `
              @keyframes activePulse {
                0% {
                  box-shadow: 0 0 0 0 rgba(178, 213, 52, 0.7);
                }
                70% {
                  box-shadow: 0 0 0 10px rgba(178, 213, 52, 0);
                }
                100% {
                  box-shadow: 0 0 0 0 rgba(178, 213, 52, 0);
                }
              }
              @keyframes lineDraw {
                from { width: 0%; }
                to { width: var(--progress-width); }
              }
              .active-node-glow {
                animation: activePulse 2s infinite;
              }
              .line-progress-animate {
                animation: lineDraw 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
              }
            `}} />
            {inTransitOrdersList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3 font-semibold shadow-xs">
                <span className="text-4xl block">🚚</span>
                <p className="text-sm">No orders currently in transit matching the filter criteria.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {inTransitOrdersList
                    .slice((transitPage - 1) * transitItemsPerPage, transitPage * transitItemsPerPage)
                    .map((order) => {
                      const isExpanded = !!expandedOrders[order.id];
                      const nodes = getTimelineNodes(order);

                      const needsIntake = ['IN_TRANSIT_TO_HUB', 'RETURN_IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'RETURN_PARCEL_AT_TRANSPORTER', 'PARCEL_PICKED', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'RETURN_PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'RETURN_PARCEL_AT_HUB'].includes(order.mainStatus) && !['STORED', 'DROP_PENDING', 'DROP_CREATED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.mainStatus);
                      const needsBarcode = ['IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB'].includes(order.mainStatus) && !order.barcode;

                      return (
                        <div
                          key={order.id}
                          className="bg-white border border-slate-205/85 rounded-2xl pt-7 pb-4 px-5 shadow-sm hover:shadow-md transition-all duration-300 text-left flex flex-col lg:flex-row items-center justify-between gap-4 relative overflow-hidden pl-6"
                        >
                          {/* Decorative Left Border based on Priority */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[5px] ${order.priority?.toLowerCase() === 'high'
                            ? 'bg-[#EF4444]'
                            : order.priority?.toLowerCase() === 'medium'
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#10B981]'
                            }`} />

                          {/* Center Column (Visual Journey Stepper) */}
                          <div className="flex-1 w-full relative px-2 pt-9 pb-3 overflow-x-auto scrollbar-none select-none">
                            <div className="min-w-[700px] relative flex items-center justify-between h-12">

                              {/* Horizontal Connecting Line Track */}
                              <div className="absolute left-[30px] right-[30px] top-[16px] h-[3px] bg-slate-100 rounded-full -z-0" />

                              {/* Segmented active/completed highlight line */}
                              <div className="absolute left-[30px] right-[30px] top-[16px] h-[3px] -z-0 flex">
                                {nodes.slice(0, -1).map((node, idx) => {
                                  const nextNode = nodes[idx + 1];
                                  let segmentBg = 'bg-slate-200'; // Pending

                                  if (node.state === 'completed' && nextNode.state === 'completed') {
                                    segmentBg = 'bg-[#073318]'; // completed (sidebar green)
                                  } else if (
                                    (node.state === 'completed' && nextNode.state === 'active') ||
                                    node.state === 'active'
                                  ) {
                                    segmentBg = 'bg-gradient-to-r from-[#073318] to-[#0284C7]'; // active gradient
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      className={`flex-1 h-full transition-all duration-300 ${segmentBg}`}
                                    />
                                  );
                                })}
                              </div>

                              {/* Stepper Nodes */}
                              {nodes.map((node, idx) => {
                                const isRedirectedSHG = node.id === 'pickup_shg' && (
                                  order.isPickupRedirected ||
                                  order.isRedirected ||
                                  order.pickupShgStatus === 'REDIRECTED' ||
                                  (order.mainStatus || '').toUpperCase() === 'REDIRECTED' ||
                                  (order.tracking && order.tracking.some((t: any) => String(t.status || t.remarks || t.action || '').toUpperCase().includes('REDIRECT')))
                                );
                                const nodeLabel = node.label;
                                const isClickable = !isRedirectedSHG;

                                let nodeBg = 'bg-slate-50 border-slate-200 text-slate-355';
                                let iconContent = null;
                                let labelColor = 'text-slate-405';
                                let ringClass = '';

                                // Node Labels & Icons mapping
                                const getIconForNode = (label: string) => {
                                  const lbl = label.toLowerCase();
                                  if (lbl === 'seller') return <Store className="h-3.5 w-3.5" />;
                                  if (lbl.includes('shg')) return <Users className="h-3.5 w-3.5" />;
                                  if (lbl.includes('transporter')) return <Truck className="h-3.5 w-3.5" />;
                                  if (lbl.includes('gmu') || lbl.includes('hub')) return <Home className="h-3.5 w-3.5" />;
                                  return <User className="h-3.5 w-3.5" />;
                                };

                                const iconElement = getIconForNode(node.label);

                                if (isRedirectedSHG) {
                                  nodeBg = 'bg-purple-100 border-purple-400 text-purple-700 border-dashed shadow-xs';
                                  iconContent = (
                                    <div className="relative">
                                      {iconElement}
                                      <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full h-2.5 w-2.5 flex items-center justify-center text-[6px] font-black leading-none" title="Bypassed">↪</span>
                                    </div>
                                  );
                                  labelColor = 'text-purple-800 font-extrabold';
                                } else if (node.state === 'completed') {
                                  nodeBg = 'bg-[#073318] border-[#073318] text-white shadow-xs';
                                  iconContent = (
                                    <div className="relative">
                                      {iconElement}
                                      <span className="absolute -bottom-1 -right-1 bg-[#B2D534] text-[#073318] border border-white rounded-full h-2.5 w-2.5 flex items-center justify-center text-[6px] font-black leading-none">✓</span>
                                    </div>
                                  );
                                  labelColor = 'text-[#073318] font-bold';
                                } else if (node.state === 'active') {
                                  nodeBg = 'bg-[#0284C7] border-[#0284C7] text-white shadow-md ring-4 ring-[#0284C7]/20';
                                  iconContent = (
                                    <div className="relative animate-pulse">
                                      {iconElement}
                                    </div>
                                  );
                                  labelColor = 'text-[#0284C7] font-black';
                                  ringClass = 'active-node-ring-blue';
                                } else {
                                  nodeBg = 'bg-slate-50 border-slate-200 text-slate-350 opacity-60';
                                  iconContent = iconElement;
                                }

                                const dateDetails = getNodeTimeAndDate(order, node.label);

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => isClickable && handleNodeClick(node.label, node.details, order)}
                                    className={`flex flex-col items-center group relative z-10 transition-all duration-300 timeline-node-hover w-[60px] shrink-0 ${isClickable ? 'cursor-pointer' : ''}`}
                                  >
                                    {/* Current Location floating badge above active node */}
                                    {node.state === 'active' && (
                                      <div className="absolute -top-8 flex flex-col items-center gap-0.5 whitespace-nowrap z-50">
                                        <span className="text-[9px] font-black text-[#073318] tracking-wide uppercase">Current Location</span>
                                        <span className="text-[#073318] text-[8px] leading-none animate-bounce">▼</span>
                                      </div>
                                    )}

                                    <div className={`h-[32px] w-[32px] rounded-full border-2 flex items-center justify-center font-bold transition-all relative ${nodeBg} ${ringClass} ${isClickable ? 'cursor-pointer' : ''}`}>
                                      {iconContent}
                                      {/* Orbiting Satellite Dots Radar Ring */}
                                      {node.state === 'active' && (
                                        <div className="absolute inset-0 -m-2.5 border border-[#0284C7]/60 border-dashed rounded-full animate-[spin_8s_linear_infinite] flex items-center justify-center pointer-events-none z-0">
                                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0284C7]" />
                                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#0284C7]" />
                                          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-[#0284C7]" />
                                          <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-[#0284C7]" />
                                        </div>
                                      )}
                                    </div>
                                    <span className={`text-[9px] font-extrabold mt-1.5 uppercase tracking-widest ${labelColor} transition-colors group-hover:text-slate-905 whitespace-nowrap`}>
                                      {nodeLabel}
                                    </span>
                                    {/* Timestamp underneath completed/active nodes */}
                                    {isRedirectedSHG ? (
                                      <span className="text-[8px] font-extrabold text-purple-700 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded mt-1 uppercase tracking-wider">Redirected</span>
                                    ) : node.state === 'active' ? (
                                      <span className="text-[8px] font-extrabold text-[#0284C7] bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded mt-1 uppercase tracking-wider animate-pulse">In process</span>
                                    ) : dateDetails ? (
                                      <span className="text-[8px] font-medium text-slate-400 text-center leading-tight mt-1">
                                        <span className="block font-bold text-slate-600">{dateDetails.time}</span>
                                        <span className="block">{dateDetails.date}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-medium text-slate-305 mt-1">-</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right Column (Status, ID & Actions) */}
                          <div className="w-full lg:w-[320px] shrink-0 flex flex-col items-center justify-between gap-3 border-t lg:border-t-0 lg:border-l border-slate-150 pt-2 lg:pt-0 lg:pl-6 self-stretch py-1 overflow-visible">
                            {/* Top row: Status info badge and time ago (centered) */}
                            <div className="flex flex-col items-center text-center space-y-0.5">
                              <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-2.5 py-0.5 ${(order.mainStatus || '').toUpperCase() === 'REDIRECTED'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : 'bg-[#073318]/10 text-[#073318] border border-[#073318]/20'
                                } rounded-full uppercase tracking-wider`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${(order.mainStatus || '').toUpperCase() === 'REDIRECTED' ? 'bg-purple-600' : 'bg-[#073318]'
                                  }`} />
                                {order.mainStatus.replace(/[-_]/g, ' ')}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-semibold">
                                • {getUpdatedTimeAgo(order)}
                              </span>
                            </div>

                            {/* Bottom row: ID (left-aligned) & action buttons (right-aligned) */}
                            <div className="w-full flex flex-row items-center justify-between gap-2 overflow-visible">
                              {/* Order ID display styled as "ID - [id number]" */}
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs font-black text-slate-800 tracking-tight whitespace-nowrap">
                                  {(() => {
                                    const match = order.id.match(/(?:PICK|PH2|PICK-HEAVY)-(.+)$/i);
                                    return `ID - ${match ? match[1] : order.id}`;
                                  })()}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.id);
                                    alert(`Order ID ${order.id} copied to clipboard!`);
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                                  title="Copy Order ID"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>

                              <div className="flex flex-row gap-1.5 items-center shrink-0">
                                {needsIntake && (
                                  <button
                                    onClick={() => {
                                      const intakeKind = order.returnType
                                        ? (order.returnType === 'BUYER_RETURN' ? 'return-pickup' : 'return-drop')
                                        : 'pickup';
                                      handleIntakeClick(order, intakeKind);
                                    }}
                                    title="Scan to Intake"
                                    className="px-2.5 py-1.5 bg-[#073318] hover:bg-[#073318]/90 text-white border border-[#073318]/20 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm text-[10px] shrink-0 active-node-glow"
                                  >
                                    <QrCode className="h-3.5 w-3.5 text-[#B2D534]" />
                                    <span>Scan</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleViewOrder(order)}
                                  title="View Details"
                                  className="p-2 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
                                >
                                  <Eye className="h-4 w-4 text-[#B2D534]" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details Section */}
                          {isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-slate-100 animate-in fade-in duration-200">
                              {/* Product Details Table */}
                              <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 text-left space-y-3 shadow-xs">
                                <h5 className="font-extrabold text-[#073318] text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5" />
                                  Product Details
                                </h5>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                        <th className="pb-1.5">Item Name</th>
                                        <th className="pb-1.5">Qty</th>
                                        <th className="pb-1.5">Weight</th>
                                        <th className="pb-1.5 text-right">Price</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-650 font-semibold">
                                      {order.items && order.items.length > 0 ? (
                                        order.items.map((item: any, idx: number) => (
                                          <tr key={idx}>
                                            <td className="py-2 text-slate-800 font-bold">{item.name}</td>
                                            <td className="py-2">{item.quantity}</td>
                                            <td className="py-2">{item.weight} kg</td>
                                            <td className="py-2 text-right">₹{item.price}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={4} className="py-2 text-center text-slate-400 italic">
                                            No items specified.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Chronological History Log */}
                              <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 text-left space-y-3 shadow-xs">
                                <h5 className="font-extrabold text-[#073318] text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5" />
                                  Chronological History
                                </h5>

                                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                                  {order.tracking && order.tracking.length > 0 ? (
                                    order.tracking.map((t: any, idx: number) => {
                                      const timeStr = t.updatedAt
                                        ? new Date(t.updatedAt).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })
                                        : '08:30 AM';
                                      return (
                                        <div key={idx} className="flex gap-3 text-xs">
                                          <span className="font-bold text-[#073318] shrink-0 font-mono">{timeStr}</span>
                                          <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                                          <span className="text-slate-600 font-semibold font-sans">
                                            {t.remarks || t.status.replace(/[-_]/g, ' ')}
                                          </span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="flex gap-3 text-xs">
                                      <span className="font-bold text-[#073318] shrink-0 font-mono">08:30 AM</span>
                                      <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                                      <span className="text-slate-655 font-semibold font-sans">Order Placed</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Pagination controls */}
                {inTransitOrdersList.length > transitItemsPerPage && (
                  <div className="flex justify-between items-center py-4 bg-slate-50 px-6 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
                    <button
                      disabled={transitPage === 1}
                      onClick={() => setTransitPage((prev) => prev - 1)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-white rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span>Page {transitPage} of {Math.ceil(inTransitOrdersList.length / transitItemsPerPage)}</span>
                    <button
                      disabled={transitPage >= Math.ceil(inTransitOrdersList.length / transitItemsPerPage)}
                      onClick={() => setTransitPage((prev) => prev + 1)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-white rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ---------------- SECTION 3: COMPLETED ORDERS ---------------- */}
        {activeTopTab === 'completed' && (
          <div className="space-y-4">
            {completedOrdersList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3 font-semibold shadow-xs">
                <span className="text-4xl block">✓</span>
                <p className="text-sm">No completed orders found matching the filter criteria.</p>
              </div>
            ) : (
              <DataTable
                columns={completedColumns}
                data={completedOrdersList}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={() => loadData(true)}
                hideDateAndRefresh={true}
                hideSearchAndFilters={true}
              />
            )}
          </div>
        )}



        {/* ---------------- SECTION 5: RETURN ORDERS ---------------- */}
        {activeTopTab === 'returned' && (
          <div className="space-y-6">
            {/* Return Sub-Tabs Navigation */}
            <div className="flex items-center gap-3 bg-white p-2 border border-slate-205/85 rounded-2xl shadow-xs">
              <button
                onClick={() => {
                  setActiveReturnSubTab('transporter');
                  setReturnPage(1);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${activeReturnSubTab === 'transporter'
                    ? 'bg-[#073318] text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                  }`}
              >
                <Truck className={`h-4 w-4 ${activeReturnSubTab === 'transporter' ? 'text-[#B2D534]' : 'text-slate-500'}`} />
                <span>Transporter Return</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeReturnSubTab === 'transporter'
                      ? 'bg-[#B2D534] text-[#073318]'
                      : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {transporterReturnOrdersList.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveReturnSubTab('buyer');
                  setReturnPage(1);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${activeReturnSubTab === 'buyer'
                    ? 'bg-[#073318] text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                  }`}
              >
                <User className={`h-4 w-4 ${activeReturnSubTab === 'buyer' ? 'text-[#B2D534]' : 'text-slate-500'}`} />
                <span>Buyer Return</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeReturnSubTab === 'buyer'
                      ? 'bg-[#B2D534] text-[#073318]'
                      : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {buyerReturnOrdersList.length}
                </span>
              </button>
            </div>

            {/* Table View */}
            <DataTable
              columns={returnColumns}
              data={activeReturnSubTab === 'transporter' ? transporterReturnOrdersList : buyerReturnOrdersList}
              selectedDate={dateFilter}
              onDateChange={setDateFilter}
              onRowDoubleClick={handleViewOrder}
              onRefresh={() => loadData(true)}
              hideDateAndRefresh={true}
              hideSearchAndFilters={true}
              grabToScroll={true}
            />
          </div>
        )}

        {/* ---------------- SECTION 6: TRANSPORTER REJECT ---------------- */}
        {activeTopTab === 'rejected' && (
          <div className="space-y-6">
            <DataTable
              columns={returnColumns}
              data={transporterRejectOrdersList}
              selectedDate={dateFilter}
              onDateChange={setDateFilter}
              onRowDoubleClick={handleViewOrder}
              onRefresh={() => loadData(true)}
              hideDateAndRefresh={true}
              hideSearchAndFilters={true}
              grabToScroll={true}
            />
          </div>
        )}



        {/* --- DYNAMIC SIDE DRAWER FOR TIMELINE NODE CLICKS --- */}
        {isNodeDrawerOpen && activeNodeDetails && (
          <>
            <div
              onClick={() => setIsNodeDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300"
            />
            <div className="fixed right-0 top-0 h-full w-[420px] max-w-full bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col p-6 animate-in slide-in-from-right duration-200 text-left">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <h4 className="text-lg font-black text-[#073318] uppercase tracking-wider flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#B2D534]" />
                  {activeNodeTitle} Details
                </h4>
                <button
                  onClick={() => setIsNodeDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
                {Object.entries(activeNodeDetails).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{key}</span>
                    {key === 'History' ? (
                      (() => {
                        const personTimeline = getPersonHistoryTimeline(activeNodeTitle, selectedOrderDetails);
                        if (!personTimeline || personTimeline.length === 0) {
                          return (
                            <div className="p-4 bg-[#073318]/[0.02] border border-dashed border-slate-200 rounded-2xl text-center">
                              <p className="text-xs font-semibold text-slate-400 italic">No scan events logged yet for this stage.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-[#073318] rounded-2xl p-4 text-white space-y-4 shadow-sm border border-[#073318]">
                            <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                              <Layers className="h-3.5 w-3.5 text-[#B2D534]" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#B2D534]">Partner Audit Log</span>
                            </div>
                            <div className="relative border-l-2 border-[#B2D534]/30 pl-4 space-y-3 ml-2 text-left">
                              {personTimeline.map((t: any, idx: number) => {
                                const timeObj = splitIndianDateTime(t.timestamp || t.updatedAt || t.scanTime || t.createdAt);
                                return (
                                  <div key={idx} className="relative group">
                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-black text-[#B2D534]">{timeObj.time}</span>
                                      <span className="text-[9px] text-slate-300 font-semibold">{timeObj.date}</span>
                                    </div>
                                    <p className="text-xs font-black text-white mt-0.5 leading-snug">
                                      {t.status ? String(t.status).replace(/[-_]/g, ' ') : (t.action || 'Status Update')}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-sm font-semibold text-slate-800 block leading-relaxed break-words">{val?.toString() || '-'}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => setIsNodeDrawerOpen(false)}
                  className="w-full py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer text-center"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </>
        )}

        {/* --- INTAKE MODAL --- */}
        <Modal
          isOpen={isIntakeModalOpen}
          onClose={() => setIsIntakeModalOpen(false)}
          title="Verification & Intake Portal"
          variant="modal"
        >
          {intakeOrder && (() => {
            const verifiedCount = intakeParcels.filter(p => ['HUB_RECEIVED', 'STORED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'VERIFIED'].includes(p.parcelStatus)).length;
            const allVerified = true; // Bypassed QR/OTP verification for intake as requested

            return (
              <div className="space-y-5 relative min-h-[300px]">
                {/* Simulated Scanning Viewfinder Overlay */}
                {scanningParcel && (
                  <div className="absolute inset-0 bg-slate-950/95 rounded-2xl z-50 flex flex-col items-center justify-center text-white p-6">
                    <div className="relative w-40 h-40 border-2 border-dashed border-[#B2D534] rounded-3xl flex items-center justify-center bg-slate-900 overflow-hidden shadow-inner">
                      <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_10px_red] animate-bounce top-1/2" />
                      <QrCode className="h-16 w-16 text-[#B2D534] animate-pulse" />
                    </div>
                    <p className="mt-4 font-bold text-xs tracking-wide text-[#B2D534] animate-pulse">Scanning QR for {scanningParcel.productName}...</p>
                    <p className="text-[9px] text-slate-400 mt-1">Simulating 2-second GMU Hub intake scanner verify</p>
                  </div>
                )}

                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-2xl p-5 space-y-4 text-left">
                  <div className="flex items-center gap-2 text-[#073318] border-b border-[#073318]/10 pb-2">
                    <span className="font-extrabold text-xs uppercase tracking-wider">Order Handover Information</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                    <div className="col-span-2 bg-white p-3 rounded-xl border border-slate-150">
                      <p className="text-[9px] text-slate-455 font-extrabold uppercase tracking-wider">Order ID(s)</p>
                      <p className="font-extrabold text-[#073318] text-sm font-mono mt-0.5">{intakeOrder.id}</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-150">
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Quantity</p>
                      <p className="font-extrabold text-[#073318] text-sm mt-0.5">{intakeOrder.qty} units</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-150">
                      <p className="text-[9px] text-slate-455 font-extrabold uppercase tracking-wider">Total Weight</p>
                      <p className="font-extrabold text-[#073318] text-sm mt-0.5">{intakeOrder.weight} kg</p>
                    </div>

                    {!intakeOrder.isBulk && (
                      <>
                        <div className="bg-white p-3 rounded-xl border border-slate-150">
                          <p className="text-[9px] text-slate-455 font-extrabold uppercase tracking-wider">Seller / Origin</p>
                          <p className="font-extrabold text-slate-800 mt-0.5">{intakeOrder.sellerName || 'N/A'}</p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-150">
                          <p className="text-[9px] text-slate-455 font-extrabold uppercase tracking-wider">Buyer / Destination</p>
                          <p className="font-extrabold text-slate-800 mt-0.5">{intakeOrder.buyerName || 'N/A'}</p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-150">
                          <p className="text-[9px] text-slate-455 font-extrabold uppercase tracking-wider">Assigned SHG</p>
                          <p className="font-extrabold text-slate-800 mt-0.5">{intakeOrder.shgName || 'N/A'}</p>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-150">
                          <p className="text-[9px] text-slate-455 font-extrabold uppercase tracking-wider">Assigned Transporter</p>
                          <p className="font-extrabold text-slate-800 mt-0.5">{intakeOrder.transporterName || 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Product Checklist Card */}
                <div className="border border-slate-200 rounded-2xl p-5 space-y-4 text-left bg-white shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-xs text-[#073318] uppercase tracking-wider">Parcels Handover Verification</span>
                    <span className="text-[11px] font-black text-slate-500">{verifiedCount} of {intakeParcels.length} verified</span>
                  </div>

                  {loadingIntakeParcels ? (
                    <p className="text-xs text-slate-400 italic">Loading parcels information...</p>
                  ) : (
                    <div className="space-y-3">
                      {intakeParcels.map((parcel, idx) => {
                        const isItemVerified = ['HUB_RECEIVED', 'STORED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'VERIFIED'].includes(parcel.parcelStatus);
                        return (
                          <div key={parcel.parcelId || idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl">
                            <div>
                              <p className="font-bold text-xs text-slate-800">{parcel.productName}</p>
                              <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Parcel #{parcel.parcelNumber} of {parcel.totalParcels} | {parcel.weight}</p>
                            </div>

                            {isItemVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                ✓ Verified
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSimulatedIntakeScan(parcel)}
                                className="px-3 py-1.5 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                              >
                                Scan QR
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsIntakeModalOpen(false);
                      setIntakeOrder(null);
                      setIntakeType(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmIntake}
                    disabled={actionProcessing}
                    className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Layers className="h-4 w-4 text-[#B2D534]" />
                    Intake & Move to Inventory
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>

        {/* --- PARCEL QR CODES MODAL --- */}
        <Modal
          isOpen={isParcelQrModalOpen}
          onClose={() => setIsParcelQrModalOpen(false)}
          title="Order Parcel QR Codes"
          variant="modal"
        >
          {parcelQrOrder ? (
            <div className="space-y-6 text-left">
              {/* Order Information Card */}
              <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#073318]/10 pb-2">
                  <div className="flex items-center gap-2 text-[#073318]">
                    <span className="text-sm">📋</span>
                    <span className="font-extrabold text-xs uppercase tracking-wider">Order Handover Details</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (parcelQrOrderId && window.confirm("Are you sure you want to regenerate all QR codes for this order? This will invalidate previous codes.")) {
                        try {
                          setActionProcessing(true);
                          const res = await generateQr(parcelQrOrderId, true);
                          setParcelQrList(res || []);
                        } catch (err: any) {
                          alert(err.message || 'Failed to regenerate QR codes.');
                        } finally {
                          setActionProcessing(false);
                        }
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-black text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg shadow-sm cursor-pointer transition-all"
                  >
                    Regenerate QRs
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm space-y-1">
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Seller Information</p>
                    <h6 className="font-extrabold text-[#073318] text-xs">{parcelQrOrder.sellerName || 'N/A'}</h6>
                    <div className="text-[10px] text-slate-650 font-semibold mt-0.5">
                      📞 {parcelQrOrder.sellerMobile || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm space-y-1">
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Buyer Information</p>
                    <h6 className="font-extrabold text-[#073318] text-xs">{parcelQrOrder.buyerName || 'Gramin Mandi Mumbai'}</h6>
                    <div className="text-[10px] text-slate-650 font-semibold space-y-0.5 mt-0.5">
                      <div>📞 {parcelQrOrder.buyerMobile || '+91 99887 11001'}</div>
                      <div className="line-clamp-1">📍 {parcelQrOrder.buyerAddress || 'Shop No. 12, Crawford Market, Mumbai'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parcels list */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {parcelQrList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#073318] mx-auto mb-3"></div>
                    <p className="text-xs">Loading/Generating Parcel QR Codes...</p>
                  </div>
                ) : (
                  parcelQrList.map((parcel) => (
                    <div key={parcel.parcelId} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-1 text-center border-r md:border-r border-slate-150 pr-4 flex flex-col justify-center items-center">
                        {parcel.qrImage ? (
                          <img src={parcel.qrImage} alt={`Parcel ${parcel.parcelNumber}`} className="h-32 w-32 object-contain" />
                        ) : (
                          <div className="h-32 w-32 bg-slate-100 flex items-center justify-center rounded-xl text-slate-400 font-bold text-xs">No QR Code</div>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 mt-2 block">
                          Parcel {parcel.parcelNumber} of {parcel.totalParcels}
                        </span>
                      </div>

                      <div className="md:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <h6 className="font-extrabold text-[#073318] text-xs uppercase tracking-wide leading-none">{parcel.productName}</h6>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${parcel.parcelStatus === 'PENDING' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                            }`}>
                            {parcel.parcelStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-650 font-medium">
                          <div><span className="text-slate-400 font-semibold">Quantity:</span> {parcel.quantity} units</div>
                          <div><span className="text-slate-400 font-semibold">Weight:</span> {parcel.weight}</div>
                          <div><span className="text-slate-400 font-semibold">Token:</span> <span className="font-mono font-bold text-slate-800">{parcel.verificationToken}</span></div>
                          <div><span className="text-slate-400 font-semibold">Phase:</span> {parcel.flowType}</div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 font-mono text-[9px] text-slate-600 break-all select-all flex items-start justify-between gap-2">
                          <span className="line-clamp-2 select-all">{parcel.qrCodeValue}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(parcel.qrCodeValue);
                              alert("Copied scanner JSON to clipboard!");
                            }}
                            className="p-1 hover:bg-slate-200 text-[#073318] rounded-md border border-slate-300 bg-white shrink-0 cursor-pointer shadow-sm active:scale-90 transition-all"
                            title="Copy QR Value"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsParcelQrModalOpen(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* --- VIEW ORDER DETAILS DRAWER --- */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Order Profile: ${selectedOrderDetails?.id || ''}`}
          variant="modal"
          size="full"
          hideHeader={true}
        >
          {selectedOrderDetails && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-4 text-left">
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-sm"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-[#073318] border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
                        Unified Logistics Journey
                      </span>
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
                        {selectedOrderDetails.mainStatus?.replace(/[-_]/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-[#073318] flex items-baseline gap-2">
                      {selectedOrderDetails.id}
                    </h3>
                  </div>
                </div>

                {selectedOrderDetails.returnType === 'BUYER_RETURN' || [
                  'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
                  'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
                  'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'
                ].includes(selectedOrderDetails.mainStatus) ? (
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                    <span className={`px-4 py-2 rounded-xl font-bold ${['RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>INITIATED</span>
                    <span className="text-slate-300 px-1 font-bold">➔</span>
                    <span className={`px-4 py-2 rounded-xl font-bold ${['RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED', 'RETURN_IN_TRANSIT_TO_HUB'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>IN TRANSIT</span>
                    <span className="text-slate-300 px-1 font-bold">➔</span>
                    <span className={`px-4 py-2 rounded-xl font-bold ${['BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>RETURNED</span>
                  </div>
                ) : (
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                    <span className={`px-4 py-2 rounded-xl font-bold ${['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>NEW</span>
                    <span className="text-slate-300 px-1 font-bold">➔</span>
                    <span className={`px-4 py-2 rounded-xl font-bold ${['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>IN TRANSIT</span>
                    <span className="text-slate-300 px-1 font-bold">➔</span>
                    <span className={`px-4 py-2 rounded-xl font-bold ${['DELIVERED', 'COMPLETED'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>COMPLETED</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Order Summary */}
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center justify-between border-b border-[#073318]/10 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Order Summary</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Product Count</p>
                        <p className="text-lg font-black text-[#073318] mt-1">{selectedOrderDetails.productCount || 1}</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Total Qty</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{selectedOrderDetails.totalQty || selectedOrderDetails.quantity || 1}</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Total Weight</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{selectedOrderDetails.totalWeight || selectedOrderDetails.weight || 0} KG</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Priority</p>
                        <div className="mt-1">
                          <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                            {selectedOrderDetails.priority || 'MEDIUM'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                        <div className="text-left">
                          <p className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Order Date</p>
                          <p className="text-sm font-black text-[#073318] mt-0.5">
                            {selectedOrderDetails.orderDate ? (selectedOrderDetails.orderDate.split(' ')[0].split('T')[0]) : (selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ')[0] : '-')}
                          </p>
                        </div>
                        <Calendar className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                        <div className="text-left">
                          <p className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Delivery Expected Date</p>
                          <p className="text-sm font-black text-amber-700 mt-0.5">
                            {getExpectedDeliveryDate(selectedOrderDetails.orderDate || (selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ')[0] : ''))}
                          </p>
                        </div>
                        <Truck className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>

                    {['AT_HUB', 'HUB_RECEIVED', 'PARCEL_AT_GMU'].includes(selectedOrderDetails.mainStatus) && (
                      <div className="pt-4 border-t border-[#073318]/10 flex justify-end">
                        <button
                          onClick={async () => {
                            try {
                              await readyToStore(selectedOrderDetails.id);
                              alert('Order stored in inventory successfully.');
                              setIsViewModalOpen(false);
                              await loadData();
                            } catch (err: any) {
                              alert(err.message || 'Failed to store in inventory.');
                            }
                          }}
                          className="px-5 py-2.5 bg-[#B2D534] hover:bg-[#B2D534]/90 text-[#073318] rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Layers className="h-4 w-4" />
                          Store in Inventory
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Partners Details */}
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-3">
                      <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Partner & Logistics Info</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Seller Information</p>
                        <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.sellerName || 'N/A'}</h5>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-450">Contact:</span>
                            <span>{selectedOrderDetails.sellerMobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">{selectedOrderDetails.sellerAddress || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Buyer Information</p>
                        <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.buyerName || 'N/A'}</h5>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-450">Contact:</span>
                            <span>{selectedOrderDetails.buyerMobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">{selectedOrderDetails.buyerAddress || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection & Return Details Card */}
                  {(selectedOrderDetails.rejectReason || selectedOrderDetails.remarks || selectedOrderDetails.returnType || selectedOrderDetails.mainStatus === 'REJECTED') && (
                    <div className="border border-rose-500/20 bg-rose-50/40 rounded-3xl p-6 space-y-4 shadow-sm text-left">
                      <div className="flex items-center justify-between border-b border-rose-900/10 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-rose-700 p-1.5 rounded-lg text-white">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <span className="font-extrabold text-sm text-rose-900 uppercase tracking-wider">Rejection & Return Details</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs space-y-1">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Rejected By</p>
                          <p className="font-extrabold text-slate-800 text-sm">
                            {selectedOrderDetails.dropTransporterName || selectedOrderDetails.pickupTransporterName || selectedOrderDetails.dropTransporterDetails?.name || selectedOrderDetails.pickupTransporterDetails?.name || selectedOrderDetails.rejectedByName || 'Transporter'}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs space-y-1">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Reject Reason</p>
                          <p className="font-extrabold text-rose-700 text-sm">
                            {selectedOrderDetails.rejectReason || selectedOrderDetails.remarks || selectedOrderDetails.dropRejectReason || selectedOrderDetails.pickupRejectReason || 'Recipient Unavailable - Return to Hub'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right details */}
                <div className="space-y-6">


                  {/* Parcels & QR Codes Card */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-[#073318] tracking-widest uppercase flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Parcels & QR Codes
                      </h4>
                      {selectedOrderDetails.parcels && selectedOrderDetails.parcels.length > 0 && (
                        <button
                          onClick={() => handleDownloadAllQr(selectedOrderDetails.parcels)}
                          className="text-[10px] bg-[#073318] hover:bg-[#073318]/90 text-white font-bold px-2 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          Download All
                        </button>
                      )}
                    </div>

                    {(() => {
                      const rawParcels = selectedOrderDetails?.parcels || [];
                      const parcelMap = new Map();
                      rawParcels.forEach((p: any) => {
                        const key = `${p.productName || p.name}-${p.parcelNumber || 1}`;
                        if (!parcelMap.has(key)) {
                          parcelMap.set(key, p);
                        } else {
                          const existing = parcelMap.get(key);
                          const isNewer = (p.parcelStatus && p.parcelStatus !== 'PENDING') || (p.parcelId && !existing.parcelId);
                          if (isNewer) parcelMap.set(key, p);
                        }
                      });
                      const displayParcels = Array.from(parcelMap.values());

                      if (displayParcels.length === 0) {
                        return (
                          <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                            <p className="text-xs font-semibold text-slate-400 italic">No QR codes available for this order.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                          {displayParcels.map((parcel: any, idx: number) => (
                            <div key={parcel.parcelId || idx} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl transition-all">
                              <img
                                src={parcel.qrImage}
                                alt={`Parcel ${parcel.parcelNumber}`}
                                onClick={() => {
                                  setSelectedParcel(parcel);
                                  setIsParcelPreviewOpen(true);
                                }}
                                className="h-12 w-12 rounded-lg bg-white p-0.5 border border-slate-200 cursor-pointer hover:scale-105 transition-all shadow-sm shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{parcel.productName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    Parcel {parcel.parcelNumber || (idx + 1)}/{parcel.totalParcels || displayParcels.length}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">|</span>
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    Qty: {parcel.quantity || 1} ({parcel.weight || '2.5 kg'})
                                  </span>
                                </div>
                                <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 mt-1 rounded uppercase tracking-wider ${(parcel.parcelStatus || 'PENDING') === 'DELIVERED' || (parcel.parcelStatus || 'PENDING') === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : (parcel.parcelStatus || 'PENDING').includes('IN_TRANSIT') || (parcel.parcelStatus || 'PENDING') === 'DISPATCHED'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}>
                                  {(parcel.parcelStatus || 'PENDING').replace(/[-_]/g, ' ')}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1.5 text-right">
                                <a
                                  href={parcel.qrImage}
                                  download={`QR-${parcel.productName}-${parcel.parcelNumber}.png`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#073318] hover:underline font-bold"
                                >
                                  Download
                                </a>
                                <button
                                  onClick={() => {
                                    setSelectedParcel(parcel);
                                    setIsParcelPreviewOpen(true);
                                  }}
                                  className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold"
                                >
                                  Preview
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-[#073318] rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-lg min-h-[300px]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2 text-white">
                          <Layers className="h-4 w-4 text-[#B2D534]" />
                          <span className="font-extrabold text-sm uppercase tracking-wider">Tracking Audit History</span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/10 text-[#B2D534] border border-white/10">
                          Live Indian Time (IST)
                        </span>
                      </div>

                      <div className="relative border-l-2 border-[#B2D534]/30 pl-5 space-y-5 ml-2.5 py-1 text-left max-h-[380px] overflow-y-auto pr-2">
                        {selectedOrderDetails.tracking && selectedOrderDetails.tracking.length > 0 ? (
                          selectedOrderDetails.tracking.map((t: any, idx: number) => {
                            const timeObj = splitIndianDateTime(t.timestamp || t.updatedAt || t.scanTime || t.createdAt);
                            return (
                              <div key={idx} className="relative group">
                                <span className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318] shadow-sm" />

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-black text-[#B2D534]">{timeObj.time}</span>
                                  <span className="text-[10px] text-slate-300 font-semibold">{timeObj.date}</span>
                                </div>

                                <p className="text-xs font-black text-white mt-1">
                                  {t.status ? String(t.status).replace(/[-_]/g, ' ') : (t.action || 'Status Update')}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="relative">
                            <span className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                            {(() => {
                              const timeObj = splitIndianDateTime(selectedOrderDetails.orderDate || selectedOrderDetails.created_at || selectedOrderDetails.createdAt);
                              return (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-[#B2D534]">{timeObj.time}</span>
                                    <span className="text-[10px] text-slate-300 font-semibold">{timeObj.date}</span>
                                  </div>
                                  <p className="text-xs font-black text-white mt-1">Order Placed & Registered</p>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product inventory items */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg text-slate-700">
                    <Package className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Product Inventory</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[#073318] font-black border-b border-slate-200 uppercase tracking-widest text-[9px]">
                      <tr>
                        <th className="px-5 py-3.5">Product Name</th>
                        <th className="px-5 py-3.5">Qty</th>
                        <th className="px-5 py-3.5">Weight</th>
                        <th className="px-5 py-3.5">Category</th>
                        <th className="px-5 py-3.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                      {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                        selectedOrderDetails.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-5 py-4 font-bold text-slate-800">{item.name}</td>
                            <td className="px-5 py-4">{item.quantity}</td>
                            <td className="px-5 py-4">{item.weight} kg</td>
                            <td className="px-5 py-4">
                              <span className="bg-blue-50 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-black text-[#073318]">₹{item.price}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-4 text-center text-slate-400">
                            No product details found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* --- PARCEL QR PREVIEW MODAL --- */}
        <Modal
          isOpen={isParcelPreviewOpen}
          onClose={() => setIsParcelPreviewOpen(false)}
          title={`Parcel QR Preview: ${selectedParcel?.productName || ''}`}
          variant="modal"
        >
          {selectedParcel && (
            <div className="space-y-6 text-center text-slate-800">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs font-semibold space-y-2.5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Order ID</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono text-sm text-[#073318] font-bold">{selectedParcel.orderId}</span>
                      <button onClick={() => copyToClipboard(selectedParcel.orderId, 'Order ID')} className="text-slate-400 hover:text-[#073318] transition-all cursor-pointer bg-transparent border-0 p-0">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Parcel ID</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono text-xs text-slate-700 font-bold truncate max-w-[120px]" title={selectedParcel.parcelId}>
                        {selectedParcel.parcelId}
                      </span>
                      <button onClick={() => copyToClipboard(selectedParcel.parcelId, 'Parcel ID')} className="text-slate-400 hover:text-[#073318] transition-all cursor-pointer bg-transparent border-0 p-0">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Product Name</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">{selectedParcel.productName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Parcel Number</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {selectedParcel.parcelNumber} / {selectedParcel.totalParcels}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Quantity / Weight</span>
                    <span className="font-bold text-slate-700 mt-0.5 block">
                      {selectedParcel.quantity} ({selectedParcel.weight})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Verification Token</span>
                    <span className="font-mono font-bold text-amber-700 mt-0.5 block">{selectedParcel.verificationToken}</span>
                  </div>
                </div>
              </div>

              <div className="w-60 h-60 mx-auto border-2 border-slate-200 rounded-3xl overflow-hidden bg-white flex items-center justify-center p-3 shadow-md">
                <img
                  src={selectedParcel.qrImage}
                  alt={`QR for ${selectedParcel.productName}`}
                  className="max-h-full max-w-full"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => copyToClipboard(selectedParcel.qrCodeValue, 'QR Metadata')}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Metadata
                </button>
                <a
                  href={selectedParcel.qrImage}
                  download={`QR_${selectedParcel.orderId}_Parcel_${selectedParcel.parcelNumber}.png`}
                  className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 text-white transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PNG
                </a>
              </div>
            </div>
          )}
        </Modal>

        {/* --- QR SCAN MODAL --- */}
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => !isScanning && setIsQrModalOpen(false)}
          title="Scan QR Code for Return Intake"
          variant="modal"
        >
          {qrItem && (
            <div className="space-y-6 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs font-semibold text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Order ID</span>
                    <span className="font-mono text-sm text-[#073318] font-bold">{qrItem.id}</span>
                  </div>

                </div>
              </div>

              <div className="relative w-64 h-64 mx-auto border-2 border-slate-300 rounded-3xl overflow-hidden bg-slate-955 flex items-center justify-center shadow-inner">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-[#B2D534] rounded-tl-md" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-[#B2D534] rounded-tr-md" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-[#B2D534] rounded-bl-md" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-[#B2D534] rounded-br-md" />

                {isScanning && (
                  <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_10px_red] animate-bounce" />
                )}

                <div className="opacity-80 p-6 bg-white rounded-2xl shadow-md">
                  <QrCode className={`h-24 w-24 text-slate-800 ${isScanning ? 'animate-pulse' : ''}`} />
                </div>

                {qrScanSuccess && (
                  <div className="fixed inset-0 bg-[#073318]/90 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
                    <div className="h-16 w-16 bg-[#B2D534] rounded-full flex items-center justify-center shadow-lg mb-2">
                      <span className="text-3xl font-black">✓</span>
                    </div>
                    <p className="text-sm font-bold">Scan Complete</p>
                  </div>
                )}
              </div>

              <div className="h-6 flex items-center justify-center">
                {scanMessage ? (
                  <p className={`text-xs font-bold ${qrScanSuccess ? 'text-emerald-600' : 'text-[#073318]'}`}>
                    {scanMessage}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Position the QR code within the viewfinder frame to scan.</p>
                )}
              </div>

              {!qrScanSuccess && (
                <button
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="w-full py-3 bg-[#073318] hover:bg-[#073318]/90 disabled:bg-slate-350 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isScanning ? 'Processing...' : 'Simulate Successful QR Scan'}
                </button>
              )}
            </div>
          )}
        </Modal>

        {/* --- ADD MANUAL ORDER MODAL --- */}
        <Modal
          isOpen={isAddOrderOpen}
          onClose={() => !isCreatingOrder && setIsAddOrderOpen(false)}
          title={<span className="text-[#073318] text-lg font-black uppercase tracking-wider">{addOrderFlow === 'drop' ? 'Create Manual Drop Order' : 'Create Manual Pickup Order'}</span>}
          variant="modal"
          size="full"
        >
          <form onSubmit={handleCreateOrder} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            <div className="bg-[#073318] border border-[#B2D534]/15 rounded-2xl p-5 text-white mb-6 shadow-md text-left">
              <h2 className="text-lg font-black uppercase tracking-wider text-[#B2D534]">{addOrderFlow === 'drop' ? 'GMU Hub Manual Drop Order Form' : 'GMU Hub Manual Order Form'}</h2>
              <p className="text-xs text-white/90 mt-1 font-semibold">Enter seller, buyer, order details, and product items below to submit.</p>
            </div>

            {validationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold animate-in fade-in duration-200 text-left">
                {validationError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Seller details */}
              <div className="bg-[#073318]/[0.03] border border-[#073318]/15 rounded-3xl p-6 space-y-4 shadow-sm">
                <h4 className="text-sm font-extrabold text-[#073318] uppercase tracking-wider border-b border-[#073318]/15 pb-2">
                  Section 1 – Seller Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Seller Name *</label>
                    <input
                      type="text"
                      required
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="e.g. Anisha Dilip Kamble"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Seller Mobile *</label>
                    <input
                      type="text"
                      required
                      value={sellerMobile}
                      onChange={(e) => setSellerMobile(e.target.value)}
                      placeholder="e.g. 9876543204"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={sellerPincode}
                      onChange={(e) => handleSellerPincodeChange(e.target.value)}
                      placeholder="e.g. 416504"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Seller Address</label>
                    <input
                      type="text"
                      value={sellerAddress}
                      onChange={(e) => setSellerAddress(e.target.value)}
                      placeholder="e.g. Indapur Galli, Near Gram Panchayat"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Village *</label>
                    {sellerVillages.length === 0 ? (
                      <input
                        type="text"
                        required
                        value={sellerVillage}
                        onChange={(e) => setSellerVillage(e.target.value)}
                        placeholder="Enter Pincode first..."
                        disabled
                        className="w-full px-4 py-2.5 bg-slate-100 border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] transition-all text-[#073318]/50 cursor-not-allowed"
                      />
                    ) : (
                      <select
                        required
                        value={sellerVillage}
                        onChange={(e) => setSellerVillage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                      >
                        {sellerVillages.map((v, i) => (
                          <option key={i} value={v}>{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Taluka</label>
                    <input
                      type="text"
                      value={sellerTaluka}
                      onChange={(e) => setSellerTaluka(e.target.value)}
                      placeholder="e.g. Gadhinglaj"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">District</label>
                    <input
                      type="text"
                      value={sellerDistrict}
                      onChange={(e) => setSellerDistrict(e.target.value)}
                      placeholder="e.g. Kolhapur"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">State</label>
                    <input
                      type="text"
                      value={sellerState}
                      onChange={(e) => setSellerState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                </div>
              </div>

              {/* Buyer details */}
              <div className="bg-[#073318]/[0.03] border border-[#073318]/15 rounded-3xl p-6 space-y-4 shadow-sm">
                <h4 className="text-sm font-extrabold text-[#073318] uppercase tracking-wider border-b border-[#073318]/15 pb-2">
                  Section 2 – Buyer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Buyer Name *</label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="e.g. Priya Ramesh Deshmukh"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Buyer Mobile *</label>
                    <input
                      type="text"
                      required
                      value={buyerMobile}
                      onChange={(e) => setBuyerMobile(e.target.value)}
                      placeholder="e.g. 9988700001"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={buyerPincode}
                      onChange={(e) => handleBuyerPincodeChange(e.target.value)}
                      placeholder="e.g. 413106"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Buyer Address</label>
                    <input
                      type="text"
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      placeholder="e.g. Pragati Colony, Near Bus Stand"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Village *</label>
                    {buyerVillages.length === 0 ? (
                      <input
                        type="text"
                        required
                        value={buyerVillage}
                        onChange={(e) => setBuyerVillage(e.target.value)}
                        placeholder="Enter Pincode first..."
                        disabled
                        className="w-full px-4 py-2.5 bg-slate-100 border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] transition-all text-[#073318]/50 cursor-not-allowed"
                      />
                    ) : (
                      <select
                        required
                        value={buyerVillage}
                        onChange={(e) => setBuyerVillage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                      >
                        {buyerVillages.map((v, i) => (
                          <option key={i} value={v}>{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Taluka</label>
                    <input
                      type="text"
                      value={buyerTaluka}
                      onChange={(e) => setBuyerTaluka(e.target.value)}
                      placeholder="e.g. Gadhinglaj"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">District</label>
                    <input
                      type="text"
                      value={buyerDistrict}
                      onChange={(e) => setBuyerDistrict(e.target.value)}
                      placeholder="e.g. Kolhapur"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">State</label>
                    <input
                      type="text"
                      value={buyerState}
                      onChange={(e) => setBuyerState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-[#073318]/[0.03] border border-[#073318]/15 rounded-3xl p-6 space-y-4 md:col-span-2 shadow-sm">
                <h4 className="text-sm font-extrabold text-[#073318] uppercase tracking-wider border-b border-[#073318]/15 pb-2">
                  Section 3 – Order Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Order ID (Optional)</label>
                    <input
                      type="text"
                      value={formOrderId}
                      onChange={(e) => setFormOrderId(e.target.value)}
                      placeholder="e.g. ORD-PICK-1025"
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Order Date</label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-[#073318]/25 rounded-xl text-xs font-extrabold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Products list */}
              <div className="bg-[#073318]/[0.03] border border-[#073318]/15 rounded-3xl p-6 space-y-4 md:col-span-2 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#073318]/15 pb-2">
                  <h4 className="text-sm font-extrabold text-[#073318] uppercase tracking-wider">
                    Section 4 – Products
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-[#073318] hover:bg-[#073318]/90 rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm font-sans"
                  >
                    <span>+ Add Product</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {products.map((product, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row items-end gap-3 bg-white p-4 rounded-2xl border border-[#073318]/15 shadow-xs relative group">
                      <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="col-span-2">
                          <label className="text-[9px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Product Name *</label>
                          <input
                            type="text"
                            required
                            value={product.name}
                            onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                            placeholder="organic Honey"
                            className="w-full px-3 py-2 bg-slate-50 border border-[#073318]/25 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Category</label>
                          <select
                            value={product.category}
                            onChange={(e) => handleProductChange(idx, 'category', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-[#073318]/25 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                          >
                            <option value="FOOD">Food</option>
                            <option value="DAIRY">Dairy</option>
                            <option value="AGRICULTURE">Agriculture</option>
                            <option value="HANDMADE">Handmade</option>
                            <option value="TEXTILE">Textile</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Qty *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={product.quantity}
                            onChange={(e) => handleProductChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 border border-[#073318]/25 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Unit</label>
                          <input
                            type="text"
                            value={product.unit}
                            onChange={(e) => handleProductChange(idx, 'unit', e.target.value)}
                            placeholder="Packet"
                            className="w-full px-3 py-2 bg-slate-50 border border-[#073318]/25 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-[#073318]/80 uppercase tracking-wider block mb-1">Weight (kg) *</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            min="0.01"
                            value={product.weight}
                            onChange={(e) => handleProductChange(idx, 'weight', parseFloat(e.target.value) || 0.0)}
                            className="w-full px-3 py-2 bg-slate-50 border border-[#073318]/25 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 transition-all text-[#073318]"
                          />
                        </div>
                      </div>

                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          className="p-2 bg-red-50 hover:bg-red-650 text-red-650 hover:text-white rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs border border-red-200 mb-0.5"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Auto Summary */}
              <div className="bg-[#073318] border border-[#073318] rounded-3xl p-6 text-white md:col-span-2 shadow-md">
                <h4 className="text-sm font-extrabold text-[#B2D534] uppercase tracking-wider border-b border-white/10 pb-2 mb-4">
                  Section 5 – Auto Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <span className="text-[9px] text-[#B2D534]/80 uppercase block tracking-wider mb-1">Product Count</span>
                    <span className="text-2xl font-black">{totalProductsCount}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <span className="text-[9px] text-[#B2D534]/80 uppercase block tracking-wider mb-1">Total Quantity</span>
                    <span className="text-2xl font-black">{totalQuantity}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <span className="text-[9px] text-[#B2D534]/80 uppercase block tracking-wider mb-1">Total Weight</span>
                    <span className="text-2xl font-black">{totalWeight} kg</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <span className="text-[9px] text-[#B2D534]/80 uppercase block tracking-wider mb-1">Total Price</span>
                    <span className="text-2xl font-black text-[#B2D534]">₹{totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form footer actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                disabled={isCreatingOrder}
                onClick={() => setIsAddOrderOpen(false)}
                className="px-5 py-3 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingOrder}
                className="px-6 py-3 text-xs font-extrabold text-white bg-[#073318] hover:bg-[#073318]/90 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                {isCreatingOrder ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <span>Create Order</span>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className={`fixed top-6 right-6 z-[9999] max-w-md px-5 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 transition-all transform animate-bounce-in ${toastType === 'success'
              ? 'bg-[#073318] border-[#B2D534] text-white shadow-[#073318]/40'
              : 'bg-red-900 border-red-400 text-white shadow-red-900/40'
            }`}>
            <div className={`p-1.5 rounded-full ${toastType === 'success' ? 'bg-[#B2D534]/20 text-[#B2D534]' : 'bg-red-700 text-white'}`}>
              {toastType === 'success' ? <Check className="h-5 w-5 stroke-[3]" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="flex-1 text-xs font-bold leading-relaxed tracking-wide">
              {toastMessage}
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/60 hover:text-white ml-2 p-1 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};
