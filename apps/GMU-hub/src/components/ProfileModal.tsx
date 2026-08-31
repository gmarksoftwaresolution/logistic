import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  Building2,
  CheckCircle2,
  Edit2,
  MapPin,
  Sparkles,
  Globe,
  Check
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  // Get logged in user details from localStorage
  const user = React.useMemo(() => {
    try {
      const u = localStorage.getItem('gmu_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, [isOpen]);

  const rawPhone = user?.mobileNumber || user?.phoneNumber || user?.mobile || '1111111111';
  const cleanPhone = (rawPhone || '').replace(/\D/g, '').slice(-10);

  const [hubDetails, setHubDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState({
    coordinatorName: '',
    email: '',
    addressLine1: '',
    village: '',
    taluka: '',
    district: '',
    pincode: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const loadHubForPhone = async () => {
      try {
        const allHubs = await api.hubs.getAll();
        // Find hub matching logged-in phone or code
        let matched = allHubs.find((h: any) => {
          if (cleanPhone === '1111111111') return h.hubCode === 'HUB-NESARI' || h.name.toLowerCase().includes('nesari');
          if (cleanPhone === '2222222222') return h.hubCode === 'HUB-GADHINGLAJ' || h.name.toLowerCase().includes('gadhinglaj');
          if (cleanPhone === '3333333333') return h.hubCode === 'HUB-WAGHARALI' || h.name.toLowerCase().includes('wagharali');
          return false;
        });

        if (!matched && allHubs.length > 0) {
          matched = allHubs[0];
        }

        if (matched) {
          setHubDetails(matched);
          setEditForm({
            coordinatorName: user?.fullName || `${matched.village || 'GMU'} Coordinator`,
            email: user?.email || `coordinator@${matched.village?.toLowerCase() || 'gmu'}hub.org`,
            addressLine1: matched.addressLine1 || '',
            village: matched.village || '',
            taluka: matched.taluka || '',
            district: matched.district || '',
            pincode: matched.pincode || '',
          });
        } else {
          // Preset fallbacks by logged in phone
          let fallbackHub: any = null;
          if (cleanPhone === '2222222222') {
            fallbackHub = {
              id: 'hub-gadhinglaj',
              hubCode: 'HUB-GADHINGLAJ',
              name: 'Gadhinglaj GMU Hub',
              addressLine1: 'Market Yard, APMC Complex',
              addressLine2: 'Gate No. 2 Warehouse',
              village: 'Gadhinglaj',
              taluka: 'Gadhinglaj',
              district: 'Kolhapur',
              state: 'Maharashtra',
              pincode: '416502',
              isActive: true,
            };
          } else if (cleanPhone === '3333333333') {
            fallbackHub = {
              id: 'hub-wagharali',
              hubCode: 'HUB-WAGHARALI',
              name: 'Wagharali GMU Hub',
              addressLine1: 'Gram Panchayat Building Road',
              addressLine2: 'Collection Centre',
              village: 'Wagharali',
              taluka: 'Gadhinglaj',
              district: 'Kolhapur',
              state: 'Maharashtra',
              pincode: '416504',
              isActive: true,
            };
          } else {
            fallbackHub = {
              id: 'hub-nesari',
              hubCode: 'HUB-NESARI',
              name: 'Nesari GMU Hub',
              addressLine1: 'Main Road, Near Bus Stand',
              addressLine2: 'Central Supply Depot',
              village: 'Nesari',
              taluka: 'Gadhinglaj',
              district: 'Kolhapur',
              state: 'Maharashtra',
              pincode: '416504',
              isActive: true,
            };
          }
          setHubDetails(fallbackHub);
          setEditForm({
            coordinatorName: user?.fullName || `${fallbackHub.village} GMU Coordinator`,
            email: user?.email || `coordinator@${fallbackHub.village.toLowerCase()}hub.org`,
            addressLine1: fallbackHub.addressLine1,
            village: fallbackHub.village,
            taluka: fallbackHub.taluka,
            district: fallbackHub.district,
            pincode: fallbackHub.pincode,
          });
        }
      } catch (e) {
        let fallbackHub: any = null;
        if (cleanPhone === '2222222222') {
          fallbackHub = {
            id: 'hub-gadhinglaj',
            hubCode: 'HUB-GADHINGLAJ',
            name: 'Gadhinglaj GMU Hub',
            addressLine1: 'Market Yard, APMC Complex',
            addressLine2: 'Gate No. 2 Warehouse',
            village: 'Gadhinglaj',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416502',
            isActive: true,
          };
        } else if (cleanPhone === '3333333333') {
          fallbackHub = {
            id: 'hub-wagharali',
            hubCode: 'HUB-WAGHARALI',
            name: 'Wagharali GMU Hub',
            addressLine1: 'Gram Panchayat Building Road',
            addressLine2: 'Collection Centre',
            village: 'Wagharali',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
            isActive: true,
          };
        } else {
          fallbackHub = {
            id: 'hub-nesari',
            hubCode: 'HUB-NESARI',
            name: 'Nesari GMU Hub',
            addressLine1: 'Main Road, Near Bus Stand',
            addressLine2: 'Central Supply Depot',
            village: 'Nesari',
            taluka: 'Gadhinglaj',
            district: 'Kolhapur',
            state: 'Maharashtra',
            pincode: '416504',
            isActive: true,
          };
        }
        setHubDetails(fallbackHub);
        setEditForm({
          coordinatorName: user?.fullName || `${fallbackHub.village} GMU Coordinator`,
          email: user?.email || `coordinator@${fallbackHub.village.toLowerCase()}hub.org`,
          addressLine1: fallbackHub.addressLine1,
          village: fallbackHub.village,
          taluka: fallbackHub.taluka,
          district: fallbackHub.district,
          pincode: fallbackHub.pincode,
        });
      } finally {
        setLoading(false);
      }
    };

    loadHubForPhone();
  }, [isOpen, cleanPhone]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubDetails) return;

    try {
      if (hubDetails.id && !hubDetails.id.startsWith('hub-')) {
        await api.hubs.update(hubDetails.id, {
          addressLine1: editForm.addressLine1,
          village: editForm.village,
          taluka: editForm.taluka,
          district: editForm.district,
          pincode: editForm.pincode,
        });
      }
    } catch (err) {
      console.error('Failed to update hub API:', err);
    }

    setHubDetails((prev: any) => ({
      ...prev,
      addressLine1: editForm.addressLine1,
      village: editForm.village,
      taluka: editForm.taluka,
      district: editForm.district,
      pincode: editForm.pincode,
    }));

    // Update user in localStorage
    const updatedUser = {
      ...user,
      fullName: editForm.coordinatorName,
      email: editForm.email,
    };
    localStorage.setItem('gmu_user', JSON.stringify(updatedUser));
    setIsEditing(false);
  };

  if (!isOpen) return null;

  const coordinatorName = user?.fullName || (
    cleanPhone === '2222222222'
      ? 'Gadhinglaj GMU Coordinator'
      : cleanPhone === '3333333333'
        ? 'Wagharali GMU Coordinator'
        : 'Nesari GMU Coordinator'
  );

  const hubName = hubDetails?.name || (
    cleanPhone === '2222222222'
      ? 'Gadhinglaj GMU Hub'
      : cleanPhone === '3333333333'
        ? 'Wagharali GMU Hub'
        : 'Nesari GMU Hub'
  );

  const hubCode = hubDetails?.hubCode || (
    cleanPhone === '2222222222'
      ? 'HUB-GADHINGLAJ'
      : cleanPhone === '3333333333'
        ? 'HUB-WAGHARALI'
        : 'HUB-NESARI'
  );

  const avatarInitial = hubName.substring(0, 1).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#073318] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#E2F1AD] text-[#073318] flex items-center justify-center font-bold text-xl shadow-sm">
              {avatarInitial}
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                {hubName}
                <span className="text-[10px] font-bold tracking-widest text-[#073318] uppercase bg-[#B2D534] px-2.5 py-0.5 rounded-full">
                  {hubCode}
                </span>
              </h3>
              <p className="text-xs text-slate-300">Logged-in GMU Hub Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Loading GMU Hub profile details...
            </div>
          ) : isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-[#073318] mb-2">Edit GMU Hub Profile</h4>
              
              <div>
                <label className="block text-slate-600 font-bold mb-1">Coordinator Name</label>
                <input
                  type="text"
                  value={editForm.coordinatorName}
                  onChange={(e) => setEditForm({ ...editForm, coordinatorName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Coordinator Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={editForm.addressLine1}
                  onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Village</label>
                  <input
                    type="text"
                    value={editForm.village}
                    onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Taluka</label>
                  <input
                    type="text"
                    value={editForm.taluka}
                    onChange={(e) => setEditForm({ ...editForm, taluka: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">District</label>
                  <input
                    type="text"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editForm.pincode}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#073318]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#073318] text-white font-bold rounded-xl shadow-sm hover:bg-[#073318]/90"
                >
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            /* Dedicated Hub Profile View */
            <div className="space-y-6">
              {/* Hub Title Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#E2F1AD] border-2 border-[#B2D534] flex items-center justify-center text-[#073318] font-bold text-2xl shadow-xs shrink-0">
                  {avatarInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-[#073318] truncate">{hubName}</h4>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-[#073318]" />
                    Hub Code: <span className="font-mono font-bold text-[#073318]">{hubCode}</span>
                  </p>
                </div>
              </div>

              {/* Grid of Key Hub Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-[#073318]" />
                    GMU Hub Coordinator
                  </span>
                  <p className="font-bold text-slate-800 text-sm">{coordinatorName}</p>
                  <p className="text-slate-500 font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" /> +91 {cleanPhone}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#073318]" />
                    Location & Territory
                  </span>
                  <p className="font-bold text-slate-800 text-sm">
                    {hubDetails?.village || 'Nesari'}, {hubDetails?.taluka || 'Gadhinglaj'}
                  </p>
                  <p className="text-slate-500 font-medium">
                    District: {hubDetails?.district || 'Kolhapur'} (Pincode: {hubDetails?.pincode || '416504'})
                  </p>
                </div>

                <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-[#073318]" />
                    Registered Warehouse Address
                  </span>
                  <p className="font-semibold text-slate-800 leading-relaxed">
                    {[hubDetails?.addressLine1, hubDetails?.addressLine2, hubDetails?.village, hubDetails?.taluka, hubDetails?.district, hubDetails?.state, hubDetails?.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#073318] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Hub Profile Info
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#073318] hover:bg-[#073318]/90 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
