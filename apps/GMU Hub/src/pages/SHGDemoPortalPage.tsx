import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { ClipboardList } from 'lucide-react';
import { TimeAgo } from '../components/TimeAgo';

export const SHGDemoPortalPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const {
    pickupNewOrders,
    pickupAssignedOrders,
    dropNewOrders,
    dropAssignedOrders,
    returnPickupNewOrders,
    returnDropNewOrders,
    pickupRejectedOrders,
    dropRejectedOrders,
    pickupRescheduledOrders,
    dropRescheduledOrders,
    returnDropCompletedOrders,
    simulateSHGAction,
    loadPickupNew,
    loadPickupAssigned,
    loadDropNew,
    loadDropAssigned,
    loadReturnsTransporter,
    loadReturnsBuyer,
    loadPickupRejected,
    loadPickupRescheduled,
    loadDropRejected,
    loadDropRescheduled,
    loadDropCompleted,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'pickup-req' | 'pickup-ass' | 'drop-req' | 'drop-ass' | 'ret-pickup-req' | 'ret-pickup-ass' | 'ret-drop-req' | 'ret-drop-ass' | 'rejected' | 'rescheduled'>('pickup-req');

  const [rejectReason, setRejectReason] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionModal, setActionModal] = useState<{ type: 'reject' | 'reschedule'; orderId: string; flow: any } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([
          loadPickupNew(),
          loadPickupAssigned(),
          loadDropNew(),
          loadDropAssigned(),
          loadReturnsTransporter(),
          loadReturnsBuyer(),
          loadPickupRejected(),
          loadPickupRescheduled(),
          loadDropRejected(),
          loadDropRescheduled(),
          loadDropCompleted(),
        ]);
      } catch (e) {
        console.error('Failed to load demo portal data:', e);
      }
    };
    loadAll();
  }, []);

  const handleSimulateAction = async (orderId: string, flow: any, action: any, payload?: any) => {
    setIsProcessing(true);
    try {
      await simulateSHGAction(orderId, flow, action, payload);
      alert(`Simulation action '${action}' completed successfully.`);
    } catch (err: any) {
      alert(err.message || `Failed to execute simulation action '${action}'.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!actionModal) return;
    const { type, orderId, flow } = actionModal;
    if (type === 'reject') {
      await handleSimulateAction(orderId, flow, 'reject', { reason: rejectReason });
    } else {
      await handleSimulateAction(orderId, flow, 'reschedule', { time: rescheduleTime });
    }
    setActionModal(null);
    setRejectReason('');
    setRescheduleTime('');
  };

  const tabs = [
    { id: 'pickup-req', label: 'Pickup Requests' },
    { id: 'pickup-ass', label: 'Assigned Pickups' },
    { id: 'drop-req', label: 'Drop Requests' },
    { id: 'drop-ass', label: 'Assigned Drops' },
    { id: 'ret-pickup-req', label: 'Return Pickup Requests' },
    { id: 'ret-pickup-ass', label: 'Assigned Return Pickups' },
    { id: 'ret-drop-req', label: 'Return Drop Requests' },
    { id: 'ret-drop-ass', label: 'Assigned Return Drops' },
    { id: 'rejected', label: 'Rejected Orders' },
    { id: 'rescheduled', label: 'Rescheduled Orders' },
  ];

  return (
    <Layout currentPage="shg-demo-portal" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-[#073318]" />
            <div>
              <h2 className="text-2xl font-extrabold text-[#073318] tracking-tight">SHG Partner Portal (Simulation)</h2>
              <p className="text-slate-500 text-xs mt-1 font-semibold">Simulate SHG workflows: accept/reject/reschedule/pick/deliver orders.</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                activeTab === t.id
                  ? 'bg-[#073318] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Orders Listing Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-550 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Duration</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Location Details</th>
                  <th className="p-4">Qty / Weight</th>
                  <th className="p-4">SHG Status</th>
                  <th className="p-4">Main Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {/* 1. Pickup Requests */}
                {activeTab === 'pickup-req' && pickupNewOrders.filter(o => o.mainStatus === 'PICKUP_ASSIGNED' && ['pending', 'PENDING'].includes(o.shgStatus)).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Village: {o.sellerVillage}</div>
                      <div className="text-[10px] text-slate-400">Pincode: {o.sellerPincode}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'pickup', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Accept</button>
                      <button disabled={isProcessing} onClick={() => setActionModal({ type: 'reject', orderId: o.id, flow: 'pickup' })} className="px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50">Reject</button>
                      <button disabled={isProcessing} onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'pickup' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer disabled:opacity-50">Reschedule</button>
                    </td>
                  </tr>
                ))}

                {/* 2. Assigned Pickup Orders */}
                {activeTab === 'pickup-ass' && pickupAssignedOrders.filter(o => !(o.mainStatus === 'PICKUP_ASSIGNED' && ['pending', 'PENDING'].includes(o.shgStatus))).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Seller: {o.sellerName}</div>
                      <div className="text-[10px] text-slate-400">{o.sellerAddress}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.shgStatus !== 'picked' && (
                        <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'pickup', 'pick')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Mark Picked</button>
                      )}
                      <button disabled={isProcessing} onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'pickup' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer disabled:opacity-50">Reschedule</button>
                    </td>
                  </tr>
                ))}

                {/* 3. Drop Requests */}
                {activeTab === 'drop-req' && dropNewOrders.filter(o => ['pending', 'PENDING'].includes(o.shgStatus)).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Village: {o.buyerVillage}</div>
                      <div className="text-[10px] text-slate-400">Pincode: {o.buyerPincode}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'drop', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Accept</button>
                      <button disabled={isProcessing} onClick={() => setActionModal({ type: 'reject', orderId: o.id, flow: 'drop' })} className="px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50">Reject</button>
                      <button disabled={isProcessing} onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'drop' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer disabled:opacity-50">Reschedule</button>
                    </td>
                  </tr>
                ))}

                {/* 4. Assigned Drop Orders */}
                {activeTab === 'drop-ass' && dropAssignedOrders.filter(o => ['accepted', 'ACCEPTED'].includes(o.shgStatus)).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Buyer: {o.buyerName}</div>
                      <div className="text-[10px] text-slate-400">{o.buyerAddress}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.shgStatus?.toLowerCase() !== 'delivered' && (
                        <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'drop', 'deliver')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Deliver to Buyer</button>
                      )}
                      <button disabled={isProcessing} onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'drop' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer disabled:opacity-50">Reschedule</button>
                    </td>
                  </tr>
                ))}

                {/* 5. Return Pickup Requests */}
                {activeTab === 'ret-pickup-req' && returnPickupNewOrders.filter(o => ['pending', 'PENDING'].includes(o.shgStatus || '')).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Buyer: {o.buyerName}</div>
                      <div className="text-[10px] text-slate-400">Village: {o.buyerVillage}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {!['accepted', 'picked'].includes(o.shgStatus?.toLowerCase() || '') && (
                        <>
                          <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'return-pickup', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Accept</button>
                          <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'return-pickup', 'reject')} className="px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
 
                {/* 6. Assigned Return Pickup Orders */}
                {activeTab === 'ret-pickup-ass' && returnPickupNewOrders.filter(o => ['accepted', 'picked'].includes(o.shgStatus?.toLowerCase() || '')).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Buyer: {o.buyerName}</div>
                      <div className="text-[10px] text-slate-400">{o.buyerAddress}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.shgStatus !== 'picked' && (
                        <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'return-pickup', 'pick')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Mark Picked</button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* 7. Return Drop Requests */}
                {activeTab === 'ret-drop-req' && returnDropNewOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Buyer: {o.buyerName}</div>
                      <div className="text-[10px] text-slate-400">Village: {o.buyerVillage}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.shgStatus !== 'Accepted' && o.shgStatus !== 'completed' && (
                        <>
                          <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'return-drop', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Accept</button>
                          <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'return-drop', 'reject')} className="px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {/* 8. Assigned Return Drop Orders */}
                {activeTab === 'ret-drop-ass' && returnDropNewOrders.filter(o => o.shgStatus === 'Accepted' || o.shgStatus === 'completed').map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Buyer: {o.buyerName}</div>
                      <div className="text-[10px] text-slate-400">{o.buyerAddress}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.shgStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.shgStatus !== 'completed' && (
                        <button disabled={isProcessing} onClick={() => handleSimulateAction(o.id, 'return-drop', 'return-delivered')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Return Delivered</button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* 9. Rejected Orders */}
                {activeTab === 'rejected' && [...pickupRejectedOrders, ...dropRejectedOrders].map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Reason: {o.rejectionReason}</div>
                      <div className="text-[10px] text-slate-400">Rejected By: {o.rejectedBy}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status="rejected" /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4">-</td>
                  </tr>
                ))}

                {/* 10. Rescheduled Orders */}
                {activeTab === 'rescheduled' && [...pickupRescheduledOrders, ...dropRescheduledOrders].map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">
                      <div>Schedule: {o.shgPickupSchedule || o.transporterPickupSchedule}</div>
                      <div className="text-[10px] text-slate-400">Rescheduled By: {o.rescheduledBy}</div>
                    </td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status="rescheduled" /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for rejection reason or reschedule time */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in duration-200">
            <h3 className="text-lg font-bold text-[#073318] mb-4">
              {actionModal.type === 'reject' ? 'Reject Order Request' : 'Reschedule Order Pickup'}
            </h3>
            {actionModal.type === 'reject' ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rejection Reason</label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#073318] h-24"
                  placeholder="Enter rejection reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Proposed Date & Time</label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#073318]"
                  placeholder="e.g. 2026-06-16 10:00 AM"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                disabled={isProcessing}
                onClick={() => {
                  setActionModal(null);
                  setRejectReason('');
                  setRescheduleTime('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-500 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleActionConfirm}
                className="px-4 py-2 bg-[#073318] text-white rounded-xl text-xs font-extrabold hover:bg-[#073318]/90 cursor-pointer disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
