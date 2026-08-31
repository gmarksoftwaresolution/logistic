import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import api from '../utils/api';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  Mail,
  Shield,
  Layers,
  Sparkles,
  Search,
  Check,
  Globe,
  Navigation
} from 'lucide-react';

interface HubItem {
  id: string;
  hubCode: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PageProps {
  onNavigate: (page: string) => void;
}

export const ProfilePage = ({ onNavigate }: PageProps) => {
  const [hubs, setHubs] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHubId, setActiveHubId] = useState<string>(() => localStorage.getItem('gmu_active_hub_id') || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // User profile state
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('gmu_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userName, setUserName] = useState(user?.fullName || user?.name || 'GMU Coordinator');
  const [userMobile, setUserMobile] = useState(user?.phoneNumber || user?.mobile || '+91 98765 43210');
  const [userEmail, setUserEmail] = useState(user?.email || 'coordinator@gmuhub.org');
  const [userRole, setUserRole] = useState(user?.role || 'INDIVIDUAL');

  // Hub Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<HubItem | null>(null);
  const [formData, setFormData] = useState({
    hubCode: '',
    name: '',
    addressLine1: '',
    addressLine2: '',
    village: '',
    taluka: '',
    district: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    isActive: true,
  });

  const loadHubs = async () => {
    setLoading(true);
    try {
      const data = await api.hubs.getAll();
      setHubs(data);
      if (data.length > 0 && !activeHubId) {
        setActiveHubId(data[0].id);
        localStorage.setItem('gmu_active_hub_id', data[0].id);
      }
    } catch (err) {
      console.error('Failed to load hubs:', err);
      // Fallback demo data if backend connection fails
      const fallback: HubItem[] = [
        {
          id: 'hub-1',
          hubCode: 'HUB-MH01',
          name: 'Central Baramati GMU Logistics Hub',
          addressLine1: 'Plot 42, MIDC Industrial Area',
          addressLine2: 'Near Sugar Factory Depot',
          village: 'Baramati',
          taluka: 'Baramati',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '413133',
          latitude: 18.1507,
          longitude: 74.5772,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'hub-2',
          hubCode: 'HUB-MH02',
          name: 'North Indapur GMU Collection Hub',
          addressLine1: 'Station Road, Warehouse #3',
          addressLine2: 'Market Yard Junction',
          village: 'Indapur',
          taluka: 'Indapur',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '413106',
          latitude: 18.1158,
          longitude: 75.0315,
          isActive: true,
          createdAt: new Date().toISOString(),
        }
      ];
      setHubs(fallback);
      if (!activeHubId) {
        setActiveHubId(fallback[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHubs();
  }, []);

  const handleSelectHub = (id: string) => {
    setActiveHubId(id);
    localStorage.setItem('gmu_active_hub_id', id);
  };

  const handleSaveUserProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...user,
      fullName: userName,
      name: userName,
      phoneNumber: userMobile,
      email: userEmail,
      role: userRole,
    };
    setUser(updated);
    localStorage.setItem('gmu_user', JSON.stringify(updated));
    setIsEditingUser(false);
  };

  const handleOpenCreateModal = () => {
    setEditingHub(null);
    const nextCode = `HUB-MH0${hubs.length + 1}`;
    setFormData({
      hubCode: nextCode,
      name: '',
      addressLine1: '',
      addressLine2: '',
      village: '',
      taluka: '',
      district: '',
      state: 'Maharashtra',
      pincode: '',
      latitude: '',
      longitude: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hub: HubItem) => {
    setEditingHub(hub);
    setFormData({
      hubCode: hub.hubCode || '',
      name: hub.name || '',
      addressLine1: hub.addressLine1 || '',
      addressLine2: hub.addressLine2 || '',
      village: hub.village || '',
      taluka: hub.taluka || '',
      district: hub.district || '',
      state: hub.state || '',
      pincode: hub.pincode || '',
      latitude: hub.latitude !== undefined && hub.latitude !== null ? String(hub.latitude) : '',
      longitude: hub.longitude !== undefined && hub.longitude !== null ? String(hub.longitude) : '',
      isActive: hub.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
    };

    try {
      if (editingHub) {
        await api.hubs.update(editingHub.id, payload);
      } else {
        await api.hubs.create(payload);
      }
      setIsModalOpen(false);
      loadHubs();
    } catch (err) {
      console.error('Failed to save hub:', err);
      // Fallback local update
      if (editingHub) {
        setHubs(prev => prev.map(h => h.id === editingHub.id ? { ...h, ...payload } : h));
      } else {
        const newHub: HubItem = {
          id: `hub-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };
        setHubs(prev => [newHub, ...prev]);
        if (!activeHubId) setActiveHubId(newHub.id);
      }
      setIsModalOpen(false);
    }
  };

  const handleDeleteHub = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this GMU Hub project?')) return;
    try {
      await api.hubs.delete(id);
      loadHubs();
    } catch (err) {
      console.error('Failed to delete hub:', err);
      setHubs(prev => prev.filter(h => h.id !== id));
    }
  };

  const filteredHubs = hubs.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.hubCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.village || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.district || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeHub = hubs.find(h => h.id === activeHubId) || hubs[0];

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#073318] flex items-center gap-3">
            <User className="h-8 w-8 text-[#073318]" />
            GMU Hub Profile & Multi-Project Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your GMU Coordinator profile and switch/configure registered Hub Projects across regions.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-[#073318] hover:bg-[#073318]/90 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer text-sm shrink-0"
        >
          <Plus className="h-5 w-5 text-[#B2D534]" />
          Register New GMU Hub
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Coordinator Profile Card (Matches Image 2) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B2D534]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
              {/* Profile Avatar circle with initial "G" (from uploaded image 2) */}
              <div className="h-16 w-16 rounded-full bg-[#E2F1AD] border-2 border-[#B2D534] flex items-center justify-center text-[#073318] font-bold text-2xl shadow-sm shrink-0">
                {userName.substring(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[#073318] truncate">{userName}</h3>
                <span className="inline-block mt-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Coordinator Details */}
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#073318] shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Contact Number</p>
                  <p className="font-semibold text-slate-800">{userMobile}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#073318] shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Email Address</p>
                  <p className="font-semibold text-slate-800">{userEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#073318] shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Assigned Active Hub</p>
                  <p className="font-bold text-[#073318]">
                    {activeHub ? `${activeHub.name} (${activeHub.hubCode})` : 'None Selected'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditingUser(true)}
              className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#073318] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile Info
            </button>
          </div>

          {/* Active Project Hub Overview Card */}
          {activeHub && (
            <div className="bg-[#073318] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#B2D534] tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Currently Selected Hub
                </span>
                <span className="bg-white/10 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  {activeHub.hubCode}
                </span>
              </div>
              <h4 className="text-xl font-bold mb-2">{activeHub.name}</h4>
              <p className="text-xs text-slate-300 flex items-start gap-1.5 mb-4">
                <MapPin className="h-4 w-4 shrink-0 text-[#B2D534] mt-0.5" />
                {[activeHub.addressLine1, activeHub.village, activeHub.taluka, activeHub.district, activeHub.state, activeHub.pincode].filter(Boolean).join(', ')}
              </p>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-300">Status</span>
                <span className="text-[#B2D534] font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active Operational Hub
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Registered GMU Hubs Table & Multi-Project Info (Matches Image 1) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#073318] flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#073318]" />
                  Registered GMU Hub Projects
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full list of GMU Hub facilities stored in database with field properties.
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search hub name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#073318]"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Loading GMU Hub projects...
              </div>
            ) : filteredHubs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No GMU Hubs found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-150 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-3">Active</th>
                      <th className="py-3 px-3">Hub Code</th>
                      <th className="py-3 px-3">Hub Name & Address</th>
                      <th className="py-3 px-3">Location (Village / Taluka / Dist)</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredHubs.map((hub) => {
                      const isSelected = hub.id === activeHubId;
                      return (
                        <tr
                          key={hub.id}
                          className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-[#B2D534]/10' : ''}`}
                        >
                          <td className="py-3.5 px-3">
                            <button
                              onClick={() => handleSelectHub(hub.id)}
                              className={`h-5 w-5 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#073318] border-[#073318] text-white shadow-sm'
                                  : 'border-slate-300 bg-white hover:border-[#073318]'
                              }`}
                              title="Select active hub"
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
                            </button>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-[#073318] font-mono">
                            {hub.hubCode}
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-slate-800">{hub.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {[hub.addressLine1, hub.addressLine2, hub.pincode].filter(Boolean).join(', ')}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 text-slate-600">
                            <p className="font-medium">{hub.village || 'N/A'}, {hub.taluka || 'N/A'}</p>
                            <p className="text-[11px] text-slate-400">{hub.district || 'N/A'}, {hub.state || 'MH'}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            {hub.isActive ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <XCircle className="h-3 w-3" /> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditModal(hub)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-[#073318] cursor-pointer"
                                title="Edit Hub Details"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteHub(hub.id)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Deactivate Hub"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table Schema Verification Summary Box (Matches Image 1 specifications) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600">
            <h4 className="font-bold text-[#073318] mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#073318]" />
              Database Schema Specification for Table "Hub"
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
              <div><span className="text-slate-400">id:</span> String (UUID)</div>
              <div><span className="text-slate-400">hubCode:</span> String</div>
              <div><span className="text-slate-400">name:</span> String</div>
              <div><span className="text-slate-400">addressLine1:</span> String</div>
              <div><span className="text-slate-400">addressLine2:</span> String</div>
              <div><span className="text-slate-400">village:</span> String</div>
              <div><span className="text-slate-400">taluka:</span> String</div>
              <div><span className="text-slate-400">district:</span> String</div>
              <div><span className="text-slate-400">state:</span> String</div>
              <div><span className="text-slate-400">pincode:</span> String</div>
              <div><span className="text-slate-400">latitude:</span> Float</div>
              <div><span className="text-slate-400">longitude:</span> Float</div>
              <div><span className="text-slate-400">isActive:</span> Boolean</div>
              <div><span className="text-slate-400">createdAt:</span> DateTime</div>
              <div><span className="text-slate-400">updatedAt:</span> DateTime</div>
              <div><span className="text-slate-400">deletedAt:</span> DateTime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Profile Modal */}
      {isEditingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-[#073318] mb-4">Edit Coordinator Profile</h3>
            <form onSubmit={handleSaveUserProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Coordinator Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={userMobile}
                  onChange={(e) => setUserMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Role / Designation</label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingUser(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#073318] text-white rounded-xl font-bold shadow-md hover:bg-[#073318]/90"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit GMU Hub Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8 animate-in zoom-in-95 duration-150">
            <h3 className="text-xl font-bold text-[#073318] mb-1">
              {editingHub ? 'Edit GMU Hub Details' : 'Register New GMU Hub Project'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Enter table properties specified for database Hub schema.
            </p>

            <form onSubmit={handleSubmitHub} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Hub Code *</label>
                  <input
                    type="text"
                    value={formData.hubCode}
                    onChange={(e) => setFormData({ ...formData, hubCode: e.target.value })}
                    placeholder="e.g. HUB-MH01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Hub Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Baramati Central Hub"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder="Street name, plot number, area"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Landmark or secondary address"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Village</label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Taluka</label>
                  <input
                    type="text"
                    value={formData.taluka}
                    onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-600 font-bold mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="18.1507"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-600 font-bold mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="74.5772"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-[#073318] focus:ring-[#073318] rounded"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-slate-700">
                    Set Hub Active Status (Operational)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#073318] text-white rounded-xl font-bold shadow-md hover:bg-[#073318]/90 cursor-pointer"
                >
                  {editingHub ? 'Save Changes' : 'Create Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
