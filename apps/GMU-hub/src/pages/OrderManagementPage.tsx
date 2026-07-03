import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Tabs } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { PickupOrder, DropOrder, ReturnOrder } from '../context/AppContext';
import { Eye, ShieldAlert, Barcode, ClipboardCheck, CheckCircle2, Copy, X, FileText, MoreVertical, Phone, MapPin, Calendar, Truck, Clock, Package, Layers, QrCode } from 'lucide-react';
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
    intakePickupOrders,
    intakeReturnOrder,
    generateOTP,
    generateBarcode,
    shgList,
    transporterList,
    assignPickupOrder,
    requestBuyerReturn,
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
  } = useAppContext();

  // Top level tabs: Pickup | Drop | Return
  const [activeTopTab, setActiveTopTab] = useState<'pickup' | 'drop' | 'return'>('pickup');

  // Sub-tabs configurations
  const [activePickupSubTab, setActivePickupSubTab] = useState('new');
  const [activeDropSubTab, setActiveDropSubTab] = useState('new');
  const [activeReturnType, setActiveReturnType] = useState<'pickup' | 'drop'>('drop');
  const [activeReturnSubTab, setActiveReturnSubTab] = useState<'new' | 'completed'>('new');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  // Multi-select state
  const [selectedAssignedOrderIds, setSelectedAssignedOrderIds] = useState<string[]>([]);
  const [selectedWarehouseOrderIds, setSelectedWarehouseOrderIds] = useState<string[]>([]);

  // Filters and Loading state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeOrder, setIntakeOrder] = useState<any | null>(null);
  const [intakeType, setIntakeType] = useState<'pickup' | 'return-pickup' | 'return-drop' | null>(null);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [generatedBarcodeText, setGeneratedBarcodeText] = useState<string | null>(null);
  const [barcodeOrderId, setBarcodeOrderId] = useState<string | null>(null);
  const [barcodeOrder, setBarcodeOrder] = useState<any>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [selectedSHG, setSelectedSHG] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState('');

  // QR Scan Modal State for Returns
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrItem, setQrItem] = useState<ReturnOrder | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const handleOpenQrModal = (item: ReturnOrder) => {
    setQrItem(item);
    setIsQrModalOpen(true);
    setQrScanSuccess(false);
    setIsScanning(false);
    setScanMessage('');
  };

  const handleSimulateScan = async () => {
    if (!qrItem) return;
    setIsScanning(true);
    setScanMessage('Scanning QR Code...');
    try {
      if (activeReturnType === 'drop') {
        await api.orders.transporterReturnScan(qrItem.uuid || qrItem.id, qrItem.barcode || '');
        setQrScanSuccess(true);
        setScanMessage('Transporter return scanned and moved to inventory successfully.');
      } else {
        await api.orders.buyerReturnScan(qrItem.uuid || qrItem.id, qrItem.barcode || '');
        setQrScanSuccess(true);
        setScanMessage('Buyer return scanned and moved to inventory successfully.');
      }
      await loadData();
    } catch (err: any) {
      setScanMessage(err.message || 'Failed to process return scan.');
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        setIsQrModalOpen(false);
      }, 1500);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const sf = statusFilter === 'all' ? undefined : statusFilter;
      const df = dateFilter || undefined;
      await loadCounts();

      if (activeTopTab === 'pickup') {
        if (activePickupSubTab === 'new') {
          await loadPickupNew(sf, df);
        } else if (activePickupSubTab === 'assigned') {
          await loadPickupAssigned(sf, df);
        } else if (activePickupSubTab === 'warehouse') {
          await loadPickupWarehouse(sf, df);
        } else if (activePickupSubTab === 'rejected') {
          await loadPickupRejected(sf, df);
        } else if (activePickupSubTab === 'reschedule') {
          await loadPickupRescheduled(sf, df);
        }
      } else if (activeTopTab === 'drop') {
        if (activeDropSubTab === 'new') {
          await loadDropNew(sf, df);
        } else if (activeDropSubTab === 'assigned') {
          await loadDropAssigned(sf, df);
        } else if (activeDropSubTab === 'rejected') {
          await loadDropRejected(sf, df);
        } else if (activeDropSubTab === 'reschedule') {
          await loadDropRescheduled(sf, df);
        } else if (activeDropSubTab === 'completed') {
          await loadDropCompleted(sf, df);
        }
      } else if (activeTopTab === 'return') {
        if (activeReturnType === 'drop') {
          await loadReturnsTransporter(sf, df);
        } else if (activeReturnType === 'pickup') {
          await loadReturnsBuyer(sf, df);
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load data from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    activeTopTab,
    activePickupSubTab,
    activeDropSubTab,
    activeReturnType,
    activeReturnSubTab,
    statusFilter,
    dateFilter
  ]);

  useEffect(() => {
    setStatusFilter('all');
    setDateFilter('');
  }, [
    activeTopTab,
    activePickupSubTab,
    activeDropSubTab,
    activeReturnType,
    activeReturnSubTab
  ]);

  // Handle View Action
  const handleViewOrder = (order: any) => {
    setSelectedOrderDetails(order);
    setIsViewModalOpen(true);
  };

  // Handle Intake Action
  const handleIntakeClick = (order: any, type: 'pickup' | 'return-pickup' | 'return-drop') => {
    setIntakeOrder({
      id: order.id,
      uuid: order.uuid,
      qty: order.totalQty || order.quantity || 0,
      weight: order.totalWeight || order.weight || 0,
      sellerName: order.sellerName || 'N/A',
      buyerName: order.buyerName || 'N/A',
      shgName: order.shgDetails?.name || 'N/A',
      transporterName: order.transporterDetails?.name || 'N/A',
      fullOrder: order,
    });
    setIntakeType(type);
    setGeneratedOTP(null);
    setIsIntakeModalOpen(true);
  };

  const handleConfirmIntake = async () => {
    if (!intakeOrder || !intakeType) return;
    setActionProcessing(true);
    try {
      if (intakeType === 'pickup') {
        const orderIds = intakeOrder.isBulk ? intakeOrder.selectedIds : [intakeOrder.id];
        await intakePickupOrders(orderIds);
        alert('Pickup orders intake completed successfully.');
      } else if (intakeType === 'return-pickup') {
        await intakeReturnOrder(intakeOrder.id, 'pickup');
        alert('Buyer return order intake completed successfully.');
      } else if (intakeType === 'return-drop') {
        await intakeReturnOrder(intakeOrder.id, 'drop');
        alert('Transporter return order intake completed successfully.');
      }
      setIsIntakeModalOpen(false);
      setIntakeOrder(null);
      setIntakeType(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Intake action failed.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Barcode Action
  const handleBarcodeClick = (orderId: string) => {
    const order = pickupWarehouseOrders.find((o) => o.id === orderId);
    setBarcodeOrder(order || null);
    setBarcodeOrderId(orderId);
    setGeneratedBarcodeText(null);
    setIsBarcodeModalOpen(true);
  };

  // Render Table Action Button Helper
  const getActionButtons = (row: any, type: 'pickup' | 'drop' | 'return', subTab: string) => {
    const hasIntake = false;
    const hasWarehouse = type === 'pickup' && subTab === 'warehouse';

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
          className="p-1.5 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-[#073318] rounded-xl transition-colors cursor-pointer border border-slate-200/60 shadow-sm flex items-center justify-center"
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
                  handleViewOrder(row);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#073318]/5 hover:text-[#073318] rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-slate-400" />
                <span>View Details</span>
              </button>



              {type === 'return' && subTab === 'assigned' && ['RETURN_PARCEL_AT_SHG', 'RETURN_TRANSPORTER_PENDING'].includes(row.mainStatus) && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    if (confirm('Broadcast this return pickup request to matching transporters?')) {
                      setActionProcessing(true);
                      try {
                        await api.orders.broadcastBuyerReturnTransporter(row.uuid || row.id);
                        alert('Broadcasted to matching transporters successfully.');
                        await loadData();
                      } catch (err: any) {
                        alert(err.message || 'Broadcast failed.');
                      } finally {
                        setActionProcessing(false);
                      }
                    }
                  }}
                  disabled={actionProcessing}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <Truck className="h-4 w-4 text-blue-500/70" />
                  <span>Broadcast Transporter</span>
                </button>
              )}



              {hasIntake && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    const intakeKind = type === 'pickup' ? 'pickup' : (activeReturnType === 'pickup' ? 'return-pickup' : 'return-drop');
                    handleIntakeClick(row, intakeKind);
                  }}
                  disabled={row.mainStatus !== 'PARCEL_AT_GMU' && row.mainStatus !== 'RETURN_PARCEL_AT_GMU' && row.mainStatus !== 'PARCEL_AT_HUB' && row.mainStatus !== 'RETURN_PARCEL_AT_HUB'}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all duration-150 flex items-center gap-2.5 ${
                    (row.mainStatus === 'PARCEL_AT_GMU' || row.mainStatus === 'RETURN_PARCEL_AT_GMU' || row.mainStatus === 'PARCEL_AT_HUB' || row.mainStatus === 'RETURN_PARCEL_AT_HUB')
                      ? 'text-[#073318] hover:bg-[#B2D534]/20 cursor-pointer'
                      : 'text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Intake Order</span>
                </button>
              )}

              {hasWarehouse && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    handleBarcodeClick(row.id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                >
                  <Barcode className="h-4 w-4 text-blue-500/70" />
                  <span>Generate Barcode</span>
                </button>
              )}

              {type === 'return' && subTab === 'completed' && ['TRANSPORTER_RETURN_COMPLETED', 'BUYER_RETURN_COMPLETED', 'RETURN_COMPLETED'].includes(row.mainStatus) && (
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

              {type === 'drop' && subTab === 'completed' && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
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
                  disabled={actionProcessing}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-500/70" />
                  <span>Request Buyer Return</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // --- COLUMN SCHEMAS ---

  // Pickup: New
  const pickupNewColumns = [
    { header: 'Order ID', accessor: 'id' as keyof PickupOrder },
    { header: 'Seller Name', accessor: 'sellerName' as keyof PickupOrder },
    { header: 'Seller Mobile', accessor: 'sellerMobile' as keyof PickupOrder },
    { header: 'Seller Village/City', accessor: 'sellerVillage' as keyof PickupOrder },
    { header: 'Seller Pincode', accessor: 'sellerPincode' as keyof PickupOrder },
    { header: 'Product Count', accessor: 'productCount' as keyof PickupOrder },
    { header: 'Total Qty', accessor: 'totalQty' as keyof PickupOrder },
    { header: 'Total Weight (KG)', accessor: 'totalWeight' as keyof PickupOrder },
    { header: 'Start Date', accessor: (row: PickupOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: PickupOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'SHG Status', accessor: (row: PickupOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Action', accessor: (row: PickupOrder) => getActionButtons(row, 'pickup', 'new') },
  ];

  // Pickup: Assigned
  const pickupAssignedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof PickupOrder },
    { header: 'Seller Name', accessor: 'sellerName' as keyof PickupOrder },
    { header: 'Seller Address', accessor: 'sellerAddress' as keyof PickupOrder },
    { header: 'Seller Mobile', accessor: 'sellerMobile' as keyof PickupOrder },
    { header: 'SHG Name', accessor: (row: PickupOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: PickupOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: PickupOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'Transporter Name', accessor: (row: PickupOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: PickupOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Start Date', accessor: (row: PickupOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: PickupOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'SHG Status', accessor: (row: PickupOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: PickupOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: PickupOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: PickupOrder) => getActionButtons(row, 'pickup', 'assigned') },
  ];

  const pickupAssignedColumnsWithSelection = [
    {
      header: '',
      accessor: (row: PickupOrder) => (
        <input
          type="checkbox"
          checked={selectedAssignedOrderIds.includes(row.id)}
          disabled={row.mainStatus !== 'PARCEL_AT_GMU' && row.mainStatus !== 'RETURN_PARCEL_AT_GMU' && row.mainStatus !== 'PARCEL_AT_HUB' && row.mainStatus !== 'RETURN_PARCEL_AT_HUB'}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedAssignedOrderIds((prev) => [...prev, row.id]);
            } else {
              setSelectedAssignedOrderIds((prev) => prev.filter((id) => id !== row.id));
            }
          }}
          className={`h-4 w-4 focus:ring-[#073318] border-slate-300 rounded ${
            (row.mainStatus === 'PARCEL_AT_GMU' || row.mainStatus === 'RETURN_PARCEL_AT_GMU' || row.mainStatus === 'PARCEL_AT_HUB' || row.mainStatus === 'RETURN_PARCEL_AT_HUB')
              ? 'text-[#073318] cursor-pointer'
              : 'text-slate-200 cursor-not-allowed opacity-40'
          }`}
        />
      ),
    },
    ...pickupAssignedColumns,
  ];

  // Pickup: Warehouse
  const pickupWarehouseColumns = [
    { header: 'Order ID', accessor: 'id' as keyof PickupOrder },
    { header: 'Barcode Number', accessor: (row: PickupOrder) => row.barcode || 'N/A' },
    { header: 'Seller Name', accessor: 'sellerName' as keyof PickupOrder },
    { header: 'Seller Mobile', accessor: 'sellerMobile' as keyof PickupOrder },
    { header: 'Product Count', accessor: 'productCount' as keyof PickupOrder },
    { header: 'Total Qty', accessor: 'totalQty' as keyof PickupOrder },
    { header: 'Total Weight', accessor: 'totalWeight' as keyof PickupOrder },
    { header: 'Start Date', accessor: (row: PickupOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: PickupOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Warehouse Received Date', accessor: (row: PickupOrder) => row.warehouseReceivedDate || row.currentDate || (row.updated_at ? row.updated_at.split(' ')[0] : '-') },
    { header: 'Status', accessor: (row: PickupOrder) => <StatusBadge status={row.status} /> },
    { header: 'Action', accessor: (row: PickupOrder) => getActionButtons(row, 'pickup', 'warehouse') },
  ];

  const pickupWarehouseColumnsWithSelection = [
    {
      header: '',
      accessor: (row: PickupOrder) => (
        <input
          type="checkbox"
          checked={selectedWarehouseOrderIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedWarehouseOrderIds((prev) => [...prev, row.id]);
            } else {
              setSelectedWarehouseOrderIds((prev) => prev.filter((id) => id !== row.id));
            }
          }}
          className="h-4 w-4 text-[#073318] focus:ring-[#073318] border-slate-300 rounded cursor-pointer"
        />
      ),
    },
    ...pickupWarehouseColumns,
  ];

  // Pickup: Rejected
  const pickupRejectedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof PickupOrder },
    { header: 'Seller Name', accessor: 'sellerName' as keyof PickupOrder },
    { header: 'Seller Mobile', accessor: 'sellerMobile' as keyof PickupOrder },
    { header: 'Seller Address', accessor: 'sellerAddress' as keyof PickupOrder },
    { header: 'Seller Village/City', accessor: 'sellerVillage' as keyof PickupOrder },
    { header: 'Seller Pincode', accessor: 'sellerPincode' as keyof PickupOrder },
    { header: 'Product Count', accessor: 'productCount' as keyof PickupOrder },
    { header: 'Total Qty', accessor: 'totalQty' as keyof PickupOrder },
    { header: 'Total Weight', accessor: 'totalWeight' as keyof PickupOrder },
    { header: 'Start Date', accessor: (row: PickupOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: PickupOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Rejected Date', accessor: (row: PickupOrder) => row.rejectedDate || (row.updated_at ? row.updated_at.split(' ')[0] : '-') },
    { header: 'Reason', accessor: 'rejectionReason' as keyof PickupOrder },
    { header: 'Rejected By', accessor: 'rejectedBy' as keyof PickupOrder },
    { header: 'SHG Status', accessor: (row: PickupOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: PickupOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: PickupOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: PickupOrder) => getActionButtons(row, 'pickup', 'rejected') },
  ];

  // Drop: New
  const dropNewColumns = [
    { header: 'Order ID', accessor: 'id' as keyof DropOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof DropOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof DropOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof DropOrder },
    { header: 'Buyer Village/City', accessor: 'buyerVillage' as keyof DropOrder },
    { header: 'Buyer Pincode', accessor: 'buyerPincode' as keyof DropOrder },
    { header: 'Product Count', accessor: 'productCount' as keyof DropOrder },
    { header: 'Total Qty', accessor: 'totalQty' as keyof DropOrder },
    { header: 'Total Weight (KG)', accessor: 'totalWeight' as keyof DropOrder },
    { header: 'Start Date', accessor: (row: DropOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: DropOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'SHG Status', accessor: (row: DropOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Action', accessor: (row: DropOrder) => getActionButtons(row, 'drop', 'new') },
  ];

  // Drop: Assigned
  const dropAssignedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof DropOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof DropOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof DropOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof DropOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof DropOrder },
    { header: 'SHG Name', accessor: (row: DropOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: DropOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: DropOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof DropOrder },
    { header: 'Transporter Name', accessor: (row: DropOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: DropOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof DropOrder },
    { header: 'Start Date', accessor: (row: DropOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: DropOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'SHG Status', accessor: (row: DropOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: DropOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: DropOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: DropOrder) => getActionButtons(row, 'drop', 'assigned') },
  ];

  // Drop: Rejected
  const dropRejectedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof DropOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof DropOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof DropOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof DropOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof DropOrder },
    { header: 'Buyer Village/City', accessor: 'buyerVillage' as keyof DropOrder },
    { header: 'Buyer Pincode', accessor: 'buyerPincode' as keyof DropOrder },
    { header: 'Product Count', accessor: 'productCount' as keyof DropOrder },
    { header: 'Total Qty', accessor: 'totalQty' as keyof DropOrder },
    { header: 'Total Weight', accessor: 'totalWeight' as keyof DropOrder },
    { header: 'Start Date', accessor: (row: DropOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: DropOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Rejected Date', accessor: (row: DropOrder) => row.rejectedDate || (row.updated_at ? row.updated_at.split(' ')[0] : '-') },
    { header: 'Reason', accessor: 'rejectionReason' as keyof DropOrder },
    { header: 'Rejected By', accessor: 'rejectedBy' as keyof DropOrder },
    { header: 'SHG Status', accessor: (row: DropOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: DropOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: DropOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: DropOrder) => getActionButtons(row, 'drop', 'rejected') },
  ];

  // Drop: Reschedule (same as assigned)
  const dropRescheduledColumns = [
    { header: 'Order ID', accessor: 'id' as keyof DropOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof DropOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof DropOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof DropOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof DropOrder },
    { header: 'SHG Name', accessor: (row: DropOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: DropOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: DropOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof DropOrder },
    { header: 'Transporter Name', accessor: (row: DropOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: DropOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof DropOrder },
    { header: 'Start Date', accessor: (row: DropOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: DropOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Rescheduled By', accessor: 'rescheduledBy' as keyof DropOrder },
    { header: 'SHG Status', accessor: (row: DropOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: DropOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: DropOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: DropOrder) => getActionButtons(row, 'drop', 'reschedule') },
  ];

  // Drop: Completed
  const dropCompletedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof DropOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof DropOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof DropOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof DropOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof DropOrder },
    { header: 'SHG Name', accessor: (row: DropOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: DropOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: DropOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof DropOrder },
    { header: 'Transporter Name', accessor: (row: DropOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: DropOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof DropOrder },
    { header: 'Start Date', accessor: (row: DropOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: DropOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Main Status', accessor: (row: DropOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: DropOrder) => getActionButtons(row, 'drop', 'completed') },
  ];

  // Pickup: Reschedule (same as assigned)
  const pickupRescheduledColumns = [
    { header: 'Order ID', accessor: 'id' as keyof PickupOrder },
    { header: 'Seller Name', accessor: 'sellerName' as keyof PickupOrder },
    { header: 'Seller Address', accessor: 'sellerAddress' as keyof PickupOrder },
    { header: 'Seller Mobile', accessor: 'sellerMobile' as keyof PickupOrder },
    { header: 'SHG Name', accessor: (row: PickupOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: PickupOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: PickupOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof PickupOrder },
    { header: 'Transporter Name', accessor: (row: PickupOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: PickupOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof PickupOrder },
    { header: 'Start Date', accessor: (row: PickupOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: PickupOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Rescheduled By', accessor: 'rescheduledBy' as keyof PickupOrder },
    { header: 'SHG Status', accessor: (row: PickupOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: PickupOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: PickupOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: PickupOrder) => getActionButtons(row, 'pickup', 'reschedule') },
  ];

  // Return Pickup: New Columns
  const returnPickupNewColumns = [
    { header: 'Order ID', accessor: 'id' as keyof ReturnOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof ReturnOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof ReturnOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof ReturnOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof ReturnOrder },
    { header: 'SHG Name', accessor: (row: ReturnOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: ReturnOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: ReturnOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof ReturnOrder },
    { header: 'Transporter Name', accessor: (row: ReturnOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: ReturnOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof ReturnOrder },
    { header: 'Start Date', accessor: (row: ReturnOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: ReturnOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'SHG Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: ReturnOrder) => getActionButtons(row, 'return', 'assigned') },
  ];

  // Return Pickup: Completed Columns
  const returnPickupCompletedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof ReturnOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof ReturnOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof ReturnOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof ReturnOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof ReturnOrder },
    { header: 'SHG Name', accessor: (row: ReturnOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: ReturnOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: ReturnOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof ReturnOrder },
    { header: 'Transporter Name', accessor: (row: ReturnOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: ReturnOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof ReturnOrder },
    { header: 'Start Date', accessor: (row: ReturnOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: ReturnOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Main Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: ReturnOrder) => getActionButtons(row, 'return', 'completed') },
  ];

  // Return Drop: New Columns
  const returnDropNewColumns = [
    { header: 'Order ID', accessor: 'id' as keyof ReturnOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof ReturnOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof ReturnOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof ReturnOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof ReturnOrder },
    { header: 'SHG Name', accessor: (row: ReturnOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: ReturnOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: ReturnOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof ReturnOrder },
    { header: 'Transporter Name', accessor: (row: ReturnOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: ReturnOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof ReturnOrder },
    { header: 'Start Date', accessor: (row: ReturnOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: ReturnOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'SHG Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.shgStatus} /> },
    { header: 'Transporter Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.transporterStatus} /> },
    { header: 'Main Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: ReturnOrder) => getActionButtons(row, 'return', 'assigned') },
  ];

  // Return Drop: Completed Columns
  const returnDropCompletedColumns = [
    { header: 'Order ID', accessor: 'id' as keyof ReturnOrder },
    { header: 'Barcode Number', accessor: 'barcode' as keyof ReturnOrder },
    { header: 'Buyer Name', accessor: 'buyerName' as keyof ReturnOrder },
    { header: 'Buyer Address', accessor: 'buyerAddress' as keyof ReturnOrder },
    { header: 'Buyer Mobile', accessor: 'buyerMobile' as keyof ReturnOrder },
    { header: 'SHG Name', accessor: (row: ReturnOrder) => row.shgDetails?.name || '-', sortKey: 'shgName' },
    { header: 'SHG Address', accessor: (row: ReturnOrder) => row.shgDetails?.address || '-', sortKey: 'shgAddress' },
    { header: 'SHG Mobile', accessor: (row: ReturnOrder) => row.shgDetails?.mobile || '-', sortKey: 'shgMobile' },
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof ReturnOrder },
    { header: 'Transporter Name', accessor: (row: ReturnOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: ReturnOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof ReturnOrder },
    { header: 'Start Date', accessor: (row: ReturnOrder) => row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : '-') },
    { header: 'Delivery Expected Date', accessor: (row: ReturnOrder) => getExpectedDeliveryDate(row.orderDate || (row.created_at ? row.created_at.split(' ')[0] : undefined)) },
    { header: 'Main Status', accessor: (row: ReturnOrder) => <StatusBadge status={row.mainStatus} /> },
    { header: 'Action', accessor: (row: ReturnOrder) => getActionButtons(row, 'return', 'completed') },
  ];


  // Manual Partner Assignment Form Submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignOrderId && selectedSHG && selectedTransporter) {
      setActionProcessing(true);
      try {
        await assignPickupOrder(assignOrderId, selectedSHG, selectedTransporter);
        alert('Partners assigned successfully.');
        setIsAssignModalOpen(false);
        setSelectedSHG('');
        setSelectedTransporter('');
        setAssignOrderId(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Assignment failed.');
      } finally {
        setActionProcessing(false);
      }
    }
  };

  return (
    <Layout currentPage="order-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Order Management</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Manage Pickups, Drops, and Returns operations.</p>
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
            Loading live data from GMU APIs...
          </div>
        )}

        {/* Top-level Tabs */}
        <Tabs
          activeTab={activeTopTab}
          onChange={(id) => {
            setActiveTopTab(id as any);
          }}
          tabs={[
            { id: 'pickup', label: 'Pickup' },
            { id: 'drop', label: 'Drop' },
            { id: 'return', label: 'Return' },
          ]}
        />

        {/* ---------------- PICKUP TAB ---------------- */}
        {activeTopTab === 'pickup' && (
          <div className="space-y-4">
            <Tabs
              activeTab={activePickupSubTab}
              onChange={setActivePickupSubTab}
              variant="secondary"
              tabs={[
                { id: 'new', label: 'New Orders', count: counts.pickup.new },
                { id: 'assigned', label: 'Assigned Orders', count: counts.pickup.assigned },
                { id: 'warehouse', label: 'Warehouse Orders', count: counts.pickup.warehouse },
                { id: 'rejected', label: 'Rejected Orders', count: counts.pickup.rejected },
                { id: 'reschedule', label: 'Rescheduled Orders', count: counts.pickup.rescheduled },
              ]}
            />
            {activePickupSubTab === 'new' && (
              <DataTable
                columns={pickupNewColumns}
                data={pickupNewOrders}
                statusFilterField="mainStatus"
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activePickupSubTab === 'assigned' && (
              <div className="space-y-3">
                {selectedAssignedOrderIds.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const selectedOrders = pickupAssignedOrders.filter((o) => selectedAssignedOrderIds.includes(o.id));
                        const totalQty = selectedOrders.reduce((sum, o) => sum + o.totalQty, 0);
                        const totalWeight = selectedOrders.reduce((sum, o) => sum + o.totalWeight, 0);
                        setIntakeOrder({
                           id: selectedAssignedOrderIds.join(', '),
                           qty: totalQty,
                           weight: totalWeight,
                           isBulk: true,
                           selectedIds: selectedAssignedOrderIds,
                        });
                        setIntakeType('pickup');
                        setGeneratedOTP(null);
                        setIsIntakeModalOpen(true);
                        setSelectedAssignedOrderIds([]);
                      }}
                      className="px-4 py-2.5 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Intake Selected ({selectedAssignedOrderIds.length})
                    </button>
                  </div>
                )}
                <DataTable
                  columns={pickupAssignedColumnsWithSelection}
                  data={pickupAssignedOrders}
                  statusFilterField="mainStatus"
                  statusFilterOptions={['Pickup Assigned', 'Pickup SHG Accepted', 'SHG Pickup Declined', 'Parcel At SHG', 'Transporter Accepted', 'Transporter Declined', 'In Transit To Hub', 'Parcel At Transporter', 'Parcel At GMU']}
                  selectedStatus={statusFilter}
                  onStatusChange={setStatusFilter}
                  selectedDate={dateFilter}
                  onDateChange={setDateFilter}
                  onRowDoubleClick={handleViewOrder}
                  onRefresh={loadData}
                />
              </div>
            )}
            {activePickupSubTab === 'warehouse' && (
              <DataTable
                columns={pickupWarehouseColumns}
                data={pickupWarehouseOrders}
                statusFilterField="status"
                statusFilterOptions={['Parcel At Hub', 'Barcode Generated']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activePickupSubTab === 'rejected' && (
              <DataTable
                columns={pickupRejectedColumns}
                data={pickupRejectedOrders}
                statusFilterField="mainStatus"
                statusFilterOptions={['Order Placed', 'Pickup Assigned', 'Pickup SHG Accepted', 'SHG Pickup Declined', 'Parcel At SHG', 'Transporter Accepted', 'Transporter Declined', 'In Transit To Hub']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activePickupSubTab === 'reschedule' && (
              <DataTable
                columns={pickupRescheduledColumns}
                data={pickupRescheduledOrders}
                statusFilterField="mainStatus"
                statusFilterOptions={['Reassigned', 'Pickup Assigned', 'Pickup SHG Accepted', 'Transporter Accepted']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
          </div>
        )}

        {/* ---------------- DROP TAB ---------------- */}
        {activeTopTab === 'drop' && (
          <div className="space-y-4">
            <Tabs
              activeTab={activeDropSubTab}
              onChange={setActiveDropSubTab}
              variant="secondary"
              tabs={[
                { id: 'new', label: 'New Orders', count: counts.drop.new },
                { id: 'assigned', label: 'Assigned Orders', count: counts.drop.assigned },
                { id: 'completed', label: 'Completed Orders', count: counts.drop.completed },
                { id: 'rejected', label: 'Rejected Orders', count: counts.drop.rejected },
                { id: 'reschedule', label: 'Reschedule Options', count: counts.drop.rescheduled },
              ]}
            />
            {activeDropSubTab === 'new' && (
              <DataTable
                columns={dropNewColumns}
                data={dropNewOrders}
                statusFilterField="mainStatus"
                statusFilterOptions={['Pending', 'Pending Acceptance', 'Pickuphub Receive', 'Barcode Generated', 'Stored', 'Drop Assigned', 'Dispatched', 'Pending Drop']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activeDropSubTab === 'assigned' && (
              <DataTable
                columns={dropAssignedColumns}
                data={dropAssignedOrders}
                statusFilterField="mainStatus"
                statusFilterOptions={['Drop SHG Accepted', 'Drop Transporter Accepted', 'In Transit To Drop SHG', 'Parcel At Drop SHG']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activeDropSubTab === 'rejected' && (
              <DataTable
                columns={dropRejectedColumns}
                data={dropRejectedOrders}
                statusFilterField="mainStatus"
                statusFilterOptions={['Drop Assigned', 'Drop SHG Accepted', 'Drop Transporter Accepted', 'Parcel At Drop SHG', 'In Transit To Drop SHG']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activeDropSubTab === 'reschedule' && (
              <DataTable
                columns={dropRescheduledColumns}
                data={dropRescheduledOrders}
                statusFilterField="mainStatus"
                statusFilterOptions={['Reassigned', 'Drop Assigned', 'Drop SHG Accepted', 'Drop Transporter Accepted']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activeDropSubTab === 'completed' && (
              <DataTable
                columns={dropCompletedColumns}
                data={dropCompletedOrders}
                statusFilterField="mainStatus"
                statusFilterOptions={['Delivered', 'Completed']}
                selectedStatus={statusFilter}
                onStatusChange={setStatusFilter}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
          </div>
        )}

        {/* ---------------- RETURN TAB ---------------- */}
        {activeTopTab === 'return' && (
          <div className="space-y-4">
            <Tabs
              activeTab={activeReturnType}
              onChange={(id) => {
                setActiveReturnType(id as any);
                setActiveReturnSubTab('new');
              }}
              tabs={[
                { id: 'drop', label: 'Traspoter return orders', count: counts.return.transporter },
                { id: 'pickup', label: 'Buyer return orders', count: counts.return.buyer },
              ]}
            />
            <Tabs
              activeTab={activeReturnSubTab}
              onChange={(id) => setActiveReturnSubTab(id as any)}
              variant="secondary"
              tabs={
                activeReturnType === 'pickup'
                  ? [
                      { id: 'new', label: 'New Orders', count: returnPickupNewOrders.length },
                      { id: 'completed', label: 'Completed Orders', count: returnPickupCompletedOrders.length },
                    ]
                  : [
                      { id: 'new', label: 'New Orders', count: returnDropNewOrders.length },
                      { id: 'completed', label: 'Completed Orders', count: returnDropCompletedOrders.length },
                    ]
              }
            />
            {activeReturnType === 'pickup' && activeReturnSubTab === 'new' && (
              <DataTable
                columns={returnPickupNewColumns}
                data={returnPickupNewOrders}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activeReturnType === 'pickup' && activeReturnSubTab === 'completed' && (
              <DataTable
                columns={returnPickupCompletedColumns}
                data={returnPickupCompletedOrders}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activeReturnType === 'drop' && activeReturnSubTab === 'new' && (
              <DataTable
                columns={returnDropNewColumns}
                data={returnDropNewOrders}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
            {activeReturnType === 'drop' && activeReturnSubTab === 'completed' && (
              <DataTable
                columns={returnDropCompletedColumns}
                data={returnDropCompletedOrders}
                selectedDate={dateFilter}
                onDateChange={setDateFilter}
                onRowDoubleClick={handleViewOrder}
                onRefresh={loadData}
              />
            )}
          </div>
        )}

        {/* --- INTAKE MODAL --- */}
        <Modal
          isOpen={isIntakeModalOpen}
          onClose={() => setIsIntakeModalOpen(false)}
          title="Verification & Intake Portal"
          variant="modal"
        >
          {intakeOrder && (
            <div className="space-y-5">
              <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-2xl p-5 space-y-4 text-left">
                <div className="flex items-center gap-2 text-[#073318] border-b border-[#073318]/10 pb-2">
                  <span className="font-extrabold text-xs uppercase tracking-wider">Order Handover Information</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                  <div className="col-span-2 bg-white p-3 rounded-xl border border-slate-150">
                    <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Order ID(s)</p>
                    <p className="font-extrabold text-[#073318] text-sm font-mono mt-0.5">{intakeOrder.id}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-150">
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Quantity</p>
                    <p className="font-extrabold text-[#073318] text-sm mt-0.5">{intakeOrder.qty} units</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-150">
                    <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Total Weight</p>
                    <p className="font-extrabold text-[#073318] text-sm mt-0.5">{intakeOrder.weight} kg</p>
                  </div>

                  {!intakeOrder.isBulk && (
                    <>
                      <div className="bg-white p-3 rounded-xl border border-slate-150">
                        <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Seller / Origin</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{intakeOrder.sellerName || 'N/A'}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-150">
                        <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Buyer / Destination</p>
                        <p className="font-extrabold text-slate-800 mt-0.5">{intakeOrder.buyerName || 'N/A'}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-150">
                        <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Assigned SHG</p>
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
                  className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Intake Order
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* --- BARCODE GENERATOR MODAL --- */}
        <Modal
          isOpen={isBarcodeModalOpen}
          onClose={() => setIsBarcodeModalOpen(false)}
          title="Warehouse Barcode Generation"
          variant="modal"
        >
          {!generatedBarcodeText && barcodeOrder ? (
            <div className="space-y-4 text-left">
              <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-[#073318] border-b border-[#073318]/10 pb-2">
                  <span className="text-sm">📋</span>
                  <span className="font-extrabold text-xs uppercase tracking-wider">Order Handover Details</span>
                </div>

                {/* Seller & Buyer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seller Info */}
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm space-y-1">
                    <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Seller Information</p>
                    <h6 className="font-extrabold text-[#073318] text-xs">{barcodeOrder.sellerName || 'N/A'}</h6>
                    <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                      📞 {barcodeOrder.sellerMobile || 'N/A'}
                    </div>
                  </div>

                  {/* Buyer Info */}
                  <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm space-y-1">
                    <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Buyer Information</p>
                    <h6 className="font-extrabold text-[#073318] text-xs">{barcodeOrder.buyerName || 'Gramin Mandi Mumbai'}</h6>
                    <div className="text-[10px] text-slate-600 font-semibold space-y-0.5 mt-0.5">
                      <div>📞 {barcodeOrder.buyerMobile || '+91 99887 11001'}</div>
                      <div className="line-clamp-1">📍 {barcodeOrder.buyerAddress || 'Shop No. 12, Crawford Market, Mumbai'}</div>
                    </div>
                  </div>
                </div>

                {/* Product Info Indicator */}
                <div className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Product Count</p>
                    <p className="text-sm font-black text-[#073318] mt-0.5">{barcodeOrder.productCount || 2}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Total Qty</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{barcodeOrder.totalQty || barcodeOrder.quantity || 40}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Total Weight</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{barcodeOrder.totalWeight || barcodeOrder.weight || 160} KG</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (barcodeOrderId) {
                      try {
                        setActionProcessing(true);
                        const code = await generateBarcode(barcodeOrderId);
                        setGeneratedBarcodeText(code);
                        await loadData();
                      } catch (err: any) {
                        alert(err.message || 'Failed to generate barcode.');
                      } finally {
                        setActionProcessing(false);
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-sm shadow-md transition-colors cursor-pointer text-center"
                >
                  Generate Barcode
                </button>
                <button
                  onClick={() => setIsBarcodeModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <p className="text-xs text-slate-500">
                Generated unique label for Order ID: <span className="font-bold text-[#073318]">{barcodeOrderId}</span>
              </p>
              {generatedBarcodeText && (
                <div className="py-8 bg-slate-50 border border-dashed border-slate-300 rounded-3xl flex flex-col items-center gap-3">
                  {/* Simulated barcode */}
                  <div className="flex items-center gap-[2px] h-16 w-64">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const width = (i % 3 === 0) ? 'w-[4px]' : (i % 5 === 0) ? 'w-[1px]' : 'w-[2px]';
                      const bg = (i % 7 === 0) ? 'bg-transparent' : 'bg-slate-900';
                      return <div key={i} className={`h-full ${width} ${bg}`} />;
                    })}
                  </div>
                  <p className="text-xs font-mono font-bold tracking-widest text-slate-700">{generatedBarcodeText}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    alert('Sending print job to zebra labels printer...');
                    setIsBarcodeModalOpen(false);
                  }}
                  className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-sm shadow-md transition-colors cursor-pointer"
                >
                  Print Label
                </button>
                <button
                  onClick={() => setIsBarcodeModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* --- ASSIGN PARTNER MODAL --- */}
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign SHG & Transporter Partner"
          variant="modal"
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <p className="text-xs text-slate-500">
              Assign logistics partners to handle order <span className="font-bold text-[#073318]">{assignOrderId}</span>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Select Self-Help Group (SHG)</label>
              <select
                required
                value={selectedSHG}
                onChange={(e) => setSelectedSHG(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
              >
                <option value="">-- Choose SHG Partner --</option>
                {shgList
                  .filter((s) => s.status === 'Active')
                  .map((shg) => (
                    <option key={shg.id} value={shg.id}>
                      {shg.name} ({shg.leader} - {shg.address})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Select Transporter Partner</label>
              <select
                required
                value={selectedTransporter}
                onChange={(e) => setSelectedTransporter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
              >
                <option value="">-- Choose Transporter Partner --</option>
                {transporterList
                  .filter((t) => t.status === 'Available')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.vehicle} - Route: {t.route})
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                Confirm Assignment
              </button>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
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
                        {selectedOrderDetails.sellerName ? 'Seller Pickup Protocol' : selectedOrderDetails.buyerName ? 'Buyer Drop Protocol' : 'Return Pickup Protocol'}
                      </span>
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {selectedOrderDetails.mainStatus.replace(/[-_]/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-[#073318] flex items-baseline gap-2">
                      {selectedOrderDetails.id}
                      <span className="text-sm text-slate-400 font-bold font-mono">
                        ({selectedOrderDetails.pickupId || 'PICK-' + selectedOrderDetails.id.split('-').pop()})
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Right Side: Status Stepper */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className={`px-4 py-2 rounded-xl font-bold ${selectedOrderDetails.mainStatus === 'pending' || selectedOrderDetails.mainStatus === 'pending-acceptance' ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>NEW</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className={`px-4 py-2 rounded-xl font-bold ${selectedOrderDetails.mainStatus.includes('assigned') || selectedOrderDetails.mainStatus.includes('accepted') ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>ASSIGNED</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className={`px-4 py-2 rounded-xl font-bold ${selectedOrderDetails.mainStatus.includes('hub') || selectedOrderDetails.mainStatus.includes('warehouse') ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>WAREHOUSE</span>
                  <span className="text-slate-300 px-1 font-bold">➔</span>
                  <span className={`px-4 py-2 rounded-xl font-bold ${selectedOrderDetails.mainStatus === 'completed' || selectedOrderDetails.mainStatus === 'returned' || selectedOrderDetails.mainStatus.includes('completed') ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>COMPLETED</span>
                </div>
              </div>

              {/* Main Grid: Left Order Summary & Right Order History */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Section (Summary) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Section 1: Order Summary */}
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center justify-between border-b border-[#073318]/10 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Order Summary</span>
                      </div>
                      <span className="bg-[#073318] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Active Order
                      </span>
                    </div>

                    {/* Metric Indicators Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Product Count</p>
                        <p className="text-lg font-black text-[#073318] mt-1">{selectedOrderDetails.productCount || 2}</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Total Qty</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{selectedOrderDetails.totalQty || selectedOrderDetails.quantity || 40} Jars</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Total Weight</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{selectedOrderDetails.totalWeight || selectedOrderDetails.weight || 160} KG</p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Priority</p>
                        <div className="mt-1">
                          <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                            {selectedOrderDetails.priority || 'MEDIUM'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Logistics Dates Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                        <div className="text-left">
                          <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Order Date (Start Date)</p>
                          <p className="text-sm font-black text-[#073318] mt-0.5">
                            {selectedOrderDetails.orderDate || (selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ')[0] : '-')}
                          </p>
                        </div>
                        <Calendar className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-5">
                        <div className="text-left">
                          <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Delivery Expected Date</p>
                          <p className="text-sm font-black text-amber-700 mt-0.5">
                            {getExpectedDeliveryDate(selectedOrderDetails.orderDate || (selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ')[0] : ''))}
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
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.sellerName || 'N/A'}</h5>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-450">Contact:</span>
                            <span>{selectedOrderDetails.sellerMobile || selectedOrderDetails.mobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">
                              {selectedOrderDetails.sellerAddress || 'N/A'}
                              {selectedOrderDetails.sellerVillage && `, ${selectedOrderDetails.sellerVillage}`}
                              {selectedOrderDetails.sellerPincode && ` - ${selectedOrderDetails.sellerPincode}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Buyer Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Buyer Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.buyerName || 'Gramin Mandi Mumbai'}</h5>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-450">Contact:</span>
                            <span>{selectedOrderDetails.buyerMobile || '+91 99887 11001'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">
                              {selectedOrderDetails.buyerAddress || 'Shop No. 12, Crawford Market, Mumbai'}
                              {selectedOrderDetails.buyerVillage && `, ${selectedOrderDetails.buyerVillage}`}
                              {selectedOrderDetails.buyerPincode && ` - ${selectedOrderDetails.buyerPincode}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SHG Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">SHG Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.shgDetails?.name || 'N/A'}</h5>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Contact:</span>
                            <span>{selectedOrderDetails.shgDetails?.mobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">{selectedOrderDetails.shgDetails?.address || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Schedule:</span>
                            <span>{selectedOrderDetails.shgPickupSchedule || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Transporter Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wider mb-1">Transporter Information</p>
                          <h5 className="font-extrabold text-[#073318] text-base">{selectedOrderDetails.transporterDetails?.name || 'N/A'}</h5>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Contact:</span>
                            <span>{selectedOrderDetails.transporterDetails?.mobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-650 font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-455 shrink-0">Address:</span>
                            <span className="leading-tight">{selectedOrderDetails.transporterDetails?.address || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-650 font-semibold">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-455">Schedule:</span>
                            <span>{selectedOrderDetails.transporterPickupSchedule || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section (Barcode & History) */}
                <div className="space-y-6">
                  {/* Barcode Card */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-4">
                    <h4 className="text-sm font-extrabold text-[#073318] tracking-widest uppercase flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-[#073318]" />
                      Barcode
                    </h4>
                    {selectedOrderDetails.barcode ? (
                      <div className="space-y-3 flex flex-col items-center">
                        {/* Simulated barcode */}
                        <div className="flex items-center gap-[1.5px] h-10 w-full bg-slate-50 border border-slate-100 p-2 rounded-xl justify-center">
                          {Array.from({ length: 40 }).map((_, i) => {
                            const width = (i % 3 === 0) ? 'w-[3px]' : (i % 5 === 0) ? 'w-[1px]' : 'w-[2px]';
                            const bg = (i % 7 === 0) ? 'bg-transparent' : 'bg-slate-900';
                            return <div key={i} className={`h-full ${width} ${bg}`} />;
                          })}
                        </div>
                        <p className="text-xs font-mono font-bold tracking-widest text-slate-700">{selectedOrderDetails.barcode}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                        <span className="text-sm font-bold text-slate-400">N/A</span>
                      </div>
                    )}
                  </div>

                  {/* Order History */}
                  <div className="bg-[#073318] rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-lg min-h-[300px]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-white">
                        <Layers className="h-4 w-4 text-[#B2D534]" />
                        <span className="font-extrabold text-sm uppercase tracking-wider">Order History</span>
                      </div>

                      {/* Stepper history items */}
                      <div className="relative border-l border-white/20 pl-4 space-y-4 ml-2.5 py-1">
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

                    <p className="text-[10px] text-[#B2D534]/70 italic mt-auto pt-4 border-t border-white/10">
                      GMU rural hubs track real-time timestamps cleanly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Inventory Section */}
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
        
        {/* --- QR SCAN MODAL --- */}
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => !isScanning && setIsQrModalOpen(false)}
          title="Scan QR Code for Intake"
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
