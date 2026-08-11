import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Tabs } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { InventoryItem } from '../context/AppContext';
import { Eye, Layers, Truck, X, FileText, MoreVertical, Phone, MapPin, Calendar, Clock, Package, QrCode, CheckCircle, Store, Users, User, Download, Home, Activity, Barcode, ShieldAlert, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { api } from '../utils/api';

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

const getWmsDetails = (order: any, rackCode: string, condition: string) => {
  return {
    inventoryId: `INV-${(order.uuid || order.id || '').substring(0, 8).toUpperCase()}`,
    barcodeId: `BC-${(order.id || '').substring(0, 8).toUpperCase()}`,
    condition: condition || 'Good',
    locationCode: rackCode || 'RACK-A1',
    receivedDate: order.warehouseReceivedDate ? order.warehouseReceivedDate.split(' ')[0] : (order.storeDate ? order.storeDate.split(' ')[0] : 'N/A'),
    receivedTime: order.warehouseReceivedDate ? order.warehouseReceivedDate.split(' ')[1] : (order.storeDate ? '10:00 AM' : 'N/A'),
    storageDate: order.storedDate || order.storeDate || 'N/A',
  };
};

const getWarehouseActivityLog = (order: any, locationCode: string) => {
  const activityLogs = [];
  if (order.warehouseReceivedDate || order.storeDate) {
    activityLogs.push({
      time: order.warehouseReceivedDate ? order.warehouseReceivedDate.split(' ').pop() : '10:30 AM',
      label: `Intake Received & Scanned at GMU Hub`
    });
  }
  if (locationCode) {
    activityLogs.push({
      time: '11:15 AM',
      label: `Relocated to Storage Slot: ${locationCode}`
    });
  }
  if (order.mainStatus === 'DISPATCHED' || order.status?.toLowerCase() === 'dispatched') {
    activityLogs.push({
      time: '04:00 PM',
      label: `Dispatched from GMU Hub Warehouse`
    });
  }
  if (activityLogs.length === 0) {
    activityLogs.push({
      time: '09:00 AM',
      label: `Order Created`
    });
  }
  return activityLogs;
};

export const InventoryManagementPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const {
    incomingInventory,
    returnPickupInventory,
    returnDropInventory,
    dispatchInventory,
    loadInventoryStored,
    loadInventoryTransporterReturn,
    loadInventoryBuyerReturn,
    counts,
    loadCounts,
    readyToStore,
    mapOrder,
    generateQr,
  } = useAppContext();

  // Sub-tabs: Incoming Inventory | Return Pickup Inventory | Return Drop Inventory
  const [activeSubTab, setActiveSubTab] = useState('incoming');

  // Multi-select state
  const [selectedIncomingItemIds, setSelectedIncomingItemIds] = useState<string[]>([]);
  const [selectedReturnDropItemIds, setSelectedReturnDropItemIds] = useState<string[]>([]);

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [wmsRackCode, setWmsRackCode] = useState('RACK-A1');
  const [wmsCondition, setWmsCondition] = useState('Good');
  const [wmsNotification, setWmsNotification] = useState<string | null>(null);
  const [isMoveRackOpen, setIsMoveRackOpen] = useState(false);
  const [newRackInput, setNewRackInput] = useState('');
  const [isParcelPreviewOpen, setIsParcelPreviewOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  // Live auto-refresh polling for Inventory Management page
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        await Promise.all([
          loadInventoryStored(),
          loadInventoryTransporterReturn(),
          loadInventoryBuyerReturn(),
          loadCounts()
        ]);
      } catch (e) {
        console.error("Failed to refresh inventory data:", e);
      }
    };

    fetchInventoryData();
    const interval = setInterval(fetchInventoryData, 8000);
    return () => clearInterval(interval);
  }, []);

  const getNodeTimeAndDate = (order: any, nodeLabel: string) => {
    const lbl = nodeLabel.toLowerCase();
    let timestamp: string | null = null;
    
    const isBuyerReturn = order.returnType === 'BUYER_RETURN' || [
      'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
      'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
      'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'
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

    if (!timestamp) return null;
    
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return null;
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = d.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
      return { time: timeStr, date: dateStr };
    } catch (e) {
      return null;
    }
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
      'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
      'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
      'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'
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

    // Seller: always completed
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

    // Pickup SHG: completed if order is picked (or later status)
    let pickupShgState: 'completed' | 'active' | 'pending' = 'pending';
    const isShgPicked = isPhase1Concluded || [
      'PICKED', 'DROPPED', 'COMPLETED'
    ].includes((order.pickupShgStatus || '').toUpperCase()) || [
      'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER'
    ].includes((order.mainStatus || '').toUpperCase());

    if (isShgPicked || order.isPickupRedirected || order.pickupShgStatus === 'REDIRECTED') {
      pickupShgState = 'completed';
    } else if (['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED'].includes((order.mainStatus || '').toUpperCase())) {
      pickupShgState = 'active';
    }

    // Pickup Transporter: completed if parcel is picked up by transporter (or later status)
    let pickupTransporterState: 'completed' | 'active' | 'pending' = 'pending';
    const isTransPickupCompleted = isPhase1Concluded || [
      'DROPPED', 'COMPLETED'
    ].includes((order.pickupTransporterStatus || '').toUpperCase());

    if (isTransPickupCompleted) {
      pickupTransporterState = 'completed';
    } else if (['TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_SHG'].includes((order.mainStatus || '').toUpperCase()) || ['ACCEPTED', 'TRANSPORTER_ACCEPTED', 'PICKED'].includes((order.pickupTransporterStatus || '').toUpperCase())) {
      pickupTransporterState = 'active';
    }

    // GMU Hub: completed if dispatched from hub or later status
    let gmuHubState: 'completed' | 'active' | 'pending' = 'pending';
    const isHubCompleted = ['DISPATCHED', 'IN_TRANSIT_TO_BUYER', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'COMPLETED'].includes(order.mainStatus);
    if (isHubCompleted) {
      gmuHubState = 'completed';
    } else if (['IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'STORED', 'DROP_ASSIGNED', 'DROP ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED'].includes(order.mainStatus) || order.phase === 'DROP') {
      gmuHubState = 'active';
    }

    // Drop Transporter: completed if parcel is at drop SHG/delivered
    let dropTransporterState: 'completed' | 'active' | 'pending' = 'pending';
    const isDropTransCompleted = ['PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG', 'COMPLETED'].includes(order.mainStatus) || order.dropTransporterStatus === 'DROPPED' || order.dropTransporterStatus === 'COMPLETED';
    if (isDropTransCompleted) {
      dropTransporterState = 'completed';
    } else if (['DROP_ASSIGNED', 'DROP ASSIGNED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_BUYER', 'DISPATCHED'].includes(order.mainStatus) || order.phase === 'DROP') {
      dropTransporterState = 'active';
    }

    // Drop SHG: completed if delivered/completed
    let dropShgState: 'completed' | 'active' | 'pending' = 'pending';
    const isDropShgCompleted = ['COMPLETED', 'DELIVERED'].includes(order.mainStatus) || order.dropShgStatus === 'DROPPED' || order.dropShgStatus === 'COMPLETED';
    if (isDropShgCompleted) {
      dropShgState = 'completed';
    } else if (['PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG'].includes(order.mainStatus) || (order.phase === 'DROP' && (order.dropShgStatus === 'PICKED' || order.dropShgStatus === 'PICKED_UP'))) {
      dropShgState = 'active';
    }

    // Buyer: completed if delivered
    let buyerState: 'completed' | 'active' | 'pending' = 'pending';
    const isBuyerCompleted = ['COMPLETED', 'DELIVERED'].includes(order.mainStatus);
    if (isBuyerCompleted) {
      buyerState = 'completed';
    } else if (['PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'AT_BUYER_SHG'].includes(order.mainStatus)) {
      buyerState = 'active';
    }

    const nodes: Array<{ id: string; label: string; state: string; details: Record<string, any> | null }> = [
      { id: 'seller', label: 'Seller', state: sellerState, details: {
        'Person Name': order.sellerName || order.seller?.fullName || 'N/A',
        'Role': 'Seller / Farmer',
        'Mobile Number': order.sellerMobile || order.seller?.mobile || 'N/A',
        'Address': order.sellerAddress || order.seller?.address || 'N/A',
        'Order ID': order.id,
        'Parcel Information': `${order.productCount || 1} product(s), Weight: ${order.weight || '0.5'} KG, Qty: ${order.quantity || 1} units`,
        'Accepted (Date & Time)': formatIndianDateTime(order.orderDate || order.createdAt),
        'Expected Delivery': getExpectedDeliveryDate(order.orderDate),
        'Status': 'PLACED',
        'History': getLogsForStage(['PLACED', 'PENDING_PICKUP', 'SELLER'])
      } },
      { id: 'pickup_shg', label: 'Pickup SHG', state: pickupShgState, details: (order.pickupShgDetails) ? {
        'Person Name': order.pickupShgDetails.name || 'N/A',
        'Role': 'Pickup Self Help Group',
        'Mobile': order.pickupShgDetails.mobile || 'N/A',
        'Address': order.pickupShgDetails.address || 'N/A',
        'Order ID': order.id,
        'Accepted (Date & Time)': formatIndianDateTime(order.pickupShgAcceptedAt || (pickupShgState === 'completed' || pickupShgState === 'active' ? (order.createdAt || order.orderDate) : null)),
        'Pickup (Date & Time)': formatIndianDateTime(order.pickupShgPickedAt || (pickupShgState === 'completed' ? (order.storedAt || order.warehouseReceivedAt || order.updatedAt) : null)),
        'Status': order.pickupShgStatus || 'PENDING',
        'History': getLogsForStage(['PICKUP_SHG', 'SHG_ACCEPTED', 'PARCEL_AT_SHG', 'PICKED'])
      } : null },
      { id: 'pickup_transporter', label: 'Pickup Transporter', state: pickupTransporterState, details: (order.pickupTransporterDetails) ? {
        'Person Name': order.pickupTransporterDetails.name || 'N/A',
        'Role': 'Pickup Transporter',
        'Mobile': order.pickupTransporterDetails.mobile || 'N/A',
        'Address': order.pickupTransporterDetails.address || 'N/A',
        'Vehicle': order.pickupTransporterDetails.vehicle || 'N/A',
        'Order ID': order.id,
        'Accepted (Date & Time)': formatIndianDateTime(order.pickupTransporterAcceptedAt || (pickupTransporterState === 'completed' || pickupTransporterState === 'active' ? (order.createdAt || order.orderDate) : null)),
        'Pickup (Date & Time)': formatIndianDateTime(order.pickupTransporterPickedAt || (pickupTransporterState === 'completed' ? (order.storedAt || order.warehouseReceivedAt || order.updatedAt) : null)),
        'Status': order.pickupTransporterStatus || 'PENDING',
        'History': getLogsForStage(['TRANSPORTER_PICKUP', 'IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER'])
      } : null },
      { id: 'gmu_hub', label: 'GMU Hub', state: gmuHubState, details: {
        'Warehouse': 'GMU Hub Central Warehouse',
        'Order ID': order.id,
        'Parcel Information': `${order.productCount || 1} product(s), Weight: ${order.weight || '0.5'} KG, Qty: ${order.quantity || 1} units`,
        'Pickup (Intake Date & Time)': formatIndianDateTime(order.gmuHubIntakeAt || order.warehouseReceivedDate || order.warehouseReceivedAt || (gmuHubState === 'completed' || isPhase1Concluded ? (order.storedAt || order.createdAt) : null)),
        'Drop (Stored Date & Time)': formatIndianDateTime(order.gmuHubStoredAt || order.storedDate || order.storedAt || (gmuHubState === 'completed' || isPhase1Concluded ? (order.storedAt || order.createdAt) : null)),
        'Status': isHubCompleted ? 'STORED' : (gmuHubState === 'active' ? 'RECEIVED' : 'PENDING'),
        'History': getLogsForStage(['WAREHOUSE', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED'])
      } },
      { id: 'drop_transporter', label: 'Drop Transporter', state: dropTransporterState, details: (order.dropTransporterDetails) ? {
        'Person Name': order.dropTransporterDetails.name || 'N/A',
        'Role': 'Drop Transporter',
        'Mobile': order.dropTransporterDetails.mobile || 'N/A',
        'Address': order.dropTransporterDetails.address || 'N/A',
        'Vehicle': order.dropTransporterDetails.vehicle || 'N/A',
        'Order ID': order.id,
        'Accepted (Date & Time)': formatIndianDateTime(order.dropTransporterAcceptedAt || (dropTransporterState === 'completed' || dropTransporterState === 'active' ? (order.dispatchedAt || order.storedAt || order.updatedAt) : null)),
        'Pickup (Date & Time)': formatIndianDateTime(order.dropTransporterPickedAt || (dropTransporterState === 'completed' ? (order.dispatchedAt || order.updatedAt) : null)),
        'Status': order.dropTransporterStatus || 'PENDING',
        'History': getLogsForStage(['TRANSPORTER_DROP_PICKUP', 'IN_TRANSIT_TO_BUYER', 'DROP_TRANSPORTER', 'DISPATCHED'])
      } : null },
      { id: 'drop_shg', label: 'Drop SHG', state: dropShgState, details: (order.dropShgDetails) ? {
        'Person Name': order.dropShgDetails.name || 'N/A',
        'Role': 'Drop Self Help Group',
        'Mobile': order.dropShgDetails.mobile || 'N/A',
        'Address': order.dropShgDetails.address || 'N/A',
        'Order ID': order.id,
        'Accepted (Date & Time)': formatIndianDateTime(order.dropShgAcceptedAt || (dropShgState === 'completed' || dropShgState === 'active' ? (order.dispatchedAt || order.updatedAt) : null)),
        'Pickup (Date & Time)': formatIndianDateTime(order.dropShgPickedAt || (dropShgState === 'completed' ? order.updatedAt : null)),
        'Status': order.dropShgStatus || 'PENDING',
        'History': getLogsForStage(['DROP_SHG', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'SHG_DROP_PICKUP'])
      } : null },
      { id: 'buyer', label: 'Buyer', state: buyerState, details: {
        'Person Name': order.buyerName || order.buyer?.fullName || 'N/A',
        'Role': 'Consignee / Buyer',
        'Mobile Number': order.buyerMobile || order.buyer?.mobile || 'N/A',
        'Address': order.buyerAddress || order.buyer?.address || 'N/A',
        'Order ID': order.id,
        'Receive (Date & Time)': formatIndianDateTime(order.buyerDeliveredAt || order.deliveredAt || (isBuyerCompleted ? order.updatedAt : null)),
        'Status': isBuyerCompleted ? 'DELIVERED' : 'PENDING',
        'History': getLogsForStage(['DELIVERED', 'COMPLETED', 'BUYER', 'FINAL_DELIVERY'])
      } }
    ];

    return nodes;
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

  const handleGenerateAllQr = async (orderId: string) => {
    try {
      setIsGeneratingQr(true);
      const res = await generateQr(orderId, true);
      if (res && selectedOrderDetails) {
        setSelectedOrderDetails((prev: any) => prev ? { ...prev, parcels: res } : prev);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate QR codes.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

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
          console.warn("Auto-generate QR failed in InventoryManagementPage:", err);
        } finally {
          setIsGeneratingQr(false);
        }
      };
      autoFetchQr();
    }
  }, [isViewModalOpen, selectedOrderDetails?.id]);

  // QR Scan Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Dispatch QR verification states
  const [dispatchParcels, setDispatchParcels] = useState<any[]>([]);
  const [loadingDispatchParcels, setLoadingDispatchParcels] = useState(false);
  const [scanningParcel, setScanningParcel] = useState<any | null>(null);

  useEffect(() => {
    if (isQrModalOpen && qrItem) {
      setLoadingDispatchParcels(true);
      const loadParcels = async () => {
        try {
          const res = await api.orders.generateQr(qrItem.uuid || qrItem.id, false);
          if (res) {
            setDispatchParcels(res);
          }
        } catch (e) {
          console.error("Error loading dispatch parcels:", e);
        } finally {
          setLoadingDispatchParcels(false);
        }
      };
      loadParcels();
    } else {
      setDispatchParcels([]);
    }
  }, [isQrModalOpen, qrItem]);

  const handleSimulatedDispatchScan = async (parcel: any) => {
    setScanningParcel(parcel);
    setTimeout(async () => {
      try {
        await api.orders.verifyQr(parcel.parcelId, parcel.verificationToken, 'GMU');
        setDispatchParcels(prev => 
          prev.map(p => p.parcelId === parcel.parcelId ? { ...p, parcelStatus: 'DISPATCHED' } : p)
        );
      } catch (err: any) {
        alert(err.message || 'Verification failed');
      } finally {
        setScanningParcel(null);
      }
    }, 2000);
  };

  // Filters and Loading state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async (isManualRefresh = false) => {
    const hasData = incomingInventory.length > 0 || returnDropInventory.length > 0 || returnPickupInventory.length > 0;
    if (!hasData) {
      setIsLoading(true);
    } else if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setErrorMsg('');
    try {
      const sf = statusFilter === 'all' ? undefined : statusFilter;
      const df = dateFilter || undefined;
      await loadCounts();
      if (activeSubTab === 'incoming') {
        await loadInventoryStored(sf, df);
      } else if (activeSubTab === 'returnDrop') {
        await loadInventoryTransporterReturn(sf, df);
      } else if (activeSubTab === 'returnPickup') {
        await loadInventoryBuyerReturn(sf, df);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load inventory data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab, statusFilter, dateFilter]);

  useEffect(() => {
    setStatusFilter('all');
    setDateFilter('');
  }, [activeSubTab]);

  const handleOpenQrModal = (item: InventoryItem) => {
    setQrItem(item);
    setIsQrModalOpen(true);
    setQrScanSuccess(false);
    setIsScanning(false);
    setScanMessage('');
  };

  const handleSimulateScan = async () => {
    setIsScanning(true);
    setScanMessage('Scanning QR Code...');
    try {
      if (qrItem) {
        await dispatchInventory(qrItem.id);
        setQrScanSuccess(true);
        setScanMessage('Order dispatched successfully.');
        await loadData();
      }
    } catch (err: any) {
      setScanMessage(err.message || 'Failed to dispatch order.');
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        setIsQrModalOpen(false);
      }, 1500);
    }
  };

  const handleViewItem = async (item: InventoryItem) => {
    setSelectedItem(item);
    setSelectedOrderDetails(item);
    setIsViewModalOpen(true);
    try {
      const fresh = await api.orders.getDetails(item.uuid || item.id);
      if (fresh) {
        const mapped = mapOrder(fresh, 'pickup');
        setSelectedOrderDetails(mapped);
      }
    } catch (e) {
      console.error("Failed to load fresh order details on view click:", e);
    }
  };

  const handleMoveRackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRackInput.trim()) {
      setWmsRackCode(newRackInput.trim().toUpperCase());
      setIsMoveRackOpen(false);
      setWmsNotification(`Stock relocated to slot: ${newRackInput.trim().toUpperCase()}`);
      setNewRackInput('');
      setTimeout(() => setWmsNotification(null), 4000);
    }
  };

  const getActionButtons = (row: InventoryItem, tab: string) => {
    const statusLower = row.status?.toLowerCase() || '';
    const canDispatch = (tab === 'incoming' || tab === 'returnDrop') && (
      statusLower === 'stored' ||
      statusLower === 'at_hub' ||
      statusLower === 'at hub' ||
      statusLower === 'hub_received' ||
      statusLower === 'hub received' ||
      statusLower === 'drop_assigned' ||
      statusLower === 'drop assigned' ||
      statusLower === 'on_hold' ||
      statusLower === 'on hold' ||
      statusLower === 'pending acceptance' ||
      statusLower === 'return drop inventory' ||
      statusLower === 'inventory_transporter_return'
    );

    return (
      <div className="relative inline-block text-left">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const shouldOpenUpwards = rect.bottom > window.innerHeight * 0.65;
            setOpenUpwards(shouldOpenUpwards);
            setActiveActionMenu(activeActionMenu === row.id ? null : row.id);
          }}
          className="p-1.5 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-[#073318] rounded-lg transition-colors cursor-pointer border border-slate-200/60 shadow-sm flex items-center justify-center"
          title="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {activeActionMenu === row.id && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setActiveActionMenu(null);
              }}
            />
            <div className={`absolute right-0 w-48 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 z-50 p-1.5 space-y-0.5 animate-in fade-in ${openUpwards ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'} duration-150`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveActionMenu(null);
                  handleViewItem(row);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#073318]/5 hover:text-[#073318] rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-slate-400" />
                <span>View Details</span>
              </button>

              {canDispatch && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    handleOpenQrModal(row);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#073318] hover:bg-[#B2D534]/20 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                >
                  <QrCode className="h-4 w-4 text-[#073318]/70" />
                  <span>Scan QR</span>
                </button>
              )}

              {(statusLower === 'at_hub' || statusLower === 'at hub' || statusLower === 'hub_received' || statusLower === 'hub received' || statusLower === 'parcel_at_gmu') && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    try {
                      await readyToStore(row.id);
                      alert('Order stored in inventory successfully.');
                      await loadData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to store in inventory.');
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#073318] hover:bg-[#B2D534]/20 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-[#073318]/70" />
                  <span>Store in Inventory</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // --- COLUMN SCHEMAS ---

  // Incoming Inventory
  const incomingColumns = [
    { header: 'Order ID', accessor: 'id' as keyof InventoryItem },
    { header: 'Start Date', accessor: 'orderDate' as keyof InventoryItem },
    { header: 'Delivery Expected Date', accessor: (row: InventoryItem) => getExpectedDeliveryDate(row.orderDate) },
    { header: 'Warehouse Received Date', accessor: 'storeDate' as keyof InventoryItem },
    { header: 'Product Count', accessor: 'productCount' as keyof InventoryItem },
    { header: 'Total Qty', accessor: 'totalQty' as keyof InventoryItem },
    { header: 'Total Weight', accessor: 'totalWeight' as keyof InventoryItem },
    { header: 'Status', accessor: (row: InventoryItem) => <StatusBadge status={row.status} /> },
    { header: 'Action', accessor: (row: InventoryItem) => getActionButtons(row, 'incoming') },
  ];

  // Return Pickup Inventory
  const returnPickupColumns = [
    { header: 'Order ID', accessor: 'id' as keyof InventoryItem },
    { header: 'Seller Name', accessor: 'sellerName' as keyof InventoryItem },
    { header: 'Seller Mobile Number', accessor: 'sellerMobile' as keyof InventoryItem },
    { header: 'Seller Village/City', accessor: 'sellerVillage' as keyof InventoryItem },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof InventoryItem },
    { header: 'Buyer Mobile Number', accessor: 'buyerMobile' as keyof InventoryItem },
    { header: 'Buyer Village/City', accessor: 'buyerVillage' as keyof InventoryItem },
    { header: 'Start Date', accessor: 'orderDate' as keyof InventoryItem },
    { header: 'Delivery Expected Date', accessor: (row: InventoryItem) => getExpectedDeliveryDate(row.orderDate) },
    { header: 'Warehouse Received Date', accessor: 'storeDate' as keyof InventoryItem },
    { header: 'Product Count', accessor: 'productCount' as keyof InventoryItem },
    { header: 'Total Qty', accessor: 'totalQty' as keyof InventoryItem },
    { header: 'Total Weight', accessor: 'totalWeight' as keyof InventoryItem },
    { header: 'Status', accessor: (row: InventoryItem) => <StatusBadge status={row.status} /> },
    { header: 'Action', accessor: (row: InventoryItem) => getActionButtons(row, 'returnPickup') },
  ];

  // Return Drop Inventory
  const returnDropColumns = [
    { header: 'Order ID', accessor: 'id' as keyof InventoryItem },
    { header: 'Start Date', accessor: 'orderDate' as keyof InventoryItem },
    { header: 'Delivery Expected Date', accessor: (row: InventoryItem) => getExpectedDeliveryDate(row.orderDate) },
    { header: 'Warehouse Received Date', accessor: 'storeDate' as keyof InventoryItem },
    { header: 'Product Count', accessor: 'productCount' as keyof InventoryItem },
    { header: 'Total Qty', accessor: 'totalQty' as keyof InventoryItem },
    { header: 'Total Weight', accessor: 'totalWeight' as keyof InventoryItem },
    { header: 'Status', accessor: (row: InventoryItem) => <StatusBadge status={row.status} /> },
    { header: 'Action', accessor: (row: InventoryItem) => getActionButtons(row, 'returnDrop') },
  ];



  // Incoming with Selection
  const incomingColumnsWithSelection = [
    {
      header: '',
      accessor: (row: InventoryItem) => (
        <input
          type="checkbox"
          checked={selectedIncomingItemIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIncomingItemIds((prev) => [...prev, row.id]);
            } else {
              setSelectedIncomingItemIds((prev) => prev.filter((id) => id !== row.id));
            }
          }}
          className="h-4 w-4 text-[#073318] focus:ring-[#073318] border-slate-300 rounded cursor-pointer"
        />
      ),
    },
    ...incomingColumns,
  ];

  // Return Drop with Selection
  const returnDropColumnsWithSelection = [
    {
      header: '',
      accessor: (row: InventoryItem) => (
        <input
          type="checkbox"
          checked={selectedReturnDropItemIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedReturnDropItemIds((prev) => [...prev, row.id]);
            } else {
              setSelectedReturnDropItemIds((prev) => prev.filter((id) => id !== row.id));
            }
          }}
          className="h-4 w-4 text-[#073318] focus:ring-[#073318] border-slate-300 rounded cursor-pointer"
        />
      ),
    },
    ...returnDropColumns,
  ];

  return (
    <Layout currentPage="inventory-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#B2D534]/30 to-[#B2D534]/10 p-3.5 rounded-2xl border border-[#B2D534]/45 shadow-sm">
            <Layers className="h-7 w-7 text-[#073318]" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Inventory Management</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Track inventory across all warehouse staging cycles.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold">
            {errorMsg}
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-4 text-xs font-bold text-slate-500 gap-2">
            <span className="w-4 h-4 border-2 border-[#073318] border-t-transparent rounded-full animate-spin" />
            Loading live inventory data from GMU APIs...
          </div>
        )}

        {/* Filter stored vs dispatched items for clear segregation */}
        {(() => {
          const isDispatchedStatus = (st?: string) => {
            if (!st) return false;
            const s = st.toUpperCase();
            return ['DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(s);
          };

          const storedInventoryList = incomingInventory
            .filter(item => !isDispatchedStatus(item.status))
            .map(item => ({ ...item, status: 'STORED' }));

          const dispatchedInventoryList = incomingInventory
            .filter(item => isDispatchedStatus(item.status))
            .map(item => ({ ...item, status: 'DISPATCHED' }));

          return (
            <>
              {/* Tab Selection */}
              <Tabs
                activeTab={activeSubTab}
                onChange={setActiveSubTab}
                tabs={[
                  { id: 'incoming', label: 'Stored Orders', count: storedInventoryList.length },
                  { id: 'dispatched', label: 'Dispatched Orders', count: dispatchedInventoryList.length },
                  { id: 'returnDrop', label: 'Transporter Return Orders', count: counts.inventory.transporterReturn },
                  { id: 'returnPickup', label: 'Buyer Return Orders', count: counts.inventory.buyerReturn },
                ]}
              />

              {/* Main Data Tables */}
              {activeSubTab === 'incoming' && (
                <DataTable
                  columns={incomingColumns}
                  data={storedInventoryList}
                  statusFilterField="status"
                  statusFilterOptions={['Stored', 'Dispatched']}
                  selectedStatus={statusFilter}
                  onStatusChange={setStatusFilter}
                  selectedDate={dateFilter}
                  onDateChange={setDateFilter}
                  onRowDoubleClick={handleViewItem}
                  onRefresh={() => loadData(true)}
                  isRefreshing={isRefreshing}
                />
              )}
              {activeSubTab === 'dispatched' && (
                <DataTable
                  columns={incomingColumns}
                  data={dispatchedInventoryList}
                  statusFilterField="status"
                  statusFilterOptions={['Dispatched', 'In Transit']}
                  selectedStatus={statusFilter}
                  onStatusChange={setStatusFilter}
                  selectedDate={dateFilter}
                  onDateChange={setDateFilter}
                  onRowDoubleClick={handleViewItem}
                  onRefresh={() => loadData(true)}
                  isRefreshing={isRefreshing}
                />
              )}
              {activeSubTab === 'returnPickup' && (
                <DataTable
                  columns={returnPickupColumns}
                  data={returnPickupInventory}
                  selectedDate={dateFilter}
                  onDateChange={setDateFilter}
                  onRowDoubleClick={handleViewItem}
                  onRefresh={() => loadData(true)}
                  isRefreshing={isRefreshing}
                />
              )}
              {activeSubTab === 'returnDrop' && (
                <DataTable
                  columns={returnDropColumns}
                  data={returnDropInventory}
                  statusFilterField="status"
                  statusFilterOptions={['Stored', 'Dispatched']}
                  selectedStatus={statusFilter}
                  onStatusChange={setStatusFilter}
                  selectedDate={dateFilter}
                  onDateChange={setDateFilter}
                  onRowDoubleClick={handleViewItem}
                  onRefresh={() => loadData(true)}
                  isRefreshing={isRefreshing}
                />
              )}
            </>
          );
        })()}

        {/* --- VIEW ORDER DETAILS DRAWER --- */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Inventory Details: ${selectedOrderDetails?.id || ''}`}
          variant="modal"
          size="full"
          hideHeader={true}
        >
          {selectedOrderDetails && (() => {
            const wms = getWmsDetails(selectedOrderDetails, wmsRackCode, wmsCondition);
            const logs = getWarehouseActivityLog(selectedOrderDetails, wms.locationCode);
            
            const handlePrintBarcode = () => {
              setWmsNotification("Barcode labels queued for print: INV-ID and QR codes.");
              setTimeout(() => setWmsNotification(null), 4000);
            };

            const handleMarkDamaged = () => {
              setWmsCondition("Damaged");
              setWmsNotification("Stock condition updated to: Damaged");
              setTimeout(() => setWmsNotification(null), 4000);
            };

            const handleUpdateCondition = (e: React.ChangeEvent<HTMLSelectElement>) => {
              setWmsCondition(e.target.value);
              setWmsNotification(`Stock condition updated to: ${e.target.value}`);
              setTimeout(() => setWmsNotification(null), 4000);
            };

            const isDispatched = ['DISPATCHED', 'COMPLETED', 'DELIVERED'].includes(selectedOrderDetails.mainStatus);

            return (
              <div className="space-y-6 text-slate-800">
                {/* WMS Notification Banner */}
                {wmsNotification && (
                  <div className="bg-[#073318] text-white px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-bounce">
                    <span className="flex items-center gap-2">
                      <span className="bg-[#B2D534] text-[#073318] rounded-full p-1 text-[8px] font-black">✓</span>
                      {wmsNotification}
                    </span>
                    <button onClick={() => setWmsNotification(null)} className="text-white/80 hover:text-white font-bold text-sm">×</button>
                  </div>
                )}

                {/* Warehouse Header Section */}
                <div className="bg-gradient-to-r from-[#073318] to-[#124b27] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full filter blur-2xl pointer-events-none" />
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-3 font-sans text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-[#B2D534] text-[#073318] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                          {wms.inventoryId}
                        </span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          wms.condition === 'Good' ? 'bg-emerald-500/20 text-emerald-300' :
                          wms.condition === 'Damaged' ? 'bg-red-500/20 text-red-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          Condition: {wms.condition}
                        </span>
                        <span className="bg-white/10 text-slate-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                          {selectedOrderDetails.mainStatus?.replace(/[-_]/g, ' ')}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight">
                        Inventory Stock Record
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs text-slate-200 pt-1">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Order ID</span>
                          <span className="font-mono font-bold text-white">{selectedOrderDetails.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Barcode ID</span>
                          <span className="font-mono font-bold text-white">{wms.barcodeId}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Warehouse Received</span>
                          <span className="font-bold text-white">{wms.receivedDate} | {wms.receivedTime}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Storage Slot Date</span>
                          <span className="font-bold text-white">{wms.storageDate}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setIsViewModalOpen(false)}
                      className="h-11 px-5 bg-white/15 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 self-start lg:self-center border border-white/10"
                    >
                      Close Details
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Details */}
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
                          <p className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Total Qty</p>
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
                              {selectedOrderDetails.orderDate || (selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ')[0] : '-')}
                            </p>
                          </div>
                          <Calendar className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                          <div className="text-left">
                            <p className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Expected Delivery</p>
                            <p className="text-sm font-black text-amber-700 mt-0.5">
                              {getExpectedDeliveryDate(selectedOrderDetails.orderDate || (selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ')[0] : ''))}
                            </p>
                          </div>
                          <Truck className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
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
                        {/* Seller Information */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Seller Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.sellerName || 'N/A'}</h5>
                          {selectedOrderDetails.sellerMobile && (
                            <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                              <p className="flex items-center gap-2">
                                <span className="font-bold text-slate-455 uppercase text-[9px] w-20 shrink-0">Contact:</span>
                                <span>{selectedOrderDetails.sellerMobile || 'N/A'}</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="font-bold text-slate-455 uppercase text-[9px] w-20 shrink-0">Address:</span>
                                <span className="leading-tight">{selectedOrderDetails.sellerAddress || 'N/A'}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Buyer Information */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Buyer Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.buyerName || 'N/A'}</h5>
                          {selectedOrderDetails.buyerMobile && (
                            <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                              <p className="flex items-center gap-2">
                                <span className="font-bold text-slate-455 uppercase text-[9px] w-20 shrink-0">Contact:</span>
                                <span>{selectedOrderDetails.buyerMobile || 'N/A'}</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <span className="font-bold text-slate-455 uppercase text-[9px] w-20 shrink-0">Address:</span>
                                <span className="leading-tight">{selectedOrderDetails.buyerAddress || 'N/A'}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Warehouse Controls & Internal Actions */}
                  <div className="space-y-6">
                    {/* WMS Actions Panel */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-left space-y-4">
                      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#073318] tracking-widest uppercase flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Warehouse Controls
                        </h4>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
                          <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">QA Condition:</span>
                          <select
                            value={wmsCondition}
                            onChange={handleUpdateCondition}
                            className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer w-full"
                          >
                            <option value="Good">Good</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Pending QA">Pending QA</option>
                          </select>
                        </div>

                        <button
                          onClick={handlePrintBarcode}
                          className="w-full py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                        >
                          <Barcode className="h-4 w-4" />
                          Print Barcode Label
                        </button>
                        
                        <button
                          onClick={() => {
                            setNewRackInput(wmsRackCode);
                            setIsMoveRackOpen(true);
                          }}
                          className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          Relocate (Current: {wmsRackCode})
                        </button>

                        <button
                          onClick={handleMarkDamaged}
                          className="w-full py-3 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Mark Damaged / QA Flag
                        </button>

                        {!isDispatched && (
                          <button
                            onClick={() => handleGenerateAllQr(selectedOrderDetails.uuid || selectedOrderDetails.id)}
                            className="w-full py-3 bg-[#B2D534] hover:bg-[#B2D534]/90 text-[#073318] rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                          >
                            <QrCode className="h-4 w-4" />
                            Regenerate QRs
                          </button>
                        )}
                        
                        {selectedOrderDetails.mainStatus === 'STORED' && (
                          <button
                            onClick={() => {
                              setQrItem(selectedOrderDetails);
                              setIsQrModalOpen(true);
                            }}
                            className="w-full py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                          >
                            <Truck className="h-4 w-4" />
                            Dispatch Stock Verification
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setWmsNotification("Stock returned to seller workflow initiated.");
                            setTimeout(() => setWmsNotification(null), 4000);
                          }}
                          className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Return to Seller
                        </button>
                      </div>
                    </div>

                    {/* Warehouse Parcels list */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-left space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-bold text-[#073318] tracking-widest uppercase flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          Stock Parcels & QR
                        </h4>
                        {selectedOrderDetails.parcels && selectedOrderDetails.parcels.length > 0 && (
                          <button
                            onClick={() => handleDownloadAllQr(selectedOrderDetails.parcels)}
                            className="text-[10px] text-[#073318] font-bold hover:underline bg-transparent border-none p-0"
                          >
                            Download All
                          </button>
                        )}
                      </div>

                      {!selectedOrderDetails.parcels || selectedOrderDetails.parcels.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                          <p className="text-[11px] font-semibold text-slate-500">No active parcels QR codes found.</p>
                          <button
                            onClick={() => handleGenerateAllQr(selectedOrderDetails.uuid || selectedOrderDetails.id)}
                            disabled={isGeneratingQr}
                            className="bg-[#073318] text-white text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-pointer"
                          >
                            Generate
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {selectedOrderDetails.parcels.map((parcel: any) => (
                            <div key={parcel.parcelId} className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl transition-all">
                              <img
                                src={parcel.qrImage}
                                alt={`Parcel ${parcel.parcelNumber}`}
                                className="h-9 w-9 object-contain rounded-lg border border-slate-200"
                              />
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-[10px] text-slate-650 font-bold truncate">
                                  Parcel {parcel.parcelNumber}/{parcel.totalParcels} | {parcel.weight}
                                </p>
                                <span className={`inline-block text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider ${
                                  parcel.parcelStatus === 'DELIVERED' || parcel.parcelStatus === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : parcel.parcelStatus.includes('IN_TRANSIT') || parcel.parcelStatus === 'DISPATCHED'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {parcel.parcelStatus.replace(/[-_]/g, ' ')}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 text-right text-[10px] font-bold">
                                <a
                                  href={parcel.qrImage}
                                  download={`QR_${parcel.orderId}_Parcel_${parcel.parcelNumber}.png`}
                                  className="text-[#073318] hover:underline"
                                >
                                  QR
                                </a>
                                <button
                                  onClick={() => {
                                    setSelectedParcel(parcel);
                                    setIsParcelPreviewOpen(true);
                                  }}
                                  className="text-slate-500 hover:underline bg-transparent border-none p-0 cursor-pointer text-[10px] font-bold"
                                >
                                  Preview
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Warehouse Log Timeline */}
                    <div className="bg-[#073318] rounded-3xl p-6 text-white flex flex-col justify-between space-y-4 shadow-md min-h-[220px]">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-white border-b border-white/10 pb-2">
                          <FileSpreadsheet className="h-4 w-4 text-[#B2D534]" />
                          <span className="font-extrabold text-xs uppercase tracking-wider">Warehouse Action Logs</span>
                        </div>

                        <div className="relative border-l border-white/20 pl-4 space-y-4 ml-2 py-1 text-left">
                          {logs.map((log: any, idx: number) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[22.5px] top-1 h-3 w-3 rounded-full bg-[#B2D534] border border-[#073318]" />
                              <p className="text-[10px] font-black text-[#B2D534]">{log.time}</p>
                              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                                {log.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>

        {/* --- MOVE RACK MODAL --- */}
        <Modal
          isOpen={isMoveRackOpen}
          onClose={() => setIsMoveRackOpen(false)}
          title="Relocate Stock Storage Slot"
          variant="modal"
        >
          <form onSubmit={handleMoveRackSubmit} className="space-y-4 p-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase">New Storage Slot / Rack Code</label>
              <input
                type="text"
                value={newRackInput}
                onChange={(e) => setNewRackInput(e.target.value)}
                placeholder="e.g. RACK-B2, SLOT-4"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-[#073318] focus:border-[#073318]"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMoveRackOpen(false)}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl font-bold transition-all text-xs border-none"
              >
                Confirm Move
              </button>
            </div>
          </form>
        </Modal>

        {/* --- PARCEL PREVIEW MODAL --- */}
        <Modal
          isOpen={isParcelPreviewOpen}
          onClose={() => setIsParcelPreviewOpen(false)}
          title={`Parcel Details: ${selectedParcel?.parcelNumber || ''}`}
          variant="modal"
        >
          {selectedParcel && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm relative">
                  <img
                    src={selectedParcel.qrImage}
                    alt={`Parcel QR ${selectedParcel.parcelNumber}`}
                    className="h-48 w-48 object-contain"
                  />
                </div>
                <span className="text-xs font-black text-[#073318] tracking-widest uppercase">
                  Parcel {selectedParcel.parcelNumber} / {selectedParcel.totalParcels}
                </span>
                <div className="text-xs font-semibold text-slate-650 space-y-1">
                  <p>Barcode: {selectedParcel.barcode || 'N/A'}</p>
                  <p>Qty: {selectedParcel.quantity} ({selectedParcel.weight})</p>
                  <p>Status: {selectedParcel.parcelStatus.replace(/[-_]/g, ' ')}</p>
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsParcelPreviewOpen(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold transition-all cursor-pointer text-xs"
                >
                  Close
                </button>
                <a
                  href={selectedParcel.qrImage}
                  download={`QR_${selectedParcel.orderId}_Parcel_${selectedParcel.parcelNumber}.png`}
                  className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold transition-all cursor-pointer text-xs flex items-center justify-center gap-2 border-none"
                >
                  <Download className="h-4 w-4" />
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
          title="Scan QR Code for Dispatch"
          variant="modal"
        >
          {qrItem && (() => {
            const verifiedCount = dispatchParcels.filter(p => ['DISPATCHED', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED', 'VERIFIED'].includes(p.parcelStatus)).length;
            const allVerified = dispatchParcels.length > 0 && verifiedCount === dispatchParcels.length;

            return (
              <div className="space-y-6 text-center relative min-h-[300px]">
                {/* Simulated Scanning Viewfinder Overlay */}
                {scanningParcel && (
                  <div className="absolute inset-0 bg-slate-950/95 rounded-3xl z-50 flex flex-col items-center justify-center text-white p-6">
                    <div className="relative w-40 h-40 border-2 border-dashed border-[#B2D534] rounded-3xl flex items-center justify-center bg-slate-900 overflow-hidden shadow-inner">
                      <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_10px_red] animate-bounce top-1/2" />
                      <QrCode className="h-16 w-16 text-[#B2D534] animate-pulse" />
                    </div>
                    <p className="mt-4 font-bold text-xs tracking-wide text-[#B2D534] animate-pulse">Scanning QR for {scanningParcel.productName}...</p>
                    <p className="text-[9px] text-slate-400 mt-1">Simulating 2-second GMU Hub dispatch scanner verify</p>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs font-semibold text-slate-700">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Order ID</span>
                      <span className="font-mono text-sm text-[#073318] font-bold">{qrItem.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Parcel Info</span>
                      <span className="font-semibold text-slate-800">{qrItem.totalQty || 0} items | {qrItem.totalWeight || 0} KG</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                      <span className="text-slate-400 block text-[9px] uppercase">Buyer / Destination</span>
                      <span className="text-slate-800">{qrItem.buyerName || 'N/A'} - {qrItem.buyerAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Product Dispatch Checklist Card */}
                <div className="border border-slate-200 rounded-2xl p-4 text-left bg-white shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className="font-extrabold text-xs text-[#073318] uppercase tracking-wider">Parcels Dispatch Verification</span>
                    <span className="text-[11px] font-black text-slate-500">{verifiedCount} of {dispatchParcels.length} verified</span>
                  </div>
                  
                  {loadingDispatchParcels ? (
                    <p className="text-xs text-slate-400 italic">Loading parcels information...</p>
                  ) : (
                    <div className="space-y-2">
                      {dispatchParcels.map((parcel, idx) => {
                        const isItemVerified = ['DISPATCHED', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_DROP_SHG', 'DELIVERED', 'COMPLETED', 'VERIFIED'].includes(parcel.parcelStatus);
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
                                  type="button"
                                onClick={() => handleSimulatedDispatchScan(parcel)}
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

                {/* Final dispatch button */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsScanning(true);
                    setScanMessage('Finalizing dispatch...');
                    try {
                      await dispatchInventory(qrItem.id);
                      setQrScanSuccess(true);
                      setScanMessage('Order dispatched successfully.');
                      await loadData();
                    } catch (err: any) {
                      setScanMessage(err.message || 'Failed to dispatch order.');
                    } finally {
                      setIsScanning(false);
                      setTimeout(() => {
                        setIsQrModalOpen(false);
                        setQrScanSuccess(false);
                        setScanMessage('');
                      }, 1500);
                    }
                  }}
                  disabled={isScanning || !allVerified || loadingDispatchParcels}
                  className="w-full py-3 bg-[#073318] hover:bg-[#073318]/90 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isScanning ? 'Processing...' : 'Confirm Dispatch Order'}
                </button>
              </div>
            );
          })()}
        </Modal>
      </div>
    </Layout>
  );
};
