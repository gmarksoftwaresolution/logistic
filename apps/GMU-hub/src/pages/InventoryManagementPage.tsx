import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Tabs } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { InventoryItem } from '../context/AppContext';
import { Eye, Layers, Truck, X, FileText, MoreVertical, Phone, MapPin, Calendar, Clock, Package, Barcode, QrCode } from 'lucide-react';

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
  } = useAppContext();

  // Sub-tabs: Incoming Inventory | Return Pickup Inventory | Return Drop Inventory
  const [activeSubTab, setActiveSubTab] = useState('incoming');

  // Multi-select state
  const [selectedIncomingItemIds, setSelectedIncomingItemIds] = useState<string[]>([]);
  const [selectedReturnDropItemIds, setSelectedReturnDropItemIds] = useState<string[]>([]);

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  // QR Scan Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

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

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
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
    { header: 'Barcode Number', accessor: 'barcode' as keyof InventoryItem },
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
    { header: 'Barcode Number', accessor: 'barcode' as keyof InventoryItem },
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
    { header: 'Barcode Number', accessor: 'barcode' as keyof InventoryItem },
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
            statusFilterOptions={['Stored', 'Parcel At Hub', 'Barcode Generated', 'Drop Assigned', 'Dispatched']}
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
            statusFilterField="status"
            statusFilterOptions={['Completed']}
            selectedStatus={statusFilter}
            onStatusChange={setStatusFilter}
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
            statusFilterOptions={['On Hold', 'Parcel At Hub', 'Barcode Generated', 'Drop Assigned', 'Dispatched']}
            selectedStatus={statusFilter}
            onStatusChange={setStatusFilter}
            selectedDate={dateFilter}
            onDateChange={setDateFilter}
            onRowDoubleClick={handleViewItem}
            onRefresh={loadData}
          />
        )}

        {/* --- VIEW MODAL --- */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Inventory Item Detail: ${selectedItem?.id || ''}`}
          variant="modal"
          size="full"
          hideHeader={true}
        >
          {selectedItem && (
            <div className="space-y-6">
              {/* Top Header Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                {/* Left Side: Close, Badges, Title */}
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-sm"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-[#073318] border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Inventory Protocol
                      </span>
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {selectedItem.status.replace(/[-_]/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-[#073318] flex items-baseline gap-2">
                      {selectedItem.id}
                    </h3>
                  </div>
                </div>

                {/* Right Side: Status Stepper */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className={`px-4 py-2 rounded-xl font-bold ${selectedItem.status?.toLowerCase() !== 'dispatch' ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>STORED</span>
                  {activeSubTab !== 'returnPickup' && (
                    <>
                      <span className="text-slate-300 px-1 font-bold">➔</span>
                      <span className={`px-4 py-2 rounded-xl font-bold ${selectedItem.status?.toLowerCase() === 'dispatch' ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>DISPATCHED</span>
                    </>
                  )}
                </div>
              </div>

              {/* Main Grid: Left Order Summary & Right Order History */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Section (Summary) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Section 1: Inventory Summary */}
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center justify-between border-b border-[#073318]/10 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Inventory Summary</span>
                      </div>
                      <span className="bg-[#073318] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Stored Stock
                      </span>
                    </div>

                    {/* Metric Indicators Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Product Count</p>
                        <p className="text-lg font-black text-[#073318] mt-1">{selectedItem.productCount || 2}</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Total Qty</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{selectedItem.totalQty || 100} units</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Total Weight</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{selectedItem.totalWeight || 200} KG</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Priority</p>
                        <span className="inline-block mt-2 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Medium
                        </span>
                      </div>
                    </div>

                    {/* Logistics Dates Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                        <div className="text-left">
                          <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Order Date (Start Date)</p>
                          <p className="text-sm font-black text-[#073318] mt-0.5">
                            {selectedItem.orderDate || '-'}
                          </p>
                        </div>
                        <Calendar className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                        <div className="text-left">
                          <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Delivery Expected Date</p>
                          <p className="text-sm font-black text-amber-700 mt-0.5">
                            {getExpectedDeliveryDate(selectedItem.orderDate)}
                          </p>
                        </div>
                        <Truck className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Partner Information */}
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-3">
                      <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Partner & Logistics Information</span>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Seller Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Seller Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedItem.sellerName || 'N/A'}</h5>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: SEL-3001</p>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Contact:</span>
                            <span>{selectedItem.sellerName === 'Anita Farms' || selectedItem.sellerName === 'Anita Millet Farms' ? '9876543205' : '9876543201'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">
                              {selectedItem.sellerName === 'Anita Farms' || selectedItem.sellerName === 'Anita Millet Farms' ? 'Plot 5, Indapur Chowk, Indapur' : 'Gat No. 12, Junnar Village, Junnar'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Buyer Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Buyer Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedItem.buyerName || 'N/A'}</h5>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: BUY-9001</p>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Contact:</span>
                            <span>{selectedItem.buyerMobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">
                              {selectedItem.buyerAddress || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SHG Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">SHG Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedItem.shgName || 'N/A'}</h5>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Contact:</span>
                            <span>{selectedItem.shgMobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">{selectedItem.shgAddress || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Transporter Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Transporter Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedItem.transporterName || 'N/A'}</h5>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Contact:</span>
                            <span>{selectedItem.transporterMobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">{selectedItem.transporterAddress || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section (Barcode & Logs) */}
                <div className="space-y-6">
                  {/* Barcode Card */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-4">
                    <h4 className="text-sm font-extrabold text-[#073318] tracking-widest uppercase flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-[#073318]" />
                      Barcode
                    </h4>
                    {selectedItem.barcode ? (
                      <div className="space-y-3 flex flex-col items-center">
                        {/* Simulated barcode */}
                        <div className="flex items-center gap-[1.5px] h-10 w-full bg-slate-50 border border-slate-100 p-2 rounded-xl justify-center">
                          {Array.from({ length: 40 }).map((_, i) => {
                            const width = (i % 3 === 0) ? 'w-[3px]' : (i % 5 === 0) ? 'w-[1px]' : 'w-[2px]';
                            const bg = (i % 7 === 0) ? 'bg-transparent' : 'bg-slate-900';
                            return <div key={i} className={`h-full ${width} ${bg}`} />;
                          })}
                        </div>
                        <p className="text-xs font-mono font-bold tracking-widest text-slate-700">{selectedItem.barcode}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                        <span className="text-sm font-bold text-slate-400">N/A</span>
                      </div>
                    )}
                  </div>

                  {/* Warehouse Logs */}
                  <div className="bg-[#073318] rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[300px]">
                    {/* Glow effect */}
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#B2D534]/5 blur-3xl pointer-events-none" />

                    <div className="space-y-6 z-10">
                      <h4 className="text-sm font-extrabold text-[#B2D534] tracking-widest uppercase flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Warehouse Logs
                      </h4>

                      {/* Timeline */}
                      <div className="relative border-l border-white/10 pl-6 ml-2.5 space-y-6 text-xs">
                        <div className="relative">
                          <div className="absolute -left-[31px] top-0 h-3.5 w-3.5 rounded-full border-2 border-[#B2D534] bg-[#073318]" />
                          <span className="text-[10px] text-slate-300 font-bold font-mono">09:00 AM</span>
                          <p className="font-bold text-white mt-0.5">Arrived at GMU Hub Gate</p>
                          <p className="text-slate-300 mt-0.5">Physically verified and cataloged</p>
                        </div>

                        <div className="relative">
                          <div className="absolute -left-[31px] top-0 h-3.5 w-3.5 rounded-full border-2 border-white/20 bg-[#073318]" />
                          <span className="text-[10px] text-slate-300 font-bold font-mono">10:15 AM</span>
                          <p className="font-bold text-white mt-0.5">Stored at Rack A-3</p>
                          <p className="text-slate-300 mt-0.5">Zone B placement assigned</p>
                        </div>

                        {selectedItem.status?.toLowerCase() === 'dispatch' && (
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0 h-3.5 w-3.5 rounded-full border-2 border-[#B2D534] bg-[#B2D534]" />
                            <span className="text-[10px] text-[#B2D534] font-bold font-mono">02:00 PM</span>
                            <p className="font-bold text-[#B2D534] mt-0.5">Dispatched from Warehouse</p>
                            <p className="text-slate-200 mt-0.5">Handover to drop transporter completed</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-300/60 font-semibold italic mt-6 z-10">
                      GMU rural hubs track real-time timestamps cleanly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Inventory details table */}
              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                  <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Product Inventory</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/65 text-slate-500 font-extrabold uppercase tracking-widest text-[9px] border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Product Name</th>
                        <th className="px-6 py-3">Qty</th>
                        <th className="px-6 py-3">Weight</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium bg-white">
                      <tr>
                        <td className="px-6 py-3.5 font-bold text-slate-800">Organic Honey</td>
                        <td className="px-6 py-3.5">{Math.floor((selectedItem.totalQty || 100) * 0.6)} Jars</td>
                        <td className="px-6 py-3.5">{Math.floor((selectedItem.totalWeight || 200) * 0.6)} kg</td>
                        <td className="px-6 py-3.5">
                          <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Food</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-[#073318]">₹450</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3.5 font-bold text-slate-800">Sunflower Oil</td>
                        <td className="px-6 py-3.5">{Math.ceil((selectedItem.totalQty || 100) * 0.4)} Cans</td>
                        <td className="px-6 py-3.5">{Math.ceil((selectedItem.totalWeight || 200) * 0.4)} kg</td>
                        <td className="px-6 py-3.5">
                          <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Food</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-[#073318]">₹200</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
          {qrItem && (
            <div className="space-y-6 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs font-semibold text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Order ID</span>
                    <span className="font-mono text-sm text-[#073318] font-bold">{qrItem.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Barcode</span>
                    <span className="font-mono text-slate-800">{qrItem.barcode || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                    <span className="text-slate-400 block text-[9px] uppercase">Buyer / Destination</span>
                    <span className="text-slate-800">{qrItem.buyerName || 'N/A'} - {qrItem.buyerAddress || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Simulated Camera Viewfinder */}
              <div className="relative w-64 h-64 mx-auto border-2 border-slate-300 rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner">
                {/* Scanner corners */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-[#B2D534] rounded-tl-md" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-[#B2D534] rounded-tr-md" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-[#B2D534] rounded-bl-md" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-[#B2D534] rounded-br-md" />

                {/* Red scanning line */}
                {isScanning && (
                  <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_10px_red] animate-bounce" />
                )}

                {/* QR Code graphic */}
                <div className="opacity-80 p-6 bg-white rounded-2xl shadow-md">
                  <QrCode className={`h-24 w-24 text-slate-800 ${isScanning ? 'animate-pulse' : ''}`} />
                </div>

                {/* Success Overlay */}
                {qrScanSuccess && (
                  <div className="absolute inset-0 bg-[#073318]/90 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
                    <div className="h-16 w-16 bg-[#B2D534] rounded-full flex items-center justify-center shadow-lg mb-2">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="text-sm font-bold">Scan Complete</p>
                  </div>
                )}
              </div>

              {/* Status Message */}
              <div className="h-6 flex items-center justify-center">
                {scanMessage ? (
                  <p className={`text-xs font-bold ${qrScanSuccess ? 'text-emerald-600' : 'text-[#073318]'}`}>
                    {scanMessage}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Position the QR code within the viewfinder frame to scan.</p>
                )}
              </div>

              {/* Action Button */}
              {!qrScanSuccess && (
                <button
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="w-full py-3 bg-[#073318] hover:bg-[#073318]/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isScanning ? 'Processing...' : 'Simulate Successful QR Scan'}
                </button>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
