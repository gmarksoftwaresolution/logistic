import { useState } from 'react';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { TransporterProfile } from '../context/AppContext';
import { Eye, Plus, Truck, User, MapPin, Building, FileText, CheckCircle2, MoreVertical } from 'lucide-react';

export const TransporterManagementPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { transporterList, approveTransporter, addNewTransporter } = useAppContext();

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<TransporterProfile | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for new Transporter
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [newStatus, setNewStatus] = useState('Available');

  const handleViewProfile = (t: TransporterProfile) => {
    setSelectedTransporter(t);
    setIsViewModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addNewTransporter({
      name: newName,
      mobile: newMobile,
      address: newAddress,
      vehicle: newVehicle,
      route: newRoute,
      status: newStatus,
    });
    // Reset form
    setNewName('');
    setNewMobile('');
    setNewAddress('');
    setNewVehicle('');
    setNewRoute('');
    setNewStatus('Available');
    setIsAddModalOpen(false);
  };

  const getActionButtons = (row: TransporterProfile) => {
    const canActivate = row.status === 'Inactive';

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
                  handleViewProfile(row);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#073318]/5 hover:text-[#073318] rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-slate-400" />
                <span>View Details</span>
              </button>

              {canActivate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    approveTransporter(row.id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#073318] hover:bg-[#B2D534]/20 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#073318]/70" />
                  <span>Activate Partner</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // --- COLUMN SCHEMAS ---
  const columns = [
    {
      header: 'Transporter Name',
      accessor: (row: TransporterProfile) => (
        <div>
          <div className="font-bold text-[#073318]">{row.name}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{row.id}</div>
        </div>
      ),
      sortKey: 'name',
    },
    { header: 'Mobile Number', accessor: 'mobile' as keyof TransporterProfile },
    { header: 'Address', accessor: 'address' as keyof TransporterProfile },
    { header: 'Vehicle Type', accessor: 'vehicle' as keyof TransporterProfile },
    { header: 'Route Assignment', accessor: 'route' as keyof TransporterProfile },
    { header: 'Assigned Orders', accessor: 'assignedOrders' as keyof TransporterProfile },
    { header: 'Status', accessor: (row: TransporterProfile) => <StatusBadge status={row.status} /> },
    { header: 'Action', accessor: (row: TransporterProfile) => getActionButtons(row) },
  ];

  return (
    <Layout currentPage="transporter-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#B2D534]/30 to-[#B2D534]/10 p-3.5 rounded-2xl border border-[#B2D534]/40 shadow-sm">
              <Truck className="h-7 w-7 text-[#073318]" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Transporter Management</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Review profiles, route assignments, and manage logistics partners.</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Transporter</span>
          </button>
        </div>

        {/* Data Table */}
        <DataTable columns={columns} data={transporterList} statusFilterField="status" />

        {/* --- ADD TRANSPORTER MODAL --- */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Register New Transporter Partner"
          variant="modal"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Transporter Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Logistics"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="98xxxxxx11"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Vehicle Category</label>
                <select
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                >
                  <option value="">-- Select Category --</option>
                  <option value="Mini Truck">Mini Truck (Chota Hathi)</option>
                  <option value="Pickup Truck">Pickup Truck (Bolero Camper)</option>
                  <option value="Heavy Truck">Heavy Cargo Truck</option>
                  <option value="Tempo Traveler">Tempo Cargo Traveler</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Route Assignment</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune-Satara"
                  value={newRoute}
                  onChange={(e) => setNewRoute(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Initial Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
              >
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Office / Garage Address</label>
              <textarea
                required
                rows={2}
                placeholder="MIDC Area, Office Address details..."
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50 resize-none"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-2xl font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                Register Transporter
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* --- VIEW TRANSPORTER PROFILE DRAWER --- */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Transporter Profile: ${selectedTransporter?.name || ''}`}
          variant="drawer"
        >
          {selectedTransporter && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Availability Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedTransporter.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Assigned Orders</p>
                  <p className="text-lg font-bold text-[#073318] mt-1">{selectedTransporter.assignedOrders} Orders</p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h4 className="font-bold text-sm text-[#073318] mb-4 flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-[#B2D534]" />
                  <span>Representative Information</span>
                </h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold uppercase mb-1">Transporter Name</p>
                    <p className="font-bold text-slate-800">{selectedTransporter.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase mb-1">Mobile Contact</p>
                    <p className="font-bold text-slate-800">{selectedTransporter.mobile}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 font-semibold uppercase mb-1">Office Address</p>
                    <p className="font-medium text-slate-700 flex items-start gap-1">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                      <span>{selectedTransporter.address}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle & route details */}
              <div className="bg-[#073318] rounded-2xl p-6 shadow-lg text-white">
                <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <Truck className="h-4.5 w-4.5 text-[#B2D534]" />
                  <span>Vehicle & Route Assignment</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md">
                    <p className="text-slate-300 font-semibold uppercase text-[10px] mb-1 tracking-wider">Vehicle Classification</p>
                    <p className="font-bold text-lg text-[#B2D534]">{selectedTransporter.vehicle}</p>
                    <p className="text-[10px] text-slate-300 mt-2">Cap: 3000kg • Fully Insured</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md">
                    <p className="text-slate-300 font-semibold uppercase text-[10px] mb-1 tracking-wider">Assigned Route</p>
                    <p className="font-bold text-lg text-white">{selectedTransporter.route}</p>
                    <p className="text-[10px] text-slate-300 mt-2">Hours: 08:00 AM - 18:00 PM</p>
                  </div>
                </div>
              </div>

              {/* License and RC documentations verification */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h4 className="font-bold text-sm text-[#073318] mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#B2D534]" />
                  <span>Logistics Documentation & Verification</span>
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-650">
                    <p className="font-semibold text-[#073318] mb-1">Driver License</p>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-650">
                    <p className="font-semibold text-[#073318] mb-1">Vehicle RC Book</p>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-650">
                    <p className="font-semibold text-[#073318] mb-1">Road Insurance</p>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
