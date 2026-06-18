import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { TimeAgo } from '../components/TimeAgo';

export const TransporterDemoPortalPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const {
    pickupAssignedOrders,
    dropAssignedOrders,
    returnPickupNewOrders,
    returnDropNewOrders,
    pickupRejectedOrders,
    dropRejectedOrders,
    pickupRescheduledOrders,
    dropRescheduledOrders,
    simulateTransporterAction,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'pickup-req' | 'pickup-ass' | 'drop-req' | 'drop-ass' | 'ret-pickup-req' | 'ret-pickup-ass' | 'ret-drop-req' | 'ret-drop-ass' | 'rejected' | 'rescheduled'>('pickup-req');

  const [rejectReason, setRejectReason] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionModal, setActionModal] = useState<{ type: 'reject' | 'reschedule'; orderId: string; flow: any } | null>(null);

  const tabs = [
    { id: 'pickup-req', label: 'Pickup Requests' },
    { id: 'pickup-ass', label: 'Assigned Pickup' },
    { id: 'drop-req', label: 'Drop Requests' },
    { id: 'drop-ass', label: 'Assigned Drop' },
    { id: 'ret-pickup-req', label: 'Ret Pickup Req' },
    { id: 'ret-pickup-ass', label: 'Ret Pickup Ass' },
    { id: 'ret-drop-req', label: 'Ret Drop Req' },
    { id: 'ret-drop-ass', label: 'Ret Drop Ass' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'rescheduled', label: 'Rescheduled' },
  ];

  const handleActionSubmit = () => {
    if (!actionModal) return;
    if (actionModal.type === 'reject') {
      simulateTransporterAction(actionModal.orderId, actionModal.flow, 'reject', { rejectionReason: rejectReason });
      setRejectReason('');
    } else {
      simulateTransporterAction(actionModal.orderId, actionModal.flow, 'reschedule', { newSchedule: rescheduleTime });
      setRescheduleTime('');
    }
    setActionModal(null);
  };

  return (
    <Layout currentPage="transporter-demo-portal" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
          <h2 className="text-xl font-bold text-[#073318]">Transporter Demo Portal (Temporary)</h2>
          <p className="text-xs text-slate-500 mt-1">Simulate transporter driver actions for pickups, drops, and returns operations.</p>
        </div>

        {/* Tab Row */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#073318] text-white'
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
                  <th className="p-4">Route Info</th>
                  <th className="p-4">Qty / Weight</th>
                  <th className="p-4">Transporter Status</th>
                  <th className="p-4">Main Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {/* 1. Pickup Requests */}
                {activeTab === 'pickup-req' && pickupAssignedOrders.filter(o => o.shgStatus === 'picked' && o.transporterStatus === 'pending').map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: {o.sellerVillage} to Hub</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      <button onClick={() => simulateTransporterAction(o.id, 'pickup', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Accept</button>
                      <button onClick={() => setActionModal({ type: 'reject', orderId: o.id, flow: 'pickup' })} className="px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-750 cursor-pointer">Reject</button>
                      <button onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'pickup' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer">Reschedule</button>
                    </td>
                  </tr>
                ))}

                {/* 2. Assigned Pickup Orders */}
                {activeTab === 'pickup-ass' && pickupAssignedOrders.filter(o => o.transporterStatus !== 'pending').map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: {o.sellerVillage} to Hub</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.transporterStatus !== 'in transit to hub' && (
                        <button onClick={() => simulateTransporterAction(o.id, 'pickup', 'transit')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Mark In Transit</button>
                      )}
                      <button onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'pickup' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer">Reschedule</button>
                    </td>
                  </tr>
                ))}

                {/* 3. Drop Requests */}
                {activeTab === 'drop-req' && dropAssignedOrders.filter(o => (o.shgStatus === 'Accepted' || o.shgStatus === 'ACCEPTED') && (o.transporterStatus === 'pending' || o.transporterStatus === 'DROP_ASSIGNED')).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: Hub to {o.buyerVillage}</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      <button onClick={() => simulateTransporterAction(o.id, 'drop', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Accept</button>
                      <button onClick={() => setActionModal({ type: 'reject', orderId: o.id, flow: 'drop' })} className="px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-750 cursor-pointer">Reject</button>
                      <button onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'drop' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer">Reschedule</button>
                    </td>
                  </tr>
                ))}

                 {/* 4. Assigned Drop Orders */}
                {activeTab === 'drop-ass' && dropAssignedOrders.filter(o => o.transporterStatus !== 'pending' && o.transporterStatus !== 'DROP_ASSIGNED').map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: Hub to {o.buyerVillage}</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.transporterStatus !== 'parcel at drop shg' && (
                        <>
                          <button onClick={() => simulateTransporterAction(o.id, 'drop', 'delivered-shg')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Deliver to SHG</button>
                          <button onClick={() => simulateTransporterAction(o.id, 'drop', 'shg-not-available')} className="px-2.5 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer font-bold">SHG NOT AVAILABLE</button>
                          <button onClick={() => setActionModal({ type: 'reject', orderId: o.id, flow: 'drop' })} className="px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-750 cursor-pointer">Reject</button>
                        </>
                      )}
                      <button onClick={() => setActionModal({ type: 'reschedule', orderId: o.id, flow: 'drop' })} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer">Reschedule</button>
                    </td>
                  </tr>
                ))}

                {/* 5. Return Pickup Requests */}
                {activeTab === 'ret-pickup-req' && returnPickupNewOrders.filter(o => (o.shgStatus === 'RETURN_PICKED_BY_SHG' || o.shgStatus === 'picked') && o.transporterStatus === 'pending').map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: {o.buyerVillage} to Hub</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      <button onClick={() => simulateTransporterAction(o.id, 'return-pickup', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Accept</button>
                    </td>
                  </tr>
                ))}

                {/* 6. Assigned Return Pickup Orders */}
                {activeTab === 'ret-pickup-ass' && returnPickupNewOrders.filter(o => (o.shgStatus === 'RETURN_PICKED_BY_SHG' || o.shgStatus === 'picked') && (o.transporterStatus === 'TRANSPORTER_ACCEPTED' || o.transporterStatus === 'IN_TRANSIT_TO_GMU' || o.transporterStatus === 'Accepted' || o.transporterStatus === 'in transit to hub')).map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: {o.buyerVillage} to Hub</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {(o.transporterStatus === 'TRANSPORTER_ACCEPTED' || o.transporterStatus === 'Accepted') && (
                        <button onClick={() => simulateTransporterAction(o.id, 'return-pickup', 'transit')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Mark In Transit</button>
                      )}
                      {(o.transporterStatus === 'IN_TRANSIT_TO_GMU' || o.transporterStatus === 'in transit to hub') && (
                        <button onClick={() => simulateTransporterAction(o.id, 'return-pickup', 'deliver-to-gmu')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer font-bold">Deliver to GMU</button>
                      )}
                    </td>
                  </tr>
                ))}

                 {/* 7. Return Drop Requests */}
                {activeTab === 'ret-drop-req' && returnDropNewOrders.filter(o => (o.shgStatus === 'Accepted' || o.shgStatus === 'SHG Not Available') && o.transporterStatus !== 'Accepted' && o.transporterStatus !== 'parcel at drop shg' && o.shgStatus !== 'Return Drop Initiated' && o.shgStatus !== 'SHG NOT AVAILABLE' && o.transporterStatus !== 'RETURNED_TO_GMU').map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: Hub to {o.buyerVillage}</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      <button onClick={() => simulateTransporterAction(o.id, 'return-drop', 'accept')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Accept</button>
                    </td>
                  </tr>
                ))}

                {/* 8. Assigned Return Drop Orders */}
                {activeTab === 'ret-drop-ass' && returnDropNewOrders.filter(o => o.shgStatus === 'SHG NOT AVAILABLE' || ((o.shgStatus === 'Accepted' || o.shgStatus === 'SHG Not Available') && (o.transporterStatus === 'Accepted' || o.transporterStatus === 'parcel at drop shg')) || o.shgStatus === 'Return Drop Initiated').map((o) => (
                  <tr key={o.id}>
                    <td className="p-4"><TimeAgo sectionEnteredAt={o.sectionEnteredAt} /></td>
                    <td className="p-4 font-bold text-[#073318]">{o.id}</td>
                    <td className="p-4">Route: Hub to {o.buyerVillage}</td>
                    <td className="p-4">{o.totalQty} units / {o.totalWeight}kg</td>
                    <td className="p-4"><StatusBadge status={o.transporterStatus} /></td>
                    <td className="p-4"><StatusBadge status={o.mainStatus} /></td>
                    <td className="p-4 space-x-2">
                      {o.shgStatus === 'SHG NOT AVAILABLE' ? (
                        <button onClick={() => simulateTransporterAction(o.id, 'return-drop', 'return-to-gmu')} className="px-2.5 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer font-bold">RETURN_TO_GMU</button>
                      ) : o.shgStatus === 'Return Drop Initiated' ? (
                        <button onClick={() => simulateTransporterAction(o.id, 'return-drop', 'drop-to-gmu')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">Drop To GMU</button>
                      ) : (
                        o.transporterStatus !== 'parcel at drop shg' && (
                          <button onClick={() => simulateTransporterAction(o.id, 'return-drop', 'delivered-shg')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer">
                            {(o.shgStatus === 'SHG Not Available' || o.shgStatus === 'SHG NOT AVAILABLE') ? 'Deliver to GMU' : 'Mark Delivered to SHG'}
                          </button>
                        )
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

      {/* Action Dialog Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl text-left">
            <h3 className="font-bold text-sm text-[#073318] uppercase tracking-wider mb-4">
              {actionModal.type === 'reject' ? 'Reject Order Request' : 'Reschedule Pickup'}
            </h3>
            {actionModal.type === 'reject' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Provide the specific reason for rejecting this order request.</p>
                <input
                  type="text"
                  placeholder="Reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Select new reschedule date and time slot details.</p>
                <input
                  type="text"
                  placeholder="e.g. 2026-06-18 02:00 PM"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none"
                />
              </div>
            )}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setActionModal(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase cursor-pointer">Cancel</button>
              <button onClick={handleActionSubmit} className="flex-1 py-2 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl font-bold text-xs uppercase cursor-pointer">Submit</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
