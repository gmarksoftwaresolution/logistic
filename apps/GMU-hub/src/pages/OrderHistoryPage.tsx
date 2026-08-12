import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Tabs } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Eye,
  CheckCircle2,
  Package,
  RotateCcw,
  Search,
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
  ChevronRight
} from 'lucide-react';
import { api } from '../utils/api';

interface OrderHistoryItem {
  id: string;
  orderId?: string;
  barcode?: string;
  mainStatus: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string;
  returnType?: string;
  seller?: {
    fullName?: string;
    phoneNumber?: string;
    village?: string;
    fullAddress?: string;
    pincode?: string;
  };
  buyer?: {
    fullName?: string;
    phoneNumber?: string;
    village?: string;
    fullAddress?: string;
    pincode?: string;
  };
  parcels?: any[];
  items?: any[];
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

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/history');
      if (res) {
        setData({
          metrics: {
            totalOrders: res.metrics?.totalOrders || 0,
            completedOrders: res.metrics?.completedOrders || 0,
            returnOrders: res.metrics?.returnOrders || 0,
          },
          completedOrders: res.completedOrders || [],
          returnOrders: res.returnOrders || [],
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

  const currentList = activeTab === 'completed' ? data.completedOrders : data.returnOrders;

  const filteredOrders = currentList.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const orderId = (o.orderId || o.id || '').toLowerCase();
    const barcode = (o.barcode || '').toLowerCase();
    const seller = (o.seller?.fullName || o.seller?.village || '').toLowerCase();
    const buyer = (o.buyer?.fullName || o.buyer?.village || '').toLowerCase();
    return orderId.includes(q) || barcode.includes(q) || seller.includes(q) || buyer.includes(q);
  });

  const columns = [
    {
      header: 'Order Details',
      accessor: (row: OrderHistoryItem) => (
        <div className="flex flex-col gap-1">
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
      accessor: (row: OrderHistoryItem) => (
        <div className="flex flex-col text-xs gap-0.5">
          <span className="font-medium text-slate-800 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            {row.seller?.fullName || 'Seller N/A'}
          </span>
          <span className="text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            {row.seller?.village || 'Village N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Buyer',
      accessor: (row: OrderHistoryItem) => (
        <div className="flex flex-col text-xs gap-0.5">
          <span className="font-medium text-slate-800 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            {row.buyer?.fullName || 'Buyer N/A'}
          </span>
          <span className="text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            {row.buyer?.village || 'Village N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Items & Weight',
      accessor: (row: OrderHistoryItem) => {
        const parcelsCount = row.parcels?.length || row.items?.length || 1;
        return (
          <div className="flex flex-col text-xs gap-0.5">
            <span className="font-medium text-slate-800 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              {parcelsCount} {parcelsCount > 1 ? 'Parcels' : 'Parcel'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Date',
      accessor: (row: OrderHistoryItem) => (
        <div className="flex flex-col text-xs text-slate-600 gap-0.5">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: OrderHistoryItem) => (
        <StatusBadge status={row.mainStatus || row.status || 'COMPLETED'} />
      ),
    },
    {
      header: 'Action',
      accessor: (row: OrderHistoryItem) => (
        <button
          onClick={() => {
            setSelectedOrder(row);
            setIsModalOpen(true);
          }}
          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#073318] rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-1.5 px-3 font-semibold text-xs transition-colors cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </button>
      ),
    },
  ];

  return (
    <Layout currentPage="order-history" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Modern Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight flex items-center gap-2.5">
                <Clock className="w-7 h-7 text-[#073318]" />
                Order History
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Complete historical record of all completed orders and returns fetched directly from live database.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer self-start lg:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#073318] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Top Summary Metrics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Orders */}
          <div className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden border-2 border-[#073318]/30 hover:border-[#073318] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#073318]">Total Orders</p>
                <p className="text-3xl font-extrabold text-[#073318] mt-1.5">{data.metrics.totalOrders}</p>
                <p className="text-xs text-slate-500 font-semibold mt-2">All time registered orders</p>
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

            <div className="relative w-full lg:w-80">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search ID, Barcode, Seller, Buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#073318]/50"
              />
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={filteredOrders}
            isRefreshing={loading}
            onRefresh={fetchHistory}
            hideDateAndRefresh={true}
          />
        </div>
      </div>

      {/* Order Detail View Modal */}
      {isModalOpen && selectedOrder && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          title={`Order History Details - #${selectedOrder.orderId || selectedOrder.id}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Top Bar Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs text-slate-500">Barcode / Tracking Code</span>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  {selectedOrder.barcode || `QR-2026-${selectedOrder.orderId || selectedOrder.id}`}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Order Date</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : '-'}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Current Status</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedOrder.mainStatus || selectedOrder.status || 'COMPLETED'} />
                </div>
              </div>
            </div>

            {/* Seller & Buyer Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seller Details Card */}
              <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-semibold border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Seller Details
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-slate-800">{selectedOrder.seller?.fullName || 'N/A'}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {selectedOrder.seller?.phoneNumber || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 mt-0.5" />
                    {selectedOrder.seller?.fullAddress || selectedOrder.seller?.village || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Buyer Details Card */}
              <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-semibold border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Buyer Details
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-slate-800">{selectedOrder.buyer?.fullName || 'N/A'}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {selectedOrder.buyer?.phoneNumber || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 mt-0.5" />
                    {selectedOrder.buyer?.fullAddress || selectedOrder.buyer?.village || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Parcels / Products Breakdown
              </div>
              {selectedOrder.parcels && selectedOrder.parcels.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {selectedOrder.parcels.map((p: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-800">{p.productName || p.name || 'Agri Goods Product'}</span>
                        <span className="text-xs text-slate-400">({p.parcelId || `PCL-${idx + 1}`})</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {p.weight || 2.5} kg
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic py-2">No parcel breakdown recorded.</p>
              )}
            </div>

            {/* Transporter Info */}
            {selectedOrder.transporter && (
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-lg text-blue-700">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Assigned Transporter</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedOrder.transporter.fullName || 'Transporter'}</p>
                    <p className="text-xs text-slate-500">{selectedOrder.transporter.phoneNumber || ''}</p>
                  </div>
                </div>
                {selectedOrder.transporter.transporterDetail?.vehicleNumber && (
                  <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    Vehicle: {selectedOrder.transporter.transporterDetail.vehicleNumber}
                  </span>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </Layout>
  );
};
