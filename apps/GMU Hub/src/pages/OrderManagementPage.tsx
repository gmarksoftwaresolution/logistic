import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Tabs } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { PickupOrder, DropOrder, ReturnOrder } from '../context/AppContext';
import { Eye, ShieldAlert, Barcode, ClipboardCheck, CheckCircle2, Copy, X, FileText, MoreVertical, Phone, MapPin, Calendar, Truck, Clock, Package, Layers } from 'lucide-react';

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
    generateOTP,
    generateBarcode,
    shgList,
    transporterList,
    assignPickupOrder,
  } = useAppContext();

  // Top level tabs: Pickup | Drop | Return
  const [activeTopTab, setActiveTopTab] = useState<'pickup' | 'drop' | 'return'>('pickup');

  // Sub-tabs configurations
  const [activePickupSubTab, setActivePickupSubTab] = useState('new');
  const [activeDropSubTab, setActiveDropSubTab] = useState('new');
  const [activeReturnType, setActiveReturnType] = useState<'pickup' | 'drop'>('pickup');
  const [activeReturnSubTab, setActiveReturnSubTab] = useState<'new' | 'completed'>('new');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Multi-select state
  const [selectedAssignedOrderIds, setSelectedAssignedOrderIds] = useState<string[]>([]);
  const [selectedWarehouseOrderIds, setSelectedWarehouseOrderIds] = useState<string[]>([]);

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeOrder, setIntakeOrder] = useState<{ id: string; qty: number; weight: number } | null>(null);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [generatedBarcodeText, setGeneratedBarcodeText] = useState<string | null>(null);
  const [barcodeOrderId, setBarcodeOrderId] = useState<string | null>(null);
  const [barcodeOrder, setBarcodeOrder] = useState<any>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [selectedSHG, setSelectedSHG] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState('');

  // Handle View Action
  const handleViewOrder = (order: any) => {
    setSelectedOrderDetails(order);
    setIsViewModalOpen(true);
  };

  // Handle Intake Action
  const handleIntakeClick = (order: any) => {
    setIntakeOrder({
      id: order.id,
      qty: order.totalQty,
      weight: order.totalWeight,
    });
    setGeneratedOTP(null);
    setIsIntakeModalOpen(true);
  };

  // Handle OTP Generation
  const handleGenerateOTP = () => {
    if (intakeOrder) {
      const otp = generateOTP(intakeOrder.id);
      setGeneratedOTP(otp);
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
    const hasIntake = (type === 'pickup' && subTab === 'assigned') || (type === 'return' && subTab === 'assigned');
    const hasWarehouse = type === 'pickup' && subTab === 'warehouse';

    return (
      <div className="relative inline-block text-left">
        <button
          onClick={(e) => {
            e.stopPropagation();
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
            <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
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

              {hasIntake && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    handleIntakeClick(row);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#073318] hover:bg-[#B2D534]/20 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                >
                  <ClipboardCheck className="h-4 w-4 text-[#073318]/70" />
                  <span>Intake Order</span>
                </button>
              )}

              {hasWarehouse && (
                <>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionMenu(null);
                      readyToStore(row.id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500/70" />
                    <span>Ready to Store</span>
                  </button>
                </>
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
    { header: 'SHG Pickup Schedule', accessor: 'shgPickupSchedule' as keyof PickupOrder },
    { header: 'Transporter Name', accessor: (row: PickupOrder) => row.transporterDetails?.name || '-', sortKey: 'transporterName' },
    { header: 'Transporter Mobile', accessor: (row: PickupOrder) => row.transporterDetails?.mobile || '-', sortKey: 'transporterMobile' },
    { header: 'Transporter Pickup Schedule', accessor: 'transporterPickupSchedule' as keyof PickupOrder },
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
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedAssignedOrderIds((prev) => [...prev, row.id]);
            } else {
              setSelectedAssignedOrderIds((prev) => prev.filter((id) => id !== row.id));
            }
          }}
          className="h-4 w-4 text-[#073318] focus:ring-[#073318] border-slate-300 rounded cursor-pointer"
        />
      ),
    },
    ...pickupAssignedColumns,
  ];

  // Pickup: Warehouse
  const pickupWarehouseColumns = [
    { header: 'Order ID', accessor: 'id' as keyof PickupOrder },
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
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignOrderId && selectedSHG && selectedTransporter) {
      assignPickupOrder(assignOrderId, selectedSHG, selectedTransporter);
      setIsAssignModalOpen(false);
      setSelectedSHG('');
      setSelectedTransporter('');
      setAssignOrderId(null);
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
                { id: 'new', label: 'New Orders', count: pickupNewOrders.length },
                { id: 'assigned', label: 'Assigned Orders', count: pickupAssignedOrders.length },
                { id: 'warehouse', label: 'Warehouse Orders', count: pickupWarehouseOrders.length },
                { id: 'rejected', label: 'Rejected Orders', count: pickupRejectedOrders.length },
                { id: 'reschedule', label: 'Rescheduled Orders', count: pickupRescheduledOrders.length },
              ]}
            />
            {activePickupSubTab === 'new' && (
              <DataTable columns={pickupNewColumns} data={pickupNewOrders} statusFilterField="status" />
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
                        });
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
                <DataTable columns={pickupAssignedColumnsWithSelection} data={pickupAssignedOrders} statusFilterField="status" />
              </div>
            )}
            {activePickupSubTab === 'warehouse' && (
              <div className="space-y-3">
                {selectedWarehouseOrderIds.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        selectedWarehouseOrderIds.forEach((id) => readyToStore(id));
                        setSelectedWarehouseOrderIds([]);
                      }}
                      className="px-4 py-2.5 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Ready to Store Selected ({selectedWarehouseOrderIds.length})
                    </button>
                  </div>
                )}
                <DataTable columns={pickupWarehouseColumnsWithSelection} data={pickupWarehouseOrders} statusFilterField="status" />
              </div>
            )}
            {activePickupSubTab === 'rejected' && (
              <DataTable columns={pickupRejectedColumns} data={pickupRejectedOrders} statusFilterField="status" />
            )}
            {activePickupSubTab === 'reschedule' && (
              <DataTable columns={pickupRescheduledColumns} data={pickupRescheduledOrders} statusFilterField="status" />
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
                { id: 'new', label: 'New Orders', count: dropNewOrders.length },
                { id: 'assigned', label: 'Assigned Orders', count: dropAssignedOrders.length },
                { id: 'rejected', label: 'Rejected Orders', count: dropRejectedOrders.length },
                { id: 'reschedule', label: 'Reschedule Options', count: dropRescheduledOrders.length },
                { id: 'completed', label: 'Completed Orders', count: dropCompletedOrders.length },
              ]}
            />
            {activeDropSubTab === 'new' && (
              <DataTable columns={dropNewColumns} data={dropNewOrders} />
            )}
            {activeDropSubTab === 'assigned' && (
              <DataTable columns={dropAssignedColumns} data={dropAssignedOrders} />
            )}
            {activeDropSubTab === 'rejected' && (
              <DataTable columns={dropRejectedColumns} data={dropRejectedOrders} />
            )}
            {activeDropSubTab === 'reschedule' && (
              <DataTable columns={dropRescheduledColumns} data={dropRescheduledOrders} />
            )}
            {activeDropSubTab === 'completed' && (
              <DataTable columns={dropCompletedColumns} data={dropCompletedOrders} />
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
                { id: 'pickup', label: 'Return Pickup', count: returnPickupNewOrders.length + returnPickupCompletedOrders.length },
                { id: 'drop', label: 'Return Drop', count: returnDropNewOrders.length + returnDropCompletedOrders.length },
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
              <DataTable columns={returnPickupNewColumns} data={returnPickupNewOrders} statusFilterField="status" />
            )}
            {activeReturnType === 'pickup' && activeReturnSubTab === 'completed' && (
              <DataTable columns={returnPickupCompletedColumns} data={returnPickupCompletedOrders} statusFilterField="status" />
            )}
            {activeReturnType === 'drop' && activeReturnSubTab === 'new' && (
              <DataTable columns={returnDropNewColumns} data={returnDropNewOrders} statusFilterField="status" />
            )}
            {activeReturnType === 'drop' && activeReturnSubTab === 'completed' && (
              <DataTable columns={returnDropCompletedColumns} data={returnDropCompletedOrders} statusFilterField="status" />
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
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold uppercase">Order ID</span>
                  <span className="font-bold text-[#073318]">{intakeOrder.id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold uppercase">Total Quantity</span>
                  <span className="font-bold text-slate-800">{intakeOrder.qty} units</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold uppercase">Total Weight</span>
                  <span className="font-bold text-slate-800">{intakeOrder.weight} kg</span>
                </div>
              </div>

              {!generatedOTP ? (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-slate-500">
                    Press the button below to generate a secure One-Time PIN for verification handover.
                  </p>
                  <button
                    onClick={handleGenerateOTP}
                    className="w-full py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer"
                  >
                    Generate OTP
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 bg-[#B2D534]/10 border border-[#B2D534]/50 rounded-2xl text-center space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-[#073318] font-extrabold">Generated Passcode</p>
                    <p className="text-4xl font-extrabold text-[#073318] tracking-widest">{generatedOTP}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedOTP || '');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy OTP
                    </button>
                    <button
                      onClick={() => setIsIntakeModalOpen(false)}
                      className="px-4 py-2 bg-[#073318] text-white hover:bg-[#073318]/95 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Complete Handover
                    </button>
                  </div>
                </div>
              )}
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
                  onClick={() => {
                    if (barcodeOrderId) {
                      const code = generateBarcode(barcodeOrderId);
                      setGeneratedBarcodeText(code);
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
                            MEDIUM
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
                        <div className="relative">
                          <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                          <p className="text-xs font-black text-[#B2D534]">{selectedOrderDetails.created_at ? selectedOrderDetails.created_at.split(' ').pop() : '08:30 AM'}</p>
                          <p className="text-xs font-semibold text-slate-200 mt-0.5">Order Created</p>
                        </div>
                        {selectedOrderDetails.shgDetails && (
                          <div className="relative">
                            <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                            <p className="text-xs font-black text-[#B2D534]">10:15 AM</p>
                            <p className="text-xs font-semibold text-slate-200 mt-0.5">Assigned to SHG: {selectedOrderDetails.shgDetails.name}</p>
                          </div>
                        )}
                        {selectedOrderDetails.transporterDetails && (
                          <div className="relative">
                            <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                            <p className="text-xs font-black text-[#B2D534]">11:30 AM</p>
                            <p className="text-xs font-semibold text-slate-200 mt-0.5">Transporter Accepted: {selectedOrderDetails.transporterDetails.name}</p>
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
                      <tr>
                        <td className="px-5 py-4 font-bold text-slate-800">Organic Honey</td>
                        <td className="px-5 py-4">25 Jars</td>
                        <td className="px-5 py-4">100 kg</td>
                        <td className="px-5 py-4">
                          <span className="bg-blue-50 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                            FOOD
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-[#073318]">₹450</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-4 font-bold text-slate-800">Sunflower Oil</td>
                        <td className="px-5 py-4">15 Cans</td>
                        <td className="px-5 py-4">60 kg</td>
                        <td className="px-5 py-4">
                          <span className="bg-blue-50 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                            FOOD
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-[#073318]">₹200</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
