import { useState } from 'react';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import type { SHGProfile } from '../context/AppContext';
import { Eye, Plus, Users, User, MapPin, Store, Building2, FileText, CheckCircle2, MoreVertical } from 'lucide-react';

export const SHGManagementPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { shgList, approveSHG, addNewSHG } = useAppContext();

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSHG, setSelectedSHG] = useState<SHGProfile | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for new SHG
  const [newName, setNewName] = useState('');
  const [newLeader, setNewLeader] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newMembers, setNewMembers] = useState(10);
  const [newStatus, setNewStatus] = useState('Active');

  const handleViewProfile = (shg: SHGProfile) => {
    setSelectedSHG(shg);
    setIsViewModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addNewSHG({
      name: newName,
      leader: newLeader,
      mobile: newMobile,
      address: newAddress,
      members: newMembers,
      status: newStatus,
    });
    // Reset form
    setNewName('');
    setNewLeader('');
    setNewMobile('');
    setNewAddress('');
    setNewMembers(10);
    setNewStatus('Active');
    setIsAddModalOpen(false);
  };

  const getActionButtons = (row: SHGProfile) => {
    const canApprove = row.status !== 'Active';

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

              {canApprove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenu(null);
                    approveSHG(row.id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#073318] hover:bg-[#B2D534]/20 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#073318]/70" />
                  <span>Approve SHG</span>
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
      header: 'SHG Name',
      accessor: (row: SHGProfile) => (
        <div>
          <div className="font-bold text-[#073318]">{row.name}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{row.id}</div>
        </div>
      ),
      sortKey: 'name',
    },
    { header: 'Leader Name', accessor: 'leader' as keyof SHGProfile },
    { header: 'Mobile Number', accessor: 'mobile' as keyof SHGProfile },
    { header: 'Address', accessor: 'address' as keyof SHGProfile },
    { header: 'Members Count', accessor: 'members' as keyof SHGProfile },
    { header: 'Assigned Orders', accessor: 'assignedOrders' as keyof SHGProfile },
    { header: 'Status', accessor: (row: SHGProfile) => <StatusBadge status={row.status} /> },
    { header: 'Action', accessor: (row: SHGProfile) => getActionButtons(row) },
  ];

  return (
    <Layout currentPage="shg-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#B2D534]/30 to-[#B2D534]/10 p-3.5 rounded-2xl border border-[#B2D534]/40 shadow-sm">
              <Users className="h-7 w-7 text-[#073318]" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">SHG Management</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Review profiles, assign orders, and approve Self-Help Groups.</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#073318] hover:bg-[#073318]/90 text-white rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add New SHG</span>
          </button>
        </div>

        {/* Data Table */}
        <DataTable columns={columns} data={shgList} statusFilterField="status" />

        {/* --- ADD SHG MODAL --- */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Register New Self-Help Group (SHG)"
          variant="modal"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">SHG Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Krishi Pragati SHG"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Leader / Representative</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kavita Jadhav"
                  value={newLeader}
                  onChange={(e) => setNewLeader(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="98xxxxxx00"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Total Group Members</label>
                <input
                  type="number"
                  min="2"
                  value={newMembers}
                  onChange={(e) => setNewMembers(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#073318]/50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending Approval">Pending Approval</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">Complete Address</label>
              <textarea
                required
                rows={2}
                placeholder="Village, Taluka, Block details..."
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
                Register SHG
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

        {/* --- VIEW SHG PROFILE DRAWER --- */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`SHG Partner Profile: ${selectedSHG?.name || ''}`}
          variant="drawer"
        >
          {selectedSHG && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Verification Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedSHG.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Total Members</p>
                  <p className="text-lg font-bold text-[#073318] mt-1">{selectedSHG.members} Members</p>
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
                    <p className="text-slate-400 font-semibold uppercase mb-1">Leader Name</p>
                    <p className="font-bold text-slate-800">{selectedSHG.leader}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase mb-1">Mobile Contact</p>
                    <p className="font-bold text-slate-800">{selectedSHG.mobile}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 font-semibold uppercase mb-1">Assigned Address</p>
                    <p className="font-medium text-slate-700 flex items-start gap-1">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                      <span>{selectedSHG.address}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Group capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <h4 className="font-bold text-sm text-[#073318] mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4 text-[#B2D534]" />
                    <span>Capabilities</span>
                  </h4>
                  <div className="space-y-2.5 text-xs text-slate-650">
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">Total Assigned Orders</span>
                      <span className="font-bold text-slate-800">{selectedSHG.assignedOrders}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">Primary Category</span>
                      <span className="font-semibold text-slate-800">Agricultural & Crafts</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <h4 className="font-bold text-sm text-[#073318] mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#B2D534]" />
                    <span>Bank Transfer Account</span>
                  </h4>
                  <div className="space-y-2.5 text-xs text-slate-650">
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">Bank Name</span>
                      <span className="font-semibold text-slate-800">State Bank of India</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">IFSC Code</span>
                      <span className="font-mono text-slate-800">SBIN0007890</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document verification status */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h4 className="font-bold text-sm text-[#073318] mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#B2D534]" />
                  <span>Documentation Verification</span>
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-650">
                    <p className="font-semibold text-[#073318] mb-1">Aadhaar Card</p>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-650">
                    <p className="font-semibold text-[#073318] mb-1">PAN Card</p>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-650">
                    <p className="font-semibold text-[#073318] mb-1">SHG Certificate</p>
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
