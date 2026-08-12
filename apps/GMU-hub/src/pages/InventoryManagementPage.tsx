import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { InventoryItem } from '../context/AppContext';
import {
  Eye,
  Layers,
  Truck,
  X,
  FileText,
  MoreVertical,
  Phone,
  MapPin,
  Calendar,
  Package,
  QrCode,
  User,
  Copy,
  RefreshCw
} from 'lucide-react';
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

const splitIndianDateTime = (dateStr: string | undefined) => {
  if (!dateStr) return { date: '-', time: '-' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr, time: '' };
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
  } catch (e) {
    return { date: dateStr, time: '' };
  }
};

const formatFullAddress = (
  personObj: any,
  directAddress?: string,
  directVillage?: string,
  directTaluka?: string,
  directDistrict?: string,
  directState?: string,
  directPincode?: string
) => {
  const parts: string[] = [];

  if (personObj) {
    if (personObj.addressLine1) parts.push(personObj.addressLine1);
    if (personObj.addressLine2) parts.push(personObj.addressLine2);
    if (personObj.village) parts.push(personObj.village);
    if (personObj.taluka) parts.push(personObj.taluka);
    if (personObj.district) parts.push(personObj.district);
    if (personObj.state) parts.push(personObj.state);
    if (personObj.pincode) parts.push(personObj.pincode);
    if (parts.length > 0) return parts.join(', ');
    if (personObj.fullAddress) return personObj.fullAddress;
  }

  if (directAddress && directAddress !== directVillage) parts.push(directAddress);
  if (directVillage && !parts.includes(directVillage)) parts.push(directVillage);
  if (directTaluka && !parts.includes(directTaluka)) parts.push(directTaluka);
  if (directDistrict && !parts.includes(directDistrict)) parts.push(directDistrict);
  if (directState && !parts.includes(directState)) parts.push(directState);
  if (directPincode && !parts.includes(directPincode)) parts.push(directPincode);

  if (parts.length > 0) return parts.join(', ');
  return directVillage || 'N/A';
};

export const InventoryManagementPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const {
    incomingInventory,
    returnPickupInventory,
    returnDropInventory,
    loadInventoryStored,
    loadInventoryTransporterReturn,
    loadInventoryBuyerReturn,
    counts,
    loadCounts,
  } = useAppContext();

  // Sub-tabs: incoming | returnDrop | returnPickup
  const [activeSubTab, setActiveSubTab] = useState('incoming');

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [isParcelPreviewOpen, setIsParcelPreviewOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
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

  const handleDownloadAllQr = (parcelsList: any[]) => {
    if (!parcelsList || parcelsList.length === 0) return;
    parcelsList.forEach((p, idx) => {
      if (p.qrImage) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = p.qrImage;
          link.download = `QR_${p.productName || 'Parcel'}_${p.parcelNumber || idx + 1}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, idx * 300);
      }
    });
  };

  // Filters and Loading state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isManualRefresh = false) => {
    const hasData = incomingInventory.length > 0 || returnDropInventory.length > 0 || returnPickupInventory.length > 0;
    if (!hasData) {
      setIsLoading(true);
    } else if (isManualRefresh) {
      setIsRefreshing(true);
    }
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
      console.error('Failed to load inventory data:', e);
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

  const handleViewItem = async (item: InventoryItem) => {
    setSelectedOrderDetails(item);
    setIsViewModalOpen(true);
    setModalLoading(true);
    try {
      const targetId = (item as any).orderId || item.id || (item as any).uuid;
      const fullDetails = await api.get(`/orders/${targetId}`);
      if (fullDetails && typeof fullDetails === 'object') {
        setSelectedOrderDetails((prev: any) => ({
          ...prev,
          ...fullDetails,
          sellerName: fullDetails.sellerName || fullDetails.seller?.sellerName || fullDetails.seller?.fullName || prev?.sellerName,
          sellerMobile: fullDetails.sellerMobile || fullDetails.seller?.mobileNumber || fullDetails.seller?.phoneNumber || prev?.sellerMobile,
          sellerAddress: fullDetails.sellerAddress || fullDetails.seller?.fullAddress || fullDetails.seller?.village || prev?.sellerAddress,
          sellerVillage: fullDetails.sellerVillage || fullDetails.seller?.village || prev?.sellerVillage,
          buyerName: fullDetails.buyerName || fullDetails.buyer?.buyerName || fullDetails.buyer?.fullName || prev?.buyerName,
          buyerMobile: fullDetails.buyerMobile || fullDetails.buyer?.mobileNumber || fullDetails.buyer?.phoneNumber || prev?.buyerMobile,
          buyerAddress: fullDetails.buyerAddress || fullDetails.buyer?.fullAddress || fullDetails.buyer?.village || prev?.buyerAddress,
          buyerVillage: fullDetails.buyerVillage || fullDetails.buyer?.village || prev?.buyerVillage,
          parcels: (fullDetails.parcels && fullDetails.parcels.length > 0) ? fullDetails.parcels : prev?.parcels,
          tracking: (fullDetails.tracking && fullDetails.tracking.length > 0) ? fullDetails.tracking : prev?.tracking,
        }));
      }
    } catch (e) {
      console.error("Failed to load fresh order details on view click:", e);
    } finally {
      setModalLoading(false);
    }
  };

  const getActionButtons = (row: InventoryItem) => {
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
          className="p-1.5 hover:bg-slate-100 active:bg-[#073318] active:text-white text-slate-500 hover:text-[#073318] rounded-lg transition-colors cursor-pointer border border-slate-200/60 shadow-sm flex items-center justify-center"
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
            <div className={`absolute right-0 w-44 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 z-50 p-1.5 space-y-0.5 animate-in fade-in ${openUpwards ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'} duration-150`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveActionMenu(null);
                  handleViewItem(row);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#073318]/5 hover:text-[#073318] rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-[#073318]" />
                <span>View Details</span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Define Columns for each subtab
  const incomingColumns = [
    { header: 'Order ID', accessor: 'id' as keyof InventoryItem },
    { header: 'Start Date', accessor: (row: InventoryItem) => (row.orderDate ? row.orderDate.split(' ')[0] : (row as any).created_at ? (row as any).created_at.split(' ')[0] : '-') },
    { header: 'Expected Delivery Date', accessor: (row: InventoryItem) => getExpectedDeliveryDate(row.orderDate || (row as any).created_at) },
    { header: 'Warehouse Received Date', accessor: (row: InventoryItem) => (row as any).warehouseReceivedDate ? (row as any).warehouseReceivedDate.split(' ')[0] : (row.storeDate ? row.storeDate.split(' ')[0] : '-') },
    { header: 'Product Count', accessor: 'productCount' as keyof InventoryItem },
    { header: 'Total Qty', accessor: 'totalQty' as keyof InventoryItem },
    { header: 'Total Weight (KG)', accessor: 'totalWeight' as keyof InventoryItem },
    { header: 'Status', accessor: () => <StatusBadge status="Stored" /> },
    { header: 'Action', accessor: (row: InventoryItem) => getActionButtons(row) },
  ];

  const returnDropColumns = [
    { header: 'Order ID', accessor: 'id' as keyof InventoryItem },
    { header: 'Start Date', accessor: (row: InventoryItem) => (row.orderDate ? row.orderDate.split(' ')[0] : (row as any).created_at ? (row as any).created_at.split(' ')[0] : '-') },
    { header: 'Return Received Date', accessor: (row: InventoryItem) => (row as any).warehouseReceivedDate ? (row as any).warehouseReceivedDate.split(' ')[0] : '-' },
    { header: 'Buyer Name', accessor: (row: InventoryItem) => row.buyerName || 'N/A' },
    { header: 'Product Count', accessor: 'productCount' as keyof InventoryItem },
    { header: 'Total Qty', accessor: 'totalQty' as keyof InventoryItem },
    { header: 'Total Weight (KG)', accessor: 'totalWeight' as keyof InventoryItem },
    { header: 'Status', accessor: () => <StatusBadge status="Stored" /> },
    { header: 'Action', accessor: (row: InventoryItem) => getActionButtons(row) },
  ];

  const returnPickupColumns = [
    { header: 'Order ID', accessor: 'id' as keyof InventoryItem },
    { header: 'Start Date', accessor: (row: InventoryItem) => (row.orderDate ? row.orderDate.split(' ')[0] : (row as any).created_at ? (row as any).created_at.split(' ')[0] : '-') },
    { header: 'Return Received Date', accessor: (row: InventoryItem) => (row as any).warehouseReceivedDate ? (row as any).warehouseReceivedDate.split(' ')[0] : '-' },
    { header: 'Buyer Name', accessor: (row: InventoryItem) => row.buyerName || 'N/A' },
    { header: 'Product Count', accessor: 'productCount' as keyof InventoryItem },
    { header: 'Total Qty', accessor: 'totalQty' as keyof InventoryItem },
    { header: 'Total Weight (KG)', accessor: 'totalWeight' as keyof InventoryItem },
    { header: 'Status', accessor: () => <StatusBadge status="Stored" /> },
    { header: 'Action', accessor: (row: InventoryItem) => getActionButtons(row) },
  ];

  // Helper to determine current dataset and columns
  const getCurrentTableProps = () => {
    switch (activeSubTab) {
      case 'incoming':
        return { data: incomingInventory, columns: incomingColumns };
      case 'returnDrop':
        return { data: returnDropInventory, columns: returnDropColumns };
      case 'returnPickup':
        return { data: returnPickupInventory, columns: returnPickupColumns };
      default:
        return { data: incomingInventory, columns: incomingColumns };
    }
  };

  const { data: currentData, columns: currentColumns } = getCurrentTableProps();

  const storedCount = counts?.inventory?.stored ?? incomingInventory.length;
  const transReturnCount = counts?.inventory?.transporterReturn ?? returnDropInventory.length;
  const buyerReturnCount = counts?.inventory?.buyerReturn ?? returnPickupInventory.length;

  return (
    <Layout currentPage="inventory-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Inventory Management</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">Track inventory across all warehouse staging cycles.</p>
            </div>
          </div>
        </div>

        {/* Custom Tab Switcher bar */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveSubTab('incoming')}
            className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'incoming'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Stored Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
              activeSubTab === 'incoming' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'
            }`}>
              {storedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('returnDrop')}
            className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'returnDrop'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Transporter Return Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
              activeSubTab === 'returnDrop' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'
            }`}>
              {transReturnCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('returnPickup')}
            className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'returnPickup'
                ? 'bg-[#073318] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Buyer Return Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
              activeSubTab === 'returnPickup' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'
            }`}>
              {buyerReturnCount}
            </span>
          </button>
        </div>

        {/* Global Filtered Data Table */}
        <DataTable
          columns={currentColumns}
          data={currentData}
          isRefreshing={isRefreshing || isLoading}
          onRefresh={() => loadData(true)}
        />
      </div>

      {/* --- EXACT IN-TRANSIT ORDER PROFILE DRAWER VIEW MODAL --- */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedOrderDetails(null);
        }}
        title={`Order Profile: ${selectedOrderDetails?.orderId || selectedOrderDetails?.id || ''}`}
        variant="modal"
        size="full"
        hideHeader={true}
      >
        {selectedOrderDetails && (
          <div className="space-y-6">
            {/* Top Bar Navigation & Status Journey Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-4 text-left">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedOrderDetails(null);
                  }}
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
                      {(selectedOrderDetails.mainStatus || selectedOrderDetails.status || 'STORED').replace(/[-_]/g, ' ')}
                    </span>
                    {modalLoading && (
                      <span className="text-[10px] font-bold text-[#073318] flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin text-[#073318]" />
                        Fetching live data...
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-[#073318] flex items-baseline gap-2">
                    #{selectedOrderDetails.orderId || selectedOrderDetails.id}
                  </h3>
                </div>
              </div>

              {/* Status Stepper Summary Badges */}
              {selectedOrderDetails.returnType === 'BUYER_RETURN' || [
                'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
                'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
                'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'
              ].includes(selectedOrderDetails.mainStatus || '') ? (
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">INITIATED</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold bg-[#073318] text-white">IN TRANSIT</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">RETURNED</span>
                </div>
              ) : (
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">NEW</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold bg-[#073318] text-white">IN TRANSIT</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">COMPLETED</span>
                </div>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Order Summary Box */}
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
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Product Count</p>
                      <p className="text-lg font-black text-[#073318] mt-1">{selectedOrderDetails.productCount || selectedOrderDetails.parcels?.length || selectedOrderDetails.items?.length || 1}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Qty</p>
                      <p className="text-lg font-black text-slate-800 mt-1">{selectedOrderDetails.totalQty || selectedOrderDetails.quantity || 1}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Weight</p>
                      <p className="text-lg font-black text-slate-800 mt-1">{selectedOrderDetails.totalWeight || selectedOrderDetails.weight || 2.5} KG</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Priority</p>
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
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Order Date</p>
                        <p className="text-sm font-black text-[#073318] mt-0.5">
                          {selectedOrderDetails.createdAt ? new Date(selectedOrderDetails.createdAt).toLocaleDateString() : (selectedOrderDetails.created_at ? new Date(selectedOrderDetails.created_at).toLocaleDateString() : '-')}
                        </p>
                      </div>
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                      <div className="text-left">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Delivery Expected Date</p>
                        <p className="text-sm font-black text-amber-700 mt-0.5">
                          {getExpectedDeliveryDate(selectedOrderDetails.createdAt || selectedOrderDetails.created_at || selectedOrderDetails.orderDate)}
                        </p>
                      </div>
                      <Truck className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Partner & Logistics Info Box */}
                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                  <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-3">
                    <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Partner & Logistics Info</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Seller Box */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Seller Information</p>
                      <h5 className="font-extrabold text-[#073318] text-base">
                        {selectedOrderDetails.seller?.sellerName || selectedOrderDetails.seller?.fullName || selectedOrderDetails.sellerName || 'Seller N/A'}
                      </h5>
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-650 font-semibold">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-400">Contact:</span>
                          <span className="font-bold text-slate-800">
                            {selectedOrderDetails.seller?.mobileNumber || selectedOrderDetails.seller?.phoneNumber || selectedOrderDetails.sellerMobile || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-slate-650 font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-400 shrink-0">Address:</span>
                          <span className="leading-tight font-medium text-slate-700">
                            {formatFullAddress(
                              selectedOrderDetails.seller,
                              selectedOrderDetails.sellerAddress,
                              selectedOrderDetails.sellerVillage,
                              selectedOrderDetails.sellerTaluka,
                              selectedOrderDetails.sellerDistrict,
                              selectedOrderDetails.sellerState,
                              selectedOrderDetails.sellerPincode
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Buyer Box */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Buyer Information</p>
                      <h5 className="font-extrabold text-[#073318] text-base">
                        {selectedOrderDetails.buyer?.buyerName || selectedOrderDetails.buyer?.fullName || selectedOrderDetails.buyerName || 'Buyer N/A'}
                      </h5>
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-650 font-semibold">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-400">Contact:</span>
                          <span className="font-bold text-slate-800">
                            {selectedOrderDetails.buyer?.mobileNumber || selectedOrderDetails.buyer?.phoneNumber || selectedOrderDetails.buyerMobile || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-slate-650 font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-400 shrink-0">Address:</span>
                          <span className="leading-tight font-medium text-slate-700">
                            {formatFullAddress(
                              selectedOrderDetails.buyer,
                              selectedOrderDetails.buyerAddress,
                              selectedOrderDetails.buyerVillage,
                              selectedOrderDetails.buyerTaluka,
                              selectedOrderDetails.buyerDistrict,
                              selectedOrderDetails.buyerState,
                              selectedOrderDetails.buyerPincode
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SHG & Transporter Details row */}
                  {(selectedOrderDetails.pickupShgDetails || selectedOrderDetails.pickupTransporterDetails || selectedOrderDetails.dropShgDetails || selectedOrderDetails.dropTransporterDetails) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#073318]/10 text-xs">
                      {selectedOrderDetails.pickupShgDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pickup SHG Center</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrderDetails.pickupShgDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrderDetails.pickupShgDetails.mobile || ''}</p>
                        </div>
                      )}
                      {selectedOrderDetails.pickupTransporterDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pickup Transporter</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrderDetails.pickupTransporterDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrderDetails.pickupTransporterDetails.mobile || ''} {selectedOrderDetails.pickupTransporterDetails.vehicle ? `(${selectedOrderDetails.pickupTransporterDetails.vehicle})` : ''}</p>
                        </div>
                      )}
                      {selectedOrderDetails.dropShgDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Drop SHG Center</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrderDetails.dropShgDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrderDetails.dropShgDetails.mobile || ''}</p>
                        </div>
                      )}
                      {selectedOrderDetails.dropTransporterDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Drop Transporter</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrderDetails.dropTransporterDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrderDetails.dropTransporterDetails.mobile || ''} {selectedOrderDetails.dropTransporterDetails.vehicle ? `(${selectedOrderDetails.dropTransporterDetails.vehicle})` : ''}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Parcels & Tracking Audit History */}
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
                        onClick={() => handleDownloadAllQr(selectedOrderDetails.parcels || [])}
                        className="text-[10px] bg-[#073318] hover:bg-[#073318]/90 text-white font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
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
                          <p className="text-xs font-semibold text-slate-400 italic">Standard Agri Parcel Recorded.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {displayParcels.map((parcel: any, idx: number) => (
                          <div key={parcel.parcelId || idx} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl transition-all">
                            {parcel.qrImage ? (
                              <img
                                src={parcel.qrImage}
                                alt={`Parcel ${parcel.parcelNumber}`}
                                onClick={() => {
                                  setSelectedParcel(parcel);
                                  setIsParcelPreviewOpen(true);
                                }}
                                className="h-12 w-12 rounded-lg bg-white p-0.5 border border-slate-200 cursor-pointer hover:scale-105 transition-all shadow-sm shrink-0"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <QrCode className="h-6 w-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{parcel.productName || 'Agri Goods Item'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  Parcel {parcel.parcelNumber || (idx + 1)}/{parcel.totalParcels || displayParcels.length}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">|</span>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  Qty: {parcel.quantity || 1} ({parcel.weight || '2.5 kg'})
                                </span>
                              </div>
                              <span className="inline-block text-[9px] font-black px-1.5 py-0.5 mt-1 rounded uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                                {(parcel.parcelStatus || selectedOrderDetails.mainStatus || 'STORED').replace(/[-_]/g, ' ')}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 text-right">
                              {parcel.qrImage && (
                                <a
                                  href={parcel.qrImage}
                                  download={`QR-${parcel.productName || 'Parcel'}-${parcel.parcelNumber || idx + 1}.png`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#073318] hover:underline font-bold"
                                >
                                  Download
                                </a>
                              )}
                              {parcel.qrImage && (
                                <button
                                  onClick={() => {
                                    setSelectedParcel(parcel);
                                    setIsParcelPreviewOpen(true);
                                  }}
                                  className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                                >
                                  Preview
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Tracking Audit History Box (Exact Dark Green Box from In-Transit view) */}
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
                                <span className="text-[10px] text-white/50 font-bold">•</span>
                                <span className="text-[10px] font-bold text-white/80">{timeObj.date}</span>
                              </div>

                              <p className="text-xs font-black text-white mt-1 leading-snug tracking-wide">
                                {(t.remarks || t.status || '').replace(/[-_]/g, ' ')}
                              </p>

                              {t.location && (
                                <p className="text-[10px] font-semibold text-[#B2D534]/90 flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span>{t.location}</span>
                                </p>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="relative group">
                          <span className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318] shadow-sm" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-[#B2D534]">
                              {splitIndianDateTime(selectedOrderDetails.createdAt || selectedOrderDetails.created_at).time}
                            </span>
                            <span className="text-[10px] text-white/50 font-bold">•</span>
                            <span className="text-[10px] font-bold text-white/80">
                              {splitIndianDateTime(selectedOrderDetails.createdAt || selectedOrderDetails.created_at).date}
                            </span>
                          </div>
                          <p className="text-xs font-black text-white mt-1 leading-snug tracking-wide">
                            Stored in Hub Inventory
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Parcel QR Code Preview Modal */}
      {isParcelPreviewOpen && selectedParcel && (
        <Modal
          isOpen={isParcelPreviewOpen}
          onClose={() => setIsParcelPreviewOpen(false)}
          title={`Parcel QR Preview - ${selectedParcel.productName || 'Agri Item'}`}
          size="md"
        >
          <div className="space-y-4 text-center p-4">
            {selectedParcel.qrImage && (
              <img
                src={selectedParcel.qrImage}
                alt="Parcel QR Code"
                className="w-56 h-56 mx-auto rounded-2xl border-2 border-[#073318]/20 p-2 bg-white shadow-md"
              />
            )}
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-base">{selectedParcel.productName || 'Agri Goods Product'}</h4>
              <p className="text-xs text-slate-500 font-semibold">
                Parcel Number: {selectedParcel.parcelNumber || 1} | Quantity: {selectedParcel.quantity || 1} | Weight: {selectedParcel.weight || '2.5'} kg
              </p>
            </div>
            {selectedParcel.qrCodeValue && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600 break-all select-all flex items-center justify-between gap-2">
                <span className="line-clamp-2 select-all">{selectedParcel.qrCodeValue}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedParcel.qrCodeValue);
                    alert("Copied scanner JSON to clipboard!");
                  }}
                  className="p-1.5 hover:bg-slate-200 text-[#073318] rounded-md border border-slate-300 bg-white shrink-0 cursor-pointer shadow-sm active:scale-90 transition-all"
                  title="Copy QR Value"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsParcelPreviewOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};
