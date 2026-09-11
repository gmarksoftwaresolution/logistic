import React, { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { Search, Printer, QrCode, RefreshCw, X, Package, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface PageProps {
  onNavigate: (page: string) => void;
}

export const LabelSearchReprintPage = ({ onNavigate }: PageProps) => {
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
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Combine all orders from AppContext for search lookup
  const allOrders = useMemo(() => {
    const map = new Map<string, any>();
    const list = [
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
    ];

    list.forEach((o: any) => {
      const key = String(o.id || o.uuid || o.orderId || '');
      if (key && !map.has(key)) {
        map.set(key, o);
      }
    });

    return Array.from(map.values());
  }, [
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
  ]);

  // Search filter
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    return allOrders.filter((order: any) => {
      const id = String(order.id || '').toLowerCase();
      const uuid = String(order.uuid || '').toLowerCase();
      const orderId = String(order.orderId || '').toLowerCase();
      const barcode = String(order.barcode || '').toLowerCase();
      const seller = String(order.sellerName || order.shgDetails?.name || '').toLowerCase();
      const buyer = String(order.buyerName || order.buyerDetails?.name || '').toLowerCase();
      const sellerPhone = String(order.sellerMobile || order.shgDetails?.mobile || '');
      const buyerPhone = String(order.buyerMobile || order.buyerDetails?.mobile || '');

      return (
        id.includes(term) ||
        uuid.includes(term) ||
        orderId.includes(term) ||
        barcode.includes(term) ||
        seller.includes(term) ||
        buyer.includes(term) ||
        sellerPhone.includes(term) ||
        buyerPhone.includes(term)
      );
    });
  }, [searchTerm, allOrders]);

  const handlePrint = () => {
    window.print();
  };

  const currentOrderForLabel = selectedOrder || (searchResults.length > 0 ? searchResults[0] : null);

  return (
    <Layout currentPage="label-search-reprint" onNavigate={onNavigate}>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#073318] flex items-center gap-2">
            <Printer className="h-7 w-7 text-[#073318]" />
            Label Search & Reprint
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Search order by ID, barcode, or customer details to reprint shipping labels.
          </p>
        </div>
      </div>

      {/* Main Search Container */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Bar Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-md">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-6 w-6 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedOrder(null);
              }}
              placeholder="Search by Order ID, Barcode, Phone, Seller, or Buyer name..."
              className="w-full pl-13 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-lg placeholder-slate-400 focus:outline-none focus:border-[#073318] focus:bg-white transition-all shadow-inner"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedOrder(null);
                }}
                className="absolute right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Clear Search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Quick Suggestions / Helper Tags */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-600">Sample Searches:</span>
            {allOrders.slice(0, 3).map((o, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchTerm(String(o.id || o.orderId || o.uuid));
                  setSelectedOrder(o);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#073318]/10 hover:text-[#073318] rounded-md font-mono text-slate-700 transition-colors"
              >
                #{o.id || o.orderId || o.uuid}
              </button>
            ))}
          </div>
        </div>

        {/* Results / Label Section */}
        {searchTerm.trim() === '' ? (
          <div className="bg-white/80 rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <div className="h-16 w-16 bg-[#073318]/10 text-[#073318] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Search to Preview & Reprint Shipping Label</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Type an Order ID or scan a parcel barcode into the search bar above to view and print its label.
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Matching Order Found</h3>
            <p className="text-sm text-slate-500 mt-1">
              No orders matched "{searchTerm}". Please verify the Order ID or Barcode and try again.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Multiple Results Switcher */}
            {searchResults.length > 1 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Found {searchResults.length} Matching Orders - Select one to view label:
                </p>
                <div className="flex flex-wrap gap-2">
                  {searchResults.map((ord) => {
                    const isSelected = (currentOrderForLabel?.id === ord.id);
                    return (
                      <button
                        key={ord.id || ord.uuid}
                        onClick={() => setSelectedOrder(ord)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-[#073318] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Order #{ord.id || ord.orderId}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Label Card & Print Layout */}
            {currentOrderForLabel && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                {/* Action Toolbar */}
                <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#B2D534]" />
                    <span className="font-bold text-base">
                      Shipping Label - Order #{currentOrderForLabel.id || currentOrderForLabel.orderId}
                    </span>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="px-5 py-2 bg-[#B2D534] hover:bg-[#a1c22e] text-[#073318] font-bold rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Printer className="h-5 w-5" />
                    Print Label
                  </button>
                </div>

                {/* Shipping Label Render (Thermal/Standard format) */}
                <div className="p-8 max-w-2xl mx-auto" id="printable-label">
                  <div className="border-4 border-slate-900 rounded-xl p-6 bg-white space-y-6 text-slate-900 font-sans">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                      <div>
                        <h1 className="text-xl font-black tracking-wider text-slate-900 uppercase">
                          GMU LOGISTICS HUB
                        </h1>
                        <p className="text-xs font-semibold text-slate-600">Standard Shipping Manifest</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs uppercase font-bold bg-slate-900 text-white px-3 py-1 rounded">
                          {currentOrderForLabel.mainStatus || 'SHIPMENT'}
                        </span>
                      </div>
                    </div>

                    {/* Barcode & Order Number */}
                    <div className="text-center py-3 bg-slate-50 border-2 border-dashed border-slate-400 rounded-lg">
                      <div className="font-mono text-3xl font-black tracking-widest text-slate-900">
                        *{currentOrderForLabel.id || currentOrderForLabel.orderId || 'ORD-1001'}*
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        BARCODE: {currentOrderForLabel.barcode || `BAR-${currentOrderForLabel.id || '1001'}`}
                      </p>
                    </div>

                    {/* Addresses */}
                    <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-900 pb-4">
                      {/* From / Seller */}
                      <div className="border-r border-slate-300 pr-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          FROM (SHIPPER):
                        </span>
                        <p className="font-bold text-sm text-slate-900">
                          {currentOrderForLabel.sellerName || currentOrderForLabel.shgDetails?.name || 'SHG Seller Partner'}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {currentOrderForLabel.sellerAddress || currentOrderForLabel.shgDetails?.address || 'Gadhinglaj GMU Hub Area'}
                        </p>
                        <p className="text-xs font-mono text-slate-700 mt-1">
                          📞 {currentOrderForLabel.sellerMobile || currentOrderForLabel.shgDetails?.mobile || 'N/A'}
                        </p>
                      </div>

                      {/* To / Buyer */}
                      <div className="pl-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          TO (CONSIGNEE):
                        </span>
                        <p className="font-bold text-sm text-slate-900">
                          {currentOrderForLabel.buyerName || currentOrderForLabel.buyerDetails?.name || 'Customer / Buyer'}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {currentOrderForLabel.buyerAddress || currentOrderForLabel.buyerDetails?.address || 'Destination Address'}
                        </p>
                        <p className="text-xs font-mono text-slate-700 mt-1">
                          📞 {currentOrderForLabel.buyerMobile || currentOrderForLabel.buyerDetails?.mobile || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Order Meta / Weight / Date */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                      <div className="bg-slate-100 p-2 rounded border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase">Weight</span>
                        <span className="font-bold text-slate-900">{currentOrderForLabel.totalWeight || '1.5'} kg</span>
                      </div>
                      <div className="bg-slate-100 p-2 rounded border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase">Items</span>
                        <span className="font-bold text-slate-900">{currentOrderForLabel.totalQty || '1'} Units</span>
                      </div>
                      <div className="bg-slate-100 p-2 rounded border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase">Date</span>
                        <span className="font-bold text-slate-900">
                          {currentOrderForLabel.orderDate ? String(currentOrderForLabel.orderDate).slice(0, 10) : new Date().toISOString().slice(0, 10)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Warning */}
                    <div className="text-[10px] text-center text-slate-500 border-t border-slate-200 pt-2 font-mono">
                      GMU HUB LOGISTICS • OFFICIAL MANIFEST LABEL • REPRINT COPIES AUTHORIZED
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
