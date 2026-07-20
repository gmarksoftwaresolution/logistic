import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Tabs } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { InventoryItem } from '../context/AppContext';
import { Eye, Layers, Truck, X, FileText, MoreVertical, Phone, MapPin, Calendar, Clock, Package, QrCode, CheckCircle, Store, Users, User, Download, Home } from 'lucide-react';
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
  const [isParcelPreviewOpen, setIsParcelPreviewOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  const getNodeTimeAndDate = (order: any, nodeLabel: string) => {
    const lbl = nodeLabel.toLowerCase();
    let timestamp: string | null = null;
    
    if (order.tracking && order.tracking.length > 0) {
      let statusKeywords: string[] = [];
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

      const event = order.tracking.find((t: any) => 
        statusKeywords.some(kw => t.status === kw || t.status?.toUpperCase().includes(kw))
      );
      if (event) {
        timestamp = event.updatedAt || event.scanTime || event.createdAt;
      }
    }
    
    if (!timestamp) {
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

  const getTimelineNodes = (order: any) => {
    const getLogsForStage = (stageKeywords: string[]) => {
      if (!order.tracking || order.tracking.length === 0) return 'No scan events logged.';
      const matching = order.tracking.filter((t: any) => 
        stageKeywords.some(kw => t.status?.toUpperCase().includes(kw) || t.remarks?.toUpperCase().includes(kw))
      );
      if (matching.length === 0) return 'No scan events logged yet for this stage.';
      return matching.map((t: any) => `[${t.time || t.date || ''}] ${t.remarks || t.status}`).join('\n');
    };

    // Seller: always completed
    const sellerState = 'completed';

    // Pickup SHG: completed if order is picked (or later status)
    let pickupShgState: 'completed' | 'active' | 'pending' = 'pending';
    const isShgPicked = order.pickupShgStatus === 'PICKED' || ['PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'PARCEL_AT_GMU', 'HUB_RECEIVED', 'PARCEL_AT_HUB', 'STORED', 'DROP_PENDING', 'DROP_CREATED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'DISPATCHED', 'DROP_ASSIGNED', 'DELIVERED', 'COMPLETED'].includes(order.mainStatus) || order.phase === 'DROP';
    if (isShgPicked) {
      pickupShgState = 'completed';
    } else if (['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING', 'PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED'].includes(order.mainStatus)) {
      pickupShgState = 'active';
    }

    // Pickup Transporter: completed if parcel is picked up by transporter (or later status)
    let pickupTransporterState: 'completed' | 'active' | 'pending' = 'pending';
    const isTransPickupCompleted = ['PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB', 'PARCEL_AT_GMU', 'HUB_RECEIVED', 'PARCEL_AT_HUB', 'STORED', 'DROP_PENDING', 'DROP_CREATED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED', 'DISPATCHED', 'DROP_ASSIGNED', 'DELIVERED', 'COMPLETED'].includes(order.mainStatus) || order.phase === 'DROP';
    if (isTransPickupCompleted) {
      pickupTransporterState = 'completed';
    } else if (['TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_SHG'].includes(order.mainStatus) || order.pickupTransporterStatus === 'ACCEPTED') {
      pickupTransporterState = 'active';
    }

    // GMU Hub: completed if dispatched from hub or later status
    let gmuHubState: 'completed' | 'active' | 'pending' = 'pending';
    const isHubCompleted = ['DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'OUT_FOR_DELIVERY', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_BUYER', 'DELIVERED', 'COMPLETED'].includes(order.mainStatus);
    if (isHubCompleted) {
      gmuHubState = 'completed';
    } else if (['IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'AT_HUB', 'STORED', 'DROP_PENDING', 'DROP_CREATED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED'].includes(order.mainStatus) || order.phase === 'DROP') {
      gmuHubState = 'active';
    }

    // Drop Transporter: completed if parcel is at drop SHG/delivered
    let dropTransporterState: 'completed' | 'active' | 'pending' = 'pending';
    const isDropTransCompleted = ['PARCEL_AT_DROP_SHG', 'OUT_FOR_DELIVERY', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_BUYER', 'DELIVERED', 'COMPLETED'].includes(order.mainStatus) || order.dropTransporterStatus === 'DELIVERED';
    if (isDropTransCompleted) {
      dropTransporterState = 'completed';
    } else if (order.phase === 'DROP' && !['DELIVERED', 'COMPLETED'].includes(order.mainStatus)) {
      dropTransporterState = 'active';
    }

    // Drop SHG: completed if delivered/completed
    let dropShgState: 'completed' | 'active' | 'pending' = 'pending';
    const isDropShgCompleted = ['OUT_FOR_DELIVERY', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_BUYER', 'DELIVERED', 'COMPLETED'].includes(order.mainStatus) || order.dropShgStatus === 'DELIVERED' || order.dropShgStatus === 'DROPPED';
    if (isDropShgCompleted) {
      dropShgState = 'completed';
    } else if (order.phase === 'DROP' && ['PARCEL_AT_DROP_SHG'].includes(order.mainStatus)) {
      dropShgState = 'active';
    }

    // Buyer: completed if delivered
    let buyerState: 'completed' | 'active' | 'pending' = 'pending';
    const isBuyerCompleted = ['DELIVERED', 'COMPLETED'].includes(order.mainStatus);
    if (isBuyerCompleted) {
      buyerState = 'completed';
    } else if (order.phase === 'DROP' && ['OUT_FOR_DELIVERY', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_BUYER'].includes(order.mainStatus)) {
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
        'Order Placed Date': order.orderDate || 'N/A',
        'Expected Delivery': getExpectedDeliveryDate(order.orderDate),
        'Status': 'PLACED',
        'Full Scan History': getLogsForStage(['PLACED', 'PENDING_PICKUP', 'SELLER'])
      } },
      { id: 'pickup_shg', label: 'Pickup SHG', state: pickupShgState, details: (order.pickupShgDetails) ? {
        'Person Name': order.pickupShgDetails.name || 'N/A',
        'Role': 'Pickup Self Help Group',
        'Mobile': order.pickupShgDetails.mobile || 'N/A',
        'Address': order.pickupShgDetails.address || 'N/A',
        'Order ID': order.id,
        'Status': order.pickupShgStatus || 'PENDING',
        'Full Scan History': getLogsForStage(['PICKUP_SHG', 'SHG_ACCEPTED', 'PARCEL_AT_SHG', 'PICKED'])
      } : null },
      { id: 'pickup_transporter', label: 'Pickup Transporter', state: pickupTransporterState, details: (order.pickupTransporterDetails) ? {
        'Person Name': order.pickupTransporterDetails.name || 'N/A',
        'Role': 'Pickup Transporter',
        'Mobile': order.pickupTransporterDetails.mobile || 'N/A',
        'Address': order.pickupTransporterDetails.address || 'N/A',
        'Vehicle': order.pickupTransporterDetails.vehicle || 'N/A',
        'Order ID': order.id,
        'Status': order.pickupTransporterStatus || 'PENDING',
        'Full Scan History': getLogsForStage(['TRANSPORTER_PICKUP', 'IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER'])
      } : null },
      { id: 'gmu_hub', label: 'GMU Hub', state: gmuHubState, details: {
        'Warehouse': 'GMU Hub Central Warehouse',
        'Order ID': order.id,
        'Parcel Information': `${order.productCount || 1} product(s), Weight: ${order.weight || '0.5'} KG, Qty: ${order.quantity || 1} units`,
        'Intake Time': order.warehouseReceivedDate || 'N/A',
        'Stored Time': order.storedDate || 'N/A',
        'Status': isHubCompleted ? 'STORED' : (gmuHubState === 'active' ? 'RECEIVED' : 'PENDING'),
        'Full Scan History': getLogsForStage(['WAREHOUSE', 'HUB_RECEIVED', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'STORED'])
      } },
      { id: 'drop_transporter', label: 'Drop Transporter', state: dropTransporterState, details: (order.dropTransporterDetails) ? {
        'Person Name': order.dropTransporterDetails.name || 'N/A',
        'Role': 'Drop Transporter',
        'Mobile': order.dropTransporterDetails.mobile || 'N/A',
        'Address': order.dropTransporterDetails.address || 'N/A',
        'Vehicle': order.dropTransporterDetails.vehicle || 'N/A',
        'Order ID': order.id,
        'Status': order.dropTransporterStatus || 'PENDING',
        'Full Scan History': getLogsForStage(['TRANSPORTER_DROP_PICKUP', 'IN_TRANSIT_TO_BUYER', 'DROP_TRANSPORTER'])
      } : null },
      { id: 'drop_shg', label: 'Drop SHG', state: dropShgState, details: (order.dropShgDetails) ? {
        'Person Name': order.dropShgDetails.name || 'N/A',
        'Role': 'Drop Self Help Group',
        'Mobile': order.dropShgDetails.mobile || 'N/A',
        'Address': order.dropShgDetails.address || 'N/A',
        'Order ID': order.id,
        'Status': order.dropShgStatus || 'PENDING',
        'Full Scan History': getLogsForStage(['DROP_SHG', 'PARCEL_AT_DROP_SHG'])
      } : null },
      { id: 'buyer', label: 'Buyer', state: buyerState, details: {
        'Person Name': order.buyerName || order.buyer?.fullName || 'N/A',
        'Role': 'Consignee / Buyer',
        'Mobile Number': order.buyerMobile || order.buyer?.mobile || 'N/A',
        'Address': order.buyerAddress || order.buyer?.address || 'N/A',
        'Order ID': order.id,
        'Delivery Completed Date': order.deliveredAt || 'N/A',
        'Status': isBuyerCompleted ? 'DELIVERED' : 'PENDING',
        'Full Scan History': getLogsForStage(['DELIVERED', 'COMPLETED', 'BUYER'])
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
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
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

        {/* Tab Selection */}
        <Tabs
          activeTab={activeSubTab}
          onChange={setActiveSubTab}
          tabs={[
            { id: 'incoming', label: 'Stored Orders', count: counts.inventory.stored },
            { id: 'returnDrop', label: 'Transpoter return orders', count: counts.inventory.transporterReturn },
            { id: 'returnPickup', label: 'Buyer return Orders', count: counts.inventory.buyerReturn },
          ]}
        />

        {/* Main Data Tables */}
        {activeSubTab === 'incoming' && (
          <DataTable
            columns={incomingColumns}
            data={incomingInventory}
            statusFilterField="status"
            statusFilterOptions={['Stored', 'Dispatched']}
            selectedStatus={statusFilter}
            onStatusChange={setStatusFilter}
            selectedDate={dateFilter}
            onDateChange={setDateFilter}
            onRowDoubleClick={handleViewItem}
            onRefresh={loadData}
          />
        )}
        {activeSubTab === 'returnPickup' && (
          <DataTable
            columns={returnPickupColumns}
            data={returnPickupInventory}
            selectedDate={dateFilter}
            onDateChange={setDateFilter}
            onRowDoubleClick={handleViewItem}
            onRefresh={loadData}
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
            onRefresh={loadData}
          />
        )}

        {/* --- VIEW ORDER DETAILS DRAWER --- */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Order Profile: ${selectedOrderDetails?.id || ''}`}
          variant="modal"
          size="full"
          hideHeader={true}
        >
          {selectedOrderDetails && (() => {
            const nodes = getTimelineNodes(selectedOrderDetails);
            const isHubCompleted = ['DISPATCHED', 'IN_TRANSIT_TO_DROP_SHG', 'PARCEL_AT_DROP_SHG', 'PARCEL_WITH_DROP_SHG', 'OUT_FOR_DELIVERY', 'IN_TRANSIT_TO_BUYER', 'PARCEL_AT_BUYER', 'DELIVERED', 'COMPLETED'].includes(selectedOrderDetails.mainStatus);
            const gmuHubState = isHubCompleted 
              ? 'completed' 
              : (['IN_TRANSIT_TO_HUB', 'PARCEL_AT_TRANSPORTER', 'PARCEL_AT_GMU', 'PARCEL_AT_HUB', 'HUB_RECEIVED', 'BARCODE_GENERATED', 'AT_HUB', 'STORED', 'DROP_PENDING', 'DROP_CREATED', 'DROP_SHG_ACCEPTED', 'DROP_TRANSPORTER_ACCEPTED'].includes(selectedOrderDetails.mainStatus) || selectedOrderDetails.phase === 'DROP' ? 'active' : 'pending');

            const handleNodeClick = (label: string, details: any) => {
              if (details) {
                alert(`Details for ${label}:\n${JSON.stringify(details, null, 2)}`);
              }
            };

            return (
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

                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                    <span className={`px-4 py-2 rounded-xl font-bold ${['ORDER_PLACED', 'PENDING_PICKUP', 'PICKUP_SHG_PENDING'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>NEW</span>
                    <span className="text-slate-300 px-1 font-bold">➔</span>
                    <span className={`px-4 py-2 rounded-xl font-bold ${['PICKUP_ASSIGNED', 'PICKUP_SHG_ACCEPTED', 'PARCEL_AT_SHG', 'TRANSPORTER_ACCEPTED', 'PICKUP_TRANSPORTER_ACCEPTED', 'PARCEL_AT_TRANSPORTER', 'IN_TRANSIT_TO_HUB'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>IN TRANSIT</span>
                    <span className="text-slate-300 px-1 font-bold">➔</span>
                    <span className={`px-4 py-2 rounded-xl font-bold ${['DELIVERED', 'COMPLETED'].includes(selectedOrderDetails.mainStatus) ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>COMPLETED</span>
                  </div>
                </div>

                {/* --- GRAPHICAL STATUS TIMELINE --- */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-x-auto">
                  <div className="min-w-[800px] py-4 relative">
                    <div className="absolute left-[30px] right-[30px] top-[16px] h-[3px] bg-slate-100 rounded-full -z-0" />
                    
                    <div className="absolute left-[30px] right-[30px] top-[16px] h-[3px] -z-0 flex">
                      {nodes.slice(0, -1).map((node, idx) => {
                        const nextNode = nodes[idx + 1];
                        let segmentBg = 'bg-slate-200';
                        
                        if (node.state === 'completed' && nextNode.state === 'completed') {
                          segmentBg = 'bg-[#073318]';
                        } else if (
                          (node.state === 'completed' && nextNode.state === 'active') || 
                          node.state === 'active'
                        ) {
                          segmentBg = 'bg-gradient-to-r from-[#073318] to-[#0284C7]';
                        }
                        
                        return (
                          <div 
                            key={idx} 
                            className={`flex-1 h-full transition-all duration-300 ${segmentBg}`} 
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-start relative z-10">
                      {nodes.map((node, idx) => {
                        let nodeBg = 'bg-slate-50 border-slate-200 text-slate-355';
                        let iconContent = null;
                        let labelColor = 'text-slate-405';
                        let ringClass = '';
                        const isClickable = !!node.details;
                        
                        const getIconForNode = (label: string) => {
                          const lbl = label.toLowerCase();
                          if (lbl === 'seller') return <Store className="h-3.5 w-3.5" />;
                          if (lbl.includes('shg')) return <Users className="h-3.5 w-3.5" />;
                          if (lbl.includes('transporter')) return <Truck className="h-3.5 w-3.5" />;
                          if (lbl.includes('gmu') || lbl.includes('hub')) return <Home className="h-3.5 w-3.5" />;
                          return <User className="h-3.5 w-3.5" />;
                        };

                        const iconElement = getIconForNode(node.label);

                        if (node.state === 'completed') {
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

                        const dateDetails = getNodeTimeAndDate(selectedOrderDetails, node.label);

                        return (
                          <div 
                            key={idx}
                            onClick={() => isClickable && handleNodeClick(node.label, node.details)}
                            className={`flex flex-col items-center group relative z-10 transition-all duration-300 timeline-node-hover shrink-0 ${isClickable ? 'cursor-pointer' : ''}`}
                          >
                            {node.state === 'active' && (
                              <div className="absolute -top-8 flex flex-col items-center gap-0.5 whitespace-nowrap z-50">
                                <span className="text-[9px] font-black text-[#073318] tracking-wide uppercase">Current Location</span>
                                <span className="text-[#073318] text-[8px] leading-none bounce-marker">▼</span>
                              </div>
                            )}

                            <div className={`h-[32px] w-[32px] rounded-full border-2 flex items-center justify-center font-bold transition-all relative ${nodeBg} ${ringClass} ${isClickable ? 'cursor-pointer' : ''}`}>
                              {iconContent}
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
                              {node.label}
                            </span>
                            {node.state === 'active' ? (
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
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Seller Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.sellerName || 'N/A'}</h5>
                          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                            <div className="flex items-center gap-2 text-slate-650 font-semibold">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-455">Contact:</span>
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
                              <span className="text-slate-455">Contact:</span>
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
                  </div>

                  {/* Right column */}
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
                            className="text-[10px] bg-[#073318] hover:bg-[#073318]/90 text-white font-bold px-2 py-1 rounded-lg transition-all cursor-pointer border-none"
                          >
                            Download All
                          </button>
                        )}
                      </div>

                      {!selectedOrderDetails.parcels || selectedOrderDetails.parcels.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                          <p className="text-xs font-semibold text-slate-500">No QR codes generated for this order yet.</p>
                          <button
                            onClick={() => handleGenerateAllQr(selectedOrderDetails.uuid || selectedOrderDetails.id)}
                            disabled={isGeneratingQr}
                            className="bg-[#073318] hover:bg-[#073318]/90 disabled:bg-slate-350 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer border-none"
                          >
                            {isGeneratingQr ? 'Generating...' : 'Generate QRs'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                          {selectedOrderDetails.parcels.map((parcel: any) => (
                            <div key={parcel.parcelId} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl transition-all">
                              <img
                                src={parcel.qrImage}
                                alt={`Parcel ${parcel.parcelNumber}`}
                                className="h-10 w-10 object-contain rounded-lg border border-slate-200"
                              />
                              <div className="flex-1 text-left">
                                <div className="flex gap-1.5 items-center">
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    Parcel {parcel.parcelNumber}/{parcel.totalParcels}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">|</span>
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    Qty: {parcel.quantity} ({parcel.weight})
                                  </span>
                                </div>
                                <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 mt-1 rounded uppercase tracking-wider ${
                                  parcel.parcelStatus === 'DELIVERED' || parcel.parcelStatus === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : parcel.parcelStatus.includes('IN_TRANSIT') || parcel.parcelStatus === 'DISPATCHED'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {parcel.parcelStatus.replace(/[-_]/g, ' ')}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1.5 text-right">
                                <a
                                  href={parcel.qrImage}
                                  download={`QR_${parcel.orderId}_Parcel_${parcel.parcelNumber}.png`}
                                  className="text-[10px] font-bold text-[#073318] hover:underline"
                                >
                                  Download
                                </a>
                                <button
                                  onClick={() => {
                                    setSelectedParcel(parcel);
                                    setIsParcelPreviewOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-slate-500 hover:underline hover:bg-transparent cursor-pointer border-none p-0 bg-transparent"
                                >
                                  Preview
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-[#073318] rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-lg min-h-[300px]">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white">
                          <Layers className="h-4 w-4 text-[#B2D534]" />
                          <span className="font-extrabold text-sm uppercase tracking-wider">Tracking Audit History</span>
                        </div>

                        <div className="relative border-l border-white/20 pl-4 space-y-4 ml-2.5 py-1 text-left">
                          {selectedOrderDetails.tracking && selectedOrderDetails.tracking.length > 0 ? (
                            selectedOrderDetails.tracking.map((t: any, idx: number) => {
                              const timeStr = t.updatedAt
                                ? new Date(t.updatedAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })
                                : '08:30 AM';
                              return (
                                <div key={idx} className="relative">
                                  <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                                  <p className="text-xs font-black text-[#B2D534]">{timeStr}</p>
                                  <p className="text-xs font-semibold text-slate-200 mt-0.5">
                                    {t.remarks || t.status.replace(/[-_]/g, ' ')}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            <div className="relative">
                              <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                              <p className="text-xs font-black text-[#B2D534]">
                                {selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ').pop() : '08:30 AM'}
                              </p>
                              <p className="text-xs font-semibold text-slate-200 mt-0.5">Order Created</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Inventory details table */}
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
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold bg-white">
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
            );
          })()}
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
