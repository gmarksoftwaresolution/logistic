import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Eye,
  CheckCircle2,
  Package,
  RotateCcw,
  RefreshCw,
  Calendar,
  User,
  Phone,
  MapPin,
  Truck,
  QrCode,
  Layers,
  FileText,
  Clock,
  X,
  Copy
} from 'lucide-react';
import { api } from '../utils/api';

interface OrderHistoryItem {
  id: string;
  orderId?: string;
  barcode?: string;
  mainStatus: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  orderDate?: string;
  updatedAt?: string;
  deliveredAt?: string;
  returnType?: string;
  priority?: string;
  productCount?: number;
  totalQty?: number;
  quantity?: number;
  totalWeight?: number | string;
  weight?: number | string;
  sellerName?: string;
  sellerMobile?: string;
  sellerVillage?: string;
  sellerTaluka?: string;
  sellerDistrict?: string;
  sellerState?: string;
  sellerPincode?: string;
  sellerAddress?: string;
  buyerName?: string;
  buyerMobile?: string;
  buyerVillage?: string;
  buyerTaluka?: string;
  buyerDistrict?: string;
  buyerState?: string;
  buyerPincode?: string;
  buyerAddress?: string;
  seller?: {
    fullName?: string;
    phoneNumber?: string;
    mobileNumber?: string;
    sellerName?: string;
    addressLine1?: string;
    addressLine2?: string;
    village?: string;
    taluka?: string;
    district?: string;
    state?: string;
    pincode?: string;
    fullAddress?: string;
  };
  buyer?: {
    fullName?: string;
    phoneNumber?: string;
    mobileNumber?: string;
    buyerName?: string;
    addressLine1?: string;
    addressLine2?: string;
    village?: string;
    taluka?: string;
    district?: string;
    state?: string;
    pincode?: string;
    fullAddress?: string;
  };
  pickupShgDetails?: {
    name?: string;
    mobile?: string;
    address?: string;
  };
  pickupTransporterDetails?: {
    name?: string;
    mobile?: string;
    vehicle?: string;
  };
  dropShgDetails?: {
    name?: string;
    mobile?: string;
    address?: string;
  };
  dropTransporterDetails?: {
    name?: string;
    mobile?: string;
    vehicle?: string;
  };
  parcels?: any[];
  items?: any[];
  tracking?: any[];
  transporter?: {
    fullName?: string;
    phoneNumber?: string;
    transporterDetail?: {
      vehicleNumber?: string;
      transporterCode?: string;
    };
  };
}

interface OrderHistoryResponse {
  metrics: {
    totalOrders: number;
    completedOrders: number;
    returnOrders: number;
  };
  completedOrders: OrderHistoryItem[];
  returnOrders: OrderHistoryItem[];
}

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

// Robust helper to format full address from all relation and raw fields
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

export const OrderHistoryPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'completed' | 'returns'>('completed');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<OrderHistoryResponse>({
    metrics: { totalOrders: 0, completedOrders: 0, returnOrders: 0 },
    completedOrders: [],
    returnOrders: [],
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Parcel Preview Modal State
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [isParcelPreviewOpen, setIsParcelPreviewOpen] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/history');
      if (res) {
        const rawCompleted = res.completedOrders || [];
        const returns = res.returnOrders || [];
        const completed = rawCompleted.filter((o: any) => {
          const ms = (o.mainStatus || o.status || '').toUpperCase();
          const ds = (o.dropShgStatus || '').toUpperCase();
          return ['DELIVERED', 'COMPLETED', 'PARCEL_AT_BUYER', 'PARCEL_AT_DROP_SHG', 'BUYER_DELIVERED', 'RETURN_COMPLETED'].includes(ms) ||
                 ds === 'COMPLETED' || ds === 'DROPPED';
        });
        setData({
          metrics: {
            totalOrders: completed.length + returns.length,
            completedOrders: completed.length,
            returnOrders: returns.length,
          },
          completedOrders: completed,
          returnOrders: returns,
        });
      }
    } catch (err) {
      console.error('Failed to fetch order history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleViewOrder = async (row: OrderHistoryItem) => {
    setSelectedOrder(row);
    setIsModalOpen(true);
    setModalLoading(true);

    try {
      const targetId = row.orderId || row.id;
      const fullDetails = await api.get(`/orders/${targetId}`);
      if (fullDetails && typeof fullDetails === 'object') {
        setSelectedOrder((prev) => ({
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
    } catch (err) {
      console.warn('Failed to fetch complete order details by ID:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const currentList = activeTab === 'completed' ? data.completedOrders : data.returnOrders;

  const filteredOrders = currentList.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const orderId = (o.orderId || o.id || '').toLowerCase();
    const barcode = (o.barcode || '').toLowerCase();
    const seller = (o.seller?.fullName || o.seller?.sellerName || o.sellerName || o.seller?.village || o.sellerVillage || '').toLowerCase();
    const buyer = (o.buyer?.fullName || o.buyer?.buyerName || o.buyerName || o.buyer?.village || o.buyerVillage || '').toLowerCase();
    return orderId.includes(q) || barcode.includes(q) || seller.includes(q) || buyer.includes(q);
  });

  const handleDownloadAllQr = (parcels: any[]) => {
    if (!parcels || parcels.length === 0) return;
    parcels.forEach((p, idx) => {
      if (p.qrImage) {
        const link = document.createElement('a');
        link.href = p.qrImage;
        link.download = `QR-${p.productName || 'Parcel'}-${p.parcelNumber || idx + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const columns = [
    {
      header: 'Order Details',
      accessor: (row: OrderHistoryItem) => (
        <div className="flex flex-col gap-1 text-left">
          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
            #{row.orderId || row.id}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <QrCode className="w-3 h-3 text-slate-400" />
            {row.barcode || `QR-2026-${row.orderId || row.id}`}
          </span>
        </div>
      ),
    },
    {
      header: 'Seller',
      accessor: (row: OrderHistoryItem) => {
        const name = row.seller?.sellerName || row.seller?.fullName || row.sellerName || 'Seller N/A';
        const village = row.seller?.village || row.sellerVillage || 'Village N/A';
        return (
          <div className="flex flex-col text-xs gap-0.5 text-left">
            <span className="font-medium text-slate-800 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              {name}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              {village}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Buyer',
      accessor: (row: OrderHistoryItem) => {
        const name = row.buyer?.buyerName || row.buyer?.fullName || row.buyerName || 'Buyer N/A';
        const village = row.buyer?.village || row.buyerVillage || 'Village N/A';
        return (
          <div className="flex flex-col text-xs gap-0.5 text-left">
            <span className="font-medium text-slate-800 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              {name}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              {village}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Items & Weight',
      accessor: (row: OrderHistoryItem) => {
        const parcelsCount = row.parcels?.length || row.items?.length || 1;
        const weightVal = row.totalWeight || row.weight || 2.5;
        return (
          <div className="flex flex-col text-xs gap-0.5 text-left">
            <span className="font-medium text-slate-800 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              {parcelsCount} {parcelsCount > 1 ? 'Parcels' : 'Parcel'} ({weightVal} kg)
            </span>
          </div>
        );
      },
    },
    {
      header: 'Date',
      accessor: (row: OrderHistoryItem) => {
        const dateStr = row.createdAt || row.created_at || row.orderDate;
        return (
          <div className="flex flex-col text-xs text-slate-600 gap-0.5 text-left">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {dateStr ? new Date(dateStr).toLocaleDateString() : '-'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row: OrderHistoryItem) => (
        <div className="text-left">
          <StatusBadge status={row.mainStatus || row.status || 'COMPLETED'} />
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: (row: OrderHistoryItem) => (
        <button
          onClick={() => handleViewOrder(row)}
          className="p-1.5 hover:bg-[#073318] text-[#073318] hover:text-white rounded-xl border border-[#073318]/30 shadow-sm flex items-center justify-center gap-1.5 px-3 font-bold text-xs transition-all cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5 text-[#073318] group-hover:text-white" />
          <span>View</span>
        </button>
      ),
    },
  ];

  return (
    <Layout currentPage="order-history" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-[#073318]/80 to-[#073318] p-3.5 rounded-2xl border border-[#073318]/40 shadow-sm">
                <Clock className="h-7 w-7 text-[#B2D534]" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Order History</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Complete historical record of all completed orders and returns fetched directly from live database.
                </p>
              </div>
            </div>
            <button
              onClick={fetchHistory}
              className="px-4 py-2 bg-[#073318] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-[#052812] transition-colors shadow-sm cursor-pointer self-start lg:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Top Summary Metrics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Orders (Completed + Returns Count) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-2 border-[#073318]/30 hover:border-[#073318] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#073318]">Total Orders</p>
                <p className="text-3xl font-extrabold text-[#073318] mt-1.5">{data.metrics.totalOrders}</p>
                <p className="text-xs text-slate-500 font-semibold mt-2">Total Completed & Return Orders</p>
              </div>
              <div className="bg-[#073318]/10 p-3.5 rounded-2xl border border-[#073318]/20">
                <Package className="w-7 h-7 text-[#073318]" />
              </div>
            </div>
          </div>

          {/* Card 2: Completed Orders */}
          <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-2 border-[#073318]/30 hover:border-[#073318] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#073318]">Completed Orders</p>
                <p className="text-3xl font-extrabold text-[#073318] mt-1.5">{data.metrics.completedOrders}</p>
                <p className="text-xs text-slate-500 font-semibold mt-2">Delivered & verified orders</p>
              </div>
              <div className="bg-[#073318]/10 p-3.5 rounded-2xl border border-[#073318]/20">
                <CheckCircle2 className="w-7 h-7 text-[#073318]" />
              </div>
            </div>
          </div>

          {/* Card 3: Return Orders */}
          <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-2 border-[#073318]/30 hover:border-[#073318] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#073318]">Return Orders</p>
                <p className="text-3xl font-extrabold text-[#073318] mt-1.5">{data.metrics.returnOrders}</p>
                <p className="text-xs text-slate-500 font-semibold mt-2">Transporter & Buyer returns</p>
              </div>
              <div className="bg-[#073318]/10 p-3.5 rounded-2xl border border-[#073318]/20">
                <RotateCcw className="w-7 h-7 text-[#073318]" />
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs Switcher & Search Filter */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex bg-slate-100 border border-slate-200 rounded-2xl p-1 max-w-md">
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'completed'
                    ? 'bg-[#073318] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Completed Orders</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  activeTab === 'completed' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'
                }`}>
                  {data.completedOrders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('returns')}
                className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'returns'
                    ? 'bg-[#073318] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Return Orders</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  activeTab === 'returns' ? 'bg-[#B2D534] text-[#073318]' : 'bg-slate-200 text-slate-700'
                }`}>
                  {data.returnOrders.length}
                </span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={currentList}
            isRefreshing={loading}
            onRefresh={fetchHistory}
            hideDateAndRefresh={true}
            searchPlaceholder="Search ID, Barcode, Seller, Buyer, Village..."
          />
        </div>
      </div>

      {/* --- EXACT IN-TRANSIT ORDER PROFILE DRAWER VIEW MODAL --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        title={`Order Profile: ${selectedOrder?.orderId || selectedOrder?.id || ''}`}
        variant="modal"
        size="full"
        hideHeader={true}
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Top Bar Navigation & Status Journey Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-4 text-left">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedOrder(null);
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
                      {(selectedOrder.mainStatus || selectedOrder.status || 'COMPLETED').replace(/[-_]/g, ' ')}
                    </span>
                    {modalLoading && (
                      <span className="text-[10px] font-bold text-[#073318] flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin text-[#073318]" />
                        Fetching live data...
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-[#073318] flex items-baseline gap-2">
                    #{selectedOrder.orderId || selectedOrder.id}
                  </h3>
                </div>
              </div>

              {/* Status Stepper Summary Badges */}
              {selectedOrder.returnType === 'BUYER_RETURN' || [
                'RETURN_SHG_PENDING', 'RETURN_SHG_ACCEPTED', 'RETURN_PICKED_BY_SHG', 'RETURN_PARCEL_AT_SHG',
                'RETURN_TRANSPORTER_PENDING', 'RETURN_TRANSPORTER_REQUESTED', 'RETURN_TRANSPORTER_ACCEPTED',
                'RETURN_IN_TRANSIT_TO_HUB', 'BUYER_RETURN_COMPLETED', 'INVENTORY_BUYER_RETURN', 'RETURN_COMPLETED'
              ].includes(selectedOrder.mainStatus || '') ? (
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">INITIATED</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">IN TRANSIT</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold bg-[#073318] text-white">RETURNED</span>
                </div>
              ) : (
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">NEW</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold text-slate-500">IN TRANSIT</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className="px-4 py-2 rounded-xl font-bold bg-[#073318] text-white">COMPLETED</span>
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
                      <p className="text-lg font-black text-[#073318] mt-1">{selectedOrder.productCount || selectedOrder.parcels?.length || selectedOrder.items?.length || 1}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Qty</p>
                      <p className="text-lg font-black text-slate-800 mt-1">{selectedOrder.totalQty || selectedOrder.quantity || 1}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Weight</p>
                      <p className="text-lg font-black text-slate-800 mt-1">{selectedOrder.totalWeight || selectedOrder.weight || 2.5} KG</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Priority</p>
                      <div className="mt-1">
                        <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                          {selectedOrder.priority || 'HIGH'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                      <div className="text-left">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Order Date</p>
                        <p className="text-sm font-black text-[#073318] mt-0.5">
                          {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : (selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : '-')}
                        </p>
                      </div>
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                      <div className="text-left">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Delivery Expected Date</p>
                        <p className="text-sm font-black text-amber-700 mt-0.5">
                          {getExpectedDeliveryDate(selectedOrder.createdAt || selectedOrder.created_at || selectedOrder.orderDate)}
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
                        {selectedOrder.seller?.sellerName || selectedOrder.seller?.fullName || selectedOrder.sellerName || 'Seller N/A'}
                      </h5>
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-650 font-semibold">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-400">Contact:</span>
                          <span className="font-bold text-slate-800">
                            {selectedOrder.seller?.mobileNumber || selectedOrder.seller?.phoneNumber || selectedOrder.sellerMobile || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-slate-650 font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-400 shrink-0">Address:</span>
                          <span className="leading-tight font-medium text-slate-700">
                            {formatFullAddress(
                              selectedOrder.seller,
                              selectedOrder.sellerAddress,
                              selectedOrder.sellerVillage,
                              selectedOrder.sellerTaluka,
                              selectedOrder.sellerDistrict,
                              selectedOrder.sellerState,
                              selectedOrder.sellerPincode
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Buyer Box */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Buyer Information</p>
                      <h5 className="font-extrabold text-[#073318] text-base">
                        {selectedOrder.buyer?.buyerName || selectedOrder.buyer?.fullName || selectedOrder.buyerName || 'Buyer N/A'}
                      </h5>
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-650 font-semibold">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-400">Contact:</span>
                          <span className="font-bold text-slate-800">
                            {selectedOrder.buyer?.mobileNumber || selectedOrder.buyer?.phoneNumber || selectedOrder.buyerMobile || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-slate-650 font-semibold">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-400 shrink-0">Address:</span>
                          <span className="leading-tight font-medium text-slate-700">
                            {formatFullAddress(
                              selectedOrder.buyer,
                              selectedOrder.buyerAddress,
                              selectedOrder.buyerVillage,
                              selectedOrder.buyerTaluka,
                              selectedOrder.buyerDistrict,
                              selectedOrder.buyerState,
                              selectedOrder.buyerPincode
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SHG & Transporter Details row */}
                  {(selectedOrder.pickupShgDetails || selectedOrder.pickupTransporterDetails || selectedOrder.dropShgDetails || selectedOrder.dropTransporterDetails) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#073318]/10 text-xs">
                      {selectedOrder.pickupShgDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pickup SHG Center</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrder.pickupShgDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrder.pickupShgDetails.mobile || ''}</p>
                        </div>
                      )}
                      {selectedOrder.pickupTransporterDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pickup Transporter</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrder.pickupTransporterDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrder.pickupTransporterDetails.mobile || ''} {selectedOrder.pickupTransporterDetails.vehicle ? `(${selectedOrder.pickupTransporterDetails.vehicle})` : ''}</p>
                        </div>
                      )}
                      {selectedOrder.dropShgDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Drop SHG Center</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrder.dropShgDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrder.dropShgDetails.mobile || ''}</p>
                        </div>
                      )}
                      {selectedOrder.dropTransporterDetails?.name && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Drop Transporter</p>
                          <p className="font-bold text-[#073318] mt-0.5">{selectedOrder.dropTransporterDetails.name}</p>
                          <p className="text-slate-500 text-[10px]">{selectedOrder.dropTransporterDetails.mobile || ''} {selectedOrder.dropTransporterDetails.vehicle ? `(${selectedOrder.dropTransporterDetails.vehicle})` : ''}</p>
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
                    {selectedOrder.parcels && selectedOrder.parcels.length > 0 && (
                      <button
                        onClick={() => handleDownloadAllQr(selectedOrder.parcels || [])}
                        className="text-[10px] bg-[#073318] hover:bg-[#073318]/90 text-white font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        Download All
                      </button>
                    )}
                  </div>

                  {(() => {
                    const rawParcels = selectedOrder?.parcels || [];
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
                                {(parcel.parcelStatus || selectedOrder.mainStatus || 'COMPLETED').replace(/[-_]/g, ' ')}
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
                      {selectedOrder.tracking && selectedOrder.tracking.length > 0 ? (
                        selectedOrder.tracking.map((t: any, idx: number) => {
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
                              {splitIndianDateTime(selectedOrder.createdAt || selectedOrder.created_at).time}
                            </span>
                            <span className="text-[10px] text-white/50 font-bold">•</span>
                            <span className="text-[10px] font-bold text-white/80">
                              {splitIndianDateTime(selectedOrder.createdAt || selectedOrder.created_at).date}
                            </span>
                          </div>
                          <p className="text-xs font-black text-white mt-1 leading-snug tracking-wide">
                            Order Completed & Verified Successfully
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
