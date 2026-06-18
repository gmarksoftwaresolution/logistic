import { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Tabs } from '../components/Tabs';
import { 
  Truck, User, MapPin, Building2, FileText, CheckCircle2, 
  MoreVertical, Eye, ShieldAlert, ArrowLeft, Check, X, ShieldX, Power, CreditCard, Navigation, Calendar, Phone, Mail, Clock, Layers
} from 'lucide-react';

interface TransporterProfileExt {
  id: string;
  type: 'Milk Van' | 'Personal';
  name: string;
  mobile: string;
  email: string;
  photo: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';
  sectionEnteredAt?: string;
  assignedOrders: number;
  completedOrders: number;

  // Section 2: Address Details
  address: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  pincode: string;

  // Section 3: Driving Details
  licenseNumber: string;
  licensePhoto: string;
  licenseExpiry: string;
  experienceYears: number;

  // Section 4: Bank Details
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  upiId: string;

  // Section 5: Vehicle Details
  vehicleCategory: string; // e.g. Mini Truck, Pickup Truck, Heavy Truck, Tempo Traveler
  vehicleType: string; // e.g. Tata Ace, Bolero Camper
  vehicleMake: string; // e.g. Tata, Mahindra, Force
  vehicleNumber: string; // Registration Number
  rcBookPhoto: string;
  insurancePhoto: string;
  wheeler?: string; // e.g. 2wheeler, 3wheeler, 4wheeler
  registrationDate?: string;

  // Section 6: Milk Organization Details
  milkSangathanName: string;
  collectionCenterName: string;

  // Section 7: Route Details
  route: string;
  assignedPincodes: string[];
  assignedVillages: string[];
  timing: string;
  workingDays: string[];
  morningShift?: string;
  eveningShift?: string;
}

const initialTransporters: TransporterProfileExt[] = [
  {
    id: 'TRSP-VAN-101',
    type: 'Milk Van',
    name: 'Ramesh Keshav Thoke',
    mobile: '9876543210',
    email: 'ramesh.thoke@coopmilk.org',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'ACTIVE',
    sectionEnteredAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
    assignedOrders: 3,
    completedOrders: 28,
    address: 'Gat No. 120, Near Dudh Sangathan Center, Junnar Road',
    village: 'Junnar',
    taluka: 'Junnar',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '410502',
    licenseNumber: 'MH-14-20150098765',
    licensePhoto: 'license_ramesh.jpg',
    licenseExpiry: '2032-12-15',
    experienceYears: 8,
    accountHolderName: 'Ramesh Keshav Thoke',
    accountNumber: '109283746565',
    ifscCode: 'SBIN0000394',
    bankName: 'State Bank of India',
    branchName: 'Junnar Bazar Peth',
    upiId: 'rameshthoke@oksbi',
    vehicleCategory: 'Pickup Truck',
    vehicleType: 'Mahindra Bolero Pickup',
    vehicleMake: 'Mahindra',
    vehicleNumber: 'MH-14-EU-5678',
    rcBookPhoto: 'rc_book_5678.jpg',
    insurancePhoto: 'insurance_5678.jpg',
    wheeler: '4wheeler',
    registrationDate: '2026-06-01',
    milkSangathanName: 'Katraj Milk Cooperative (Junnar Center)',
    collectionCenterName: 'Junnar Dudh Sankalan Kendra',
    route: 'Junnar - Manchar Route',
    assignedPincodes: ['416502', '416503', '416504'],
    assignedVillages: ['Gadhinglaj', 'Wagrale', 'Nesari'],
    timing: '06:00 AM - 04:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    morningShift: '06:00 AM - 10:00 AM',
    eveningShift: '02:00 PM - 06:00 PM'
  },
  {
    id: 'TRSP-IND-102',
    type: 'Personal',
    name: 'Sunil Baburao Gaikwad',
    mobile: '9158012345',
    email: 'sunil.gaikwad@gmail.com',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    status: 'ACTIVE',
    sectionEnteredAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    assignedOrders: 1,
    completedOrders: 19,
    address: 'Shastri Nagar, Row House No. 4, Shirur Block',
    village: 'Shirur',
    taluka: 'Shirur',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '412210',
    licenseNumber: 'MH-12-20100087654',
    licensePhoto: 'license_sunil.jpg',
    licenseExpiry: '2030-05-20',
    experienceYears: 12,
    accountHolderName: 'Sunil Baburao Gaikwad',
    accountNumber: '987654321012',
    ifscCode: 'MAHB0000102',
    bankName: 'Bank of Maharashtra',
    branchName: 'Shirur Branch',
    upiId: 'sunilgaikwad@okaxis',
    vehicleCategory: 'Mini Truck',
    vehicleType: 'Tata Ace Gold',
    vehicleMake: 'Tata',
    vehicleNumber: 'MH-12-SF-1234',
    rcBookPhoto: 'rc_book_1234.jpg',
    insurancePhoto: 'insurance_1234.jpg',
    wheeler: '4wheeler',
    registrationDate: '2026-06-03',
    milkSangathanName: 'N/A',
    collectionCenterName: 'N/A',
    route: 'Shirur - Ranjangaon Corridor',
    assignedPincodes: ['416503', '416504'],
    assignedVillages: ['Wagrale', 'Nesari'],
    timing: '08:00 AM - 06:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    morningShift: '08:00 AM - 12:00 PM',
    eveningShift: '03:00 PM - 07:00 PM'
  },
  {
    id: 'TRSP-VAN-103',
    type: 'Milk Van',
    name: 'Mahesh Arjun Kadam',
    mobile: '9850123456',
    email: 'mahesh.kadam@dairy.org',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    status: 'PENDING_APPROVAL',
    sectionEnteredAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    assignedOrders: 0,
    completedOrders: 0,
    address: 'Kadam Wasti, Gat 50, Manchar Block',
    village: 'Manchar',
    taluka: 'Ambegaon',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '410503',
    licenseNumber: 'MH-14-20180011223',
    licensePhoto: 'license_mahesh.jpg',
    licenseExpiry: '2035-08-10',
    experienceYears: 5,
    accountHolderName: 'Mahesh Arjun Kadam',
    accountNumber: '324567890123',
    ifscCode: 'BARB0MANCHA',
    bankName: 'Bank of Baroda',
    branchName: 'Manchar Main Branch',
    upiId: 'maheshkadam@okbaroda',
    vehicleCategory: 'Tempo Traveler',
    vehicleType: 'Force Traveller Cargo',
    vehicleMake: 'Force',
    vehicleNumber: 'MH-14-GH-9988',
    rcBookPhoto: 'rc_book_9988.jpg',
    insurancePhoto: 'insurance_9988.jpg',
    wheeler: '4wheeler',
    registrationDate: '2026-06-05',
    milkSangathanName: 'Gokul Dairy Coop (Ambegaon Center)',
    collectionCenterName: 'Manchar Cold Storage',
    route: 'Manchar Rural Collection Route',
    assignedPincodes: ['416502', '416503', '416504'],
    assignedVillages: ['Gadhinglaj', 'Wagrale', 'Nesari'],
    timing: '05:00 AM - 02:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    morningShift: '05:00 AM - 09:00 AM',
    eveningShift: '01:00 PM - 05:00 PM'
  },
  {
    id: 'TRSP-IND-104',
    type: 'Personal',
    name: 'Deepak Vasantrao Shinde',
    mobile: '9988776655',
    email: 'deepak.shinde@rediffmail.com',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    status: 'PENDING_APPROVAL',
    sectionEnteredAt: new Date(Date.now() - 45000).toISOString(), // 45 seconds ago
    assignedOrders: 0,
    completedOrders: 0,
    address: 'Malhar Peth, Line 3, Indapur Block',
    village: 'Indapur',
    taluka: 'Indapur',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '413106',
    licenseNumber: 'MH-42-20200055443',
    licensePhoto: 'license_deepak.jpg',
    licenseExpiry: '2037-11-20',
    experienceYears: 4,
    accountHolderName: 'Deepak Vasantrao Shinde',
    accountNumber: '876543210987',
    ifscCode: 'ICIC0003020',
    bankName: 'ICICI Bank',
    branchName: 'Indapur Town Branch',
    upiId: 'deepakshinde@okicici',
    vehicleCategory: 'Mini Truck',
    vehicleType: 'Mahindra Supro Cargo',
    vehicleMake: 'Mahindra',
    vehicleNumber: 'MH-42-TR-2022',
    rcBookPhoto: 'rc_book_2022.jpg',
    insurancePhoto: 'insurance_2022.jpg',
    wheeler: '4wheeler',
    registrationDate: '2026-06-15',
    milkSangathanName: 'N/A',
    collectionCenterName: 'N/A',
    route: 'Indapur Local Delivery Corridor',
    assignedPincodes: ['416503', '416504'],
    assignedVillages: ['Wagrale', 'Nesari'],
    timing: '09:00 AM - 07:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    morningShift: '09:00 AM - 01:00 PM',
    eveningShift: '04:00 PM - 08:00 PM'
  },
  {
    id: 'TRSP-VAN-105',
    type: 'Milk Van',
    name: 'Sanjay Dnyaneshwar Patil',
    mobile: '9765432109',
    email: 'sanjay.patil@coopmilk.org',
    photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    status: 'INACTIVE',
    sectionEnteredAt: new Date(Date.now() - 3600000 * 72).toISOString(), // 72 hours ago
    assignedOrders: 0,
    completedOrders: 32,
    address: 'Patil Nagar, Near Toll Booth, Karjat Road',
    village: 'Karjat',
    taluka: 'Karjat',
    district: 'Ahmednagar',
    state: 'Maharashtra',
    pincode: '410201',
    licenseNumber: 'MH-16-20050012345',
    licensePhoto: 'license_sanjay.jpg',
    licenseExpiry: '2028-04-12',
    experienceYears: 20,
    accountHolderName: 'Sanjay Dnyaneshwar Patil',
    accountNumber: '456789012345',
    ifscCode: 'HDFC0001040',
    bankName: 'HDFC Bank',
    branchName: 'Karjat Branch',
    upiId: 'sanjaypatil@okhdfc',
    vehicleCategory: 'Heavy Truck',
    vehicleType: 'Tata LPT 1109',
    vehicleMake: 'Tata',
    vehicleNumber: 'MH-16-AE-7766',
    rcBookPhoto: 'rc_book_7766.jpg',
    insurancePhoto: 'insurance_7766.jpg',
    wheeler: '6wheeler',
    registrationDate: '2026-06-16',
    milkSangathanName: 'Katraj Milk Cooperative (Karjat Center)',
    collectionCenterName: 'Karjat Chilling Plant',
    route: 'Karjat - Ahmednagar Route',
    assignedPincodes: ['416502', '416504'],
    assignedVillages: ['Gadhinglaj', 'Nesari'],
    timing: '04:00 AM - 01:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    morningShift: '04:00 AM - 08:00 AM',
    eveningShift: '12:00 PM - 04:00 PM'
  }
];

export const TransporterManagementPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [transporterList, setTransporterList] = useState<TransporterProfileExt[]>(initialTransporters);
  const [assignedRoutes, setAssignedRoutes] = useState<Record<string, string[]>>({
    'TRSP-VAN-101': ['Gadhinglaj', 'Wagrale'],
    'TRSP-IND-102': ['Wagrale', 'Nesari'],
    'TRSP-VAN-103': ['Gadhinglaj', 'Wagrale', 'Nesari'],
    'TRSP-IND-104': ['Wagrale', 'Nesari'],
    'TRSP-VAN-105': ['Gadhinglaj', 'Nesari']
  });
  const [activeTopSection, setActiveTopSection] = useState<'route' | 'personal'>('route');
  const [activeTab, setActiveTab] = useState<'requests' | 'members'>('requests');
  const [selectedProfile, setSelectedProfile] = useState<TransporterProfileExt | null>(null);

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<{ type: 'approve' | 'reject' | 'activate' | 'deactivate'; id: string } | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Document Viewer State
  const [viewingDoc, setViewingDoc] = useState<{ 
    title: string; 
    filename: string; 
    type: 'license' | 'rc' | 'insurance'; 
    profileName: string; 
    profileId: string; 
    documentNumber?: string 
  } | null>(null);

  // Tab Filtering
  const tabData = useMemo(() => {
    return transporterList.filter(t => {
      const matchesSection = t.type === (activeTopSection === 'route' ? 'Milk Van' : 'Personal');
      if (!matchesSection) return false;

      if (activeTab === 'requests') {
        return t.status === 'PENDING_APPROVAL';
      } else {
        return t.status === 'ACTIVE' || t.status === 'INACTIVE';
      }
    });
  }, [transporterList, activeTopSection, activeTab]);

  // Action handlers
  const handleModalConfirm = () => {
    if (!modalAction) return;
    const { type, id } = modalAction;

    setTransporterList(prev => prev.map(t => {
      if (t.id === id) {
        if (type === 'approve' || type === 'activate') {
          return { ...t, status: 'ACTIVE' as const, sectionEnteredAt: new Date().toISOString() };
        } else if (type === 'deactivate') {
          return { ...t, status: 'INACTIVE' as const, sectionEnteredAt: new Date().toISOString() };
        }
      }
      return t;
    }).filter(t => {
      // Reject deletes it
      if (type === 'reject' && t.id === id) return false;
      return true;
    }));

    // If viewing the selected profile, sync status
    if (selectedProfile && selectedProfile.id === id) {
      if (type === 'reject') {
        setSelectedProfile(null);
        setIsViewModalOpen(false);
      } else {
        setSelectedProfile(prev => {
          if (!prev) return null;
          const updatedStatus = (type === 'approve' || type === 'activate') ? 'ACTIVE' : 'INACTIVE';
          return { ...prev, status: updatedStatus as any };
        });
      }
    }

    setModalAction(null);
  };

  const navigateToDetails = (profile: TransporterProfileExt) => {
    setSelectedProfile(profile);
    setIsViewModalOpen(true);
  };

  // Action 3-dots popup
  const getActionButtons = (row: TransporterProfileExt, subTab: 'requests' | 'members') => {
    return (
      <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveActionMenu(activeActionMenu === row.id ? null : row.id);
          }}
          className="p-1.5 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-[#073318] rounded-full transition-colors cursor-pointer border border-slate-200/60 shadow-sm flex items-center justify-center mx-auto"
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
                  navigateToDetails(row);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#073318]/5 hover:text-[#073318] rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-slate-400" />
                <span>View Details</span>
              </button>

              {subTab === 'requests' ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionMenu(null);
                      setModalAction({ type: 'approve', id: row.id });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Approve Request</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionMenu(null);
                      setModalAction({ type: 'reject', id: row.id });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                  >
                    <X className="h-4 w-4 text-red-500" />
                    <span>Reject Request</span>
                  </button>
                </>
              ) : (
                <>
                  {row.status === 'ACTIVE' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveActionMenu(null);
                        setModalAction({ type: 'deactivate', id: row.id });
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Power className="h-4 w-4 text-amber-500" />
                      <span>Deactivate</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveActionMenu(null);
                        setModalAction({ type: 'activate', id: row.id });
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-150 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Power className="h-4 w-4 text-emerald-500" />
                      <span>Activate</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Requests Table Column Schema
  const requestColumns = [
    {
      header: 'Transporter ID',
      accessor: (row: TransporterProfileExt) => (
        <span className="font-bold font-mono text-slate-700">{row.id}</span>
      )
    },
    { header: 'Type', accessor: 'type' as keyof TransporterProfileExt },
    { header: 'Full Name', accessor: 'name' as keyof TransporterProfileExt },
    { header: 'Mobile Number', accessor: 'mobile' as keyof TransporterProfileExt },
    { header: 'Vehicle Category', accessor: 'vehicleCategory' as keyof TransporterProfileExt },
    { header: 'Assigned Route', accessor: 'route' as keyof TransporterProfileExt },
    { header: 'Status', accessor: (row: TransporterProfileExt) => <StatusBadge status={row.status} /> },
    {
      header: 'Action',
      accessor: (row: TransporterProfileExt) => getActionButtons(row, 'requests')
    }
  ];

  // Members Table Column Schema
  const memberColumns = [
    {
      header: 'Transporter ID',
      accessor: (row: TransporterProfileExt) => (
        <span className="font-bold font-mono text-slate-700">{row.id}</span>
      )
    },
    { header: 'Type', accessor: 'type' as keyof TransporterProfileExt },
    { header: 'Full Name', accessor: 'name' as keyof TransporterProfileExt },
    { header: 'Mobile Number', accessor: 'mobile' as keyof TransporterProfileExt },
    { header: 'Vehicle Category', accessor: 'vehicleCategory' as keyof TransporterProfileExt },
    { header: 'Assigned Route', accessor: 'route' as keyof TransporterProfileExt },
    { header: 'Assigned Orders', accessor: 'assignedOrders' as keyof TransporterProfileExt },
    { header: 'Completed Orders', accessor: 'completedOrders' as keyof TransporterProfileExt },
    { header: 'Status', accessor: (row: TransporterProfileExt) => <StatusBadge status={row.status} /> },
    {
      header: 'Action',
      accessor: (row: TransporterProfileExt) => getActionButtons(row, 'members')
    }
  ];

  return (
    <Layout currentPage="transporter-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header */}
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
        </div>

        {/* Primary Tabs: Route Partners | Personal */}
        <Tabs
          activeTab={activeTopSection}
          onChange={(id) => {
            setActiveTopSection(id as 'route' | 'personal');
          }}
          tabs={[
            { id: 'route', label: 'Route Partners' },
            { id: 'personal', label: 'Personal' },
          ]}
        />

        {/* Navigation Tab Header */}
        <Tabs
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id as 'requests' | 'members');
          }}
          variant="secondary"
          tabs={[
            { 
              id: 'requests', 
              label: 'New Approval Requests', 
              count: transporterList.filter(t => t.status === 'PENDING_APPROVAL' && t.type === (activeTopSection === 'route' ? 'Milk Van' : 'Personal')).length 
            },
            { 
              id: 'members', 
              label: 'Members', 
              count: transporterList.filter(t => (t.status === 'ACTIVE' || t.status === 'INACTIVE') && t.type === (activeTopSection === 'route' ? 'Milk Van' : 'Personal')).length 
            },
          ]}
        />

        {/* Data Table */}
        <DataTable 
          columns={activeTab === 'requests' ? requestColumns : memberColumns} 
          data={tabData} 
          statusFilterField="status"
          onRowDoubleClick={navigateToDetails}
        />
      </div>

      {/* Full screen View Modal styled like Order Details view page */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Transporter Profile: ${selectedProfile?.name || ''}`}
        variant="modal"
        size="full"
        hideHeader={true}
      >
        {selectedProfile && (
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

                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-50 text-[#073318] border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {selectedProfile.type} Logistics Partner
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {selectedProfile.status.replace(/[-_]/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-[#073318] flex items-baseline gap-2">
                    {selectedProfile.name}
                    <span className="text-sm text-slate-400 font-bold font-mono">
                      ({selectedProfile.id})
                    </span>
                  </h3>
                </div>
              </div>

              {/* Right Side: Status Stepper */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                <span className={`px-4 py-2 rounded-xl font-bold ${selectedProfile.status === 'PENDING_APPROVAL' ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>REGISTERED</span>
                <span className="text-slate-300 px-1 font-bold">➔</span>
                <span className={`px-4 py-2 rounded-xl font-bold ${selectedProfile.status === 'ACTIVE' || selectedProfile.status === 'INACTIVE' ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>VERIFIED</span>
                <span className="text-slate-300 px-1 font-bold">➔</span>
                <span className={`px-4 py-2 rounded-xl font-bold ${selectedProfile.status === 'ACTIVE' ? 'bg-[#073318] text-white' : 'text-slate-500'}`}>ACTIVE</span>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex justify-end gap-3">
              {selectedProfile.status === 'PENDING_APPROVAL' && (
                <>
                  <button 
                    onClick={() => setModalAction({ type: 'approve', id: selectedProfile.id })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    Approve Request
                  </button>
                  <button 
                    onClick={() => setModalAction({ type: 'reject', id: selectedProfile.id })}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    Reject Request
                  </button>
                </>
              )}
              {selectedProfile.status === 'ACTIVE' && (
                <button 
                  onClick={() => setModalAction({ type: 'deactivate', id: selectedProfile.id })}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Deactivate Partner
                </button>
              )}
              {selectedProfile.status === 'INACTIVE' && (
                <button 
                  onClick={() => setModalAction({ type: 'activate', id: selectedProfile.id })}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Activate Partner
                </button>
              )}
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Section (Summary, Vehicle, Routes) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Transporter Summary */}
                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-4.5 space-y-3 shadow-sm text-left">
                  <div className="flex items-center justify-between border-b border-[#073318]/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Representative Information</span>
                    </div>
                    <span className="bg-[#073318] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {selectedProfile.type}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4.5 items-center md:items-start pt-1">
                    <img 
                      src={selectedProfile.photo} 
                      alt={selectedProfile.name} 
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#073318]/10 shadow-sm shrink-0"
                    />
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-5 text-xs flex-1 w-full">
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Mobile Contact</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.mobile}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Email Address</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Years of Experience</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.experienceYears} Years</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Assigned Orders</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.assignedOrders} Active</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Residential Address</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Village</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.village || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Taluka</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.taluka || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">District</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.district || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">State</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.state || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Pincode</p>
                        <p className="font-bold text-slate-800 font-mono">{selectedProfile.pincode || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle & Transportation Details */}
                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-4.5 space-y-3 shadow-sm text-left">
                  <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-2">
                    <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                      <Truck className="h-4 w-4" />
                    </div>
                    <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Vehicle Details</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Wheeler</p>
                      <p className="font-bold text-slate-800">{selectedProfile.wheeler || '4wheeler'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Vehicle Type</p>
                      <p className="font-bold text-slate-800">{selectedProfile.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Vehicle Make</p>
                      <p className="font-bold text-slate-800">{selectedProfile.vehicleMake}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Vehicle Number</p>
                      <p className="font-bold text-slate-800 font-mono">{selectedProfile.vehicleNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Driving Details */}
                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-4.5 space-y-3 shadow-sm text-left">
                  <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-2">
                    <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Driving Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Driving License Number</p>
                      <p className="font-bold text-slate-800 font-mono">{selectedProfile.licenseNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Expiry Date</p>
                      <p className="font-bold text-slate-800 font-mono">{selectedProfile.licenseExpiry}</p>
                    </div>
                  </div>
                </div>

                {/* Milk Sangathan Association details */}
                {selectedProfile.type === 'Milk Van' && (
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-4.5 space-y-3 shadow-sm text-left">
                    <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-2">
                      <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Milk Sangathan Association</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Milk Sangathan Co-op</p>
                        <p className="font-bold text-slate-855">{selectedProfile.milkSangathanName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Collection Center</p>
                        <p className="font-bold text-slate-855">{selectedProfile.collectionCenterName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Section (Bank, Route & Registration timeline) */}
              <div className="space-y-4">
                {/* Bank Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-4.5 shadow-sm text-left space-y-3">
                  <h4 className="text-sm font-extrabold text-[#073318] tracking-widest uppercase flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#073318]" />
                    Settlement Bank Details
                  </h4>
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-400">Account Holder:</span>
                      <span className="font-bold text-slate-700">{selectedProfile.accountHolderName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-400">Account Number:</span>
                      <span className="font-bold text-slate-700 font-mono">{selectedProfile.accountNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-400">Bank Name:</span>
                      <span className="font-bold text-slate-700">{selectedProfile.bankName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-400">Branch Name:</span>
                      <span className="font-bold text-slate-700">{selectedProfile.branchName}</span>
                    </div>
                  <div className="flex justify-between">
                      <span className="text-slate-400">UPI ID:</span>
                      <span className="font-bold text-slate-700 font-mono">{selectedProfile.upiId}</span>
                    </div>
                  </div>
                </div>

                {/* Route Assignment details */}
                <div className="bg-[#073318] rounded-3xl p-4.5 text-white text-left space-y-3.5 shadow-lg">
                  <h4 className="text-sm font-extrabold tracking-widest uppercase flex items-center gap-2">
                    <Navigation className="h-4.5 w-4.5 text-[#B2D534]" />
                    Route Details
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                      <p className="text-slate-300 font-semibold text-[9px] uppercase tracking-wider mb-1">Route Name</p>
                      <p className="font-bold text-sm text-[#B2D534]">{selectedProfile.route}</p>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                      <p className="text-slate-300 font-semibold text-[9px] uppercase tracking-wider mb-1.5">List of Assigned Villages with Pincode</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedProfile.assignedVillages.map((v, idx) => {
                          const pin = selectedProfile.assignedPincodes[idx] || '';
                          return (
                            <span key={v} className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold inline-block border border-white/5">
                              {v} ({pin})
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                      <p className="text-slate-300 font-semibold text-[9px] uppercase tracking-wider mb-1">Morning Shift Time</p>
                      <p className="font-bold text-sm text-[#B2D534]">{selectedProfile.morningShift || '06:00 AM - 10:00 AM'}</p>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                      <p className="text-slate-300 font-semibold text-[9px] uppercase tracking-wider mb-1">Evening Shift Time</p>
                      <p className="font-bold text-sm text-[#B2D534]">{selectedProfile.eveningShift || '02:00 PM - 06:00 PM'}</p>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                      <p className="text-slate-300 font-semibold text-[9px] uppercase tracking-wider mb-1">Working Days Available</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
                          const isW = selectedProfile.workingDays.includes(d);
                          return (
                            <span key={d} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isW ? 'bg-[#B2D534] text-[#073318]' : 'bg-white/5 text-white/40'}`}>
                              {d}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registration History Timeline Card */}
                <div className="bg-[#073318] rounded-3xl p-4.5 text-white flex flex-col justify-between space-y-4 shadow-lg min-h-[170px] text-left">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white">
                      <Layers className="h-4 w-4 text-[#B2D534]" />
                      <span className="font-extrabold text-sm uppercase tracking-wider">Registration History</span>
                    </div>

                    <div className="relative border-l border-white/20 pl-4 space-y-3 ml-2.5 py-1">
                      <div className="relative">
                        <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                        <p className="text-xs font-black text-[#B2D534]">{selectedProfile.registrationDate || '2026-06-17'}</p>
                        <p className="text-xs font-semibold text-slate-200 mt-0.5">Registration request received</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                        <p className="text-xs font-black text-[#B2D534]">Document verified</p>
                        <p className="text-xs font-semibold text-slate-200 mt-0.5">License, RC Book & Insurance verification complete</p>
                      </div>
                      {selectedProfile.status === 'ACTIVE' && (
                        <div className="relative">
                          <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                          <p className="text-xs font-black text-[#B2D534]">Approved Partner</p>
                          <p className="text-xs font-semibold text-slate-200 mt-0.5">Status set to ACTIVE</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#B2D534]/70 italic mt-auto pt-3 border-t border-white/10">
                    GMU transporter partner registration timeline.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Documents Verification Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="bg-slate-100 p-1.5 rounded-lg text-slate-700">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Uploaded Documents Verification</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-center">
                <div 
                  onClick={() => setViewingDoc({ 
                    title: "Driver's License", 
                    filename: selectedProfile.licensePhoto, 
                    type: 'license', 
                    profileName: selectedProfile.name, 
                    profileId: selectedProfile.id,
                    documentNumber: selectedProfile.licenseNumber
                  })}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-750 text-left">Driver's License</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono text-left">No: {selectedProfile.licenseNumber}</p>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-100">
                    View
                  </span>
                </div>

                <div 
                  onClick={() => setViewingDoc({ 
                    title: 'Vehicle Registration RC', 
                    filename: selectedProfile.rcBookPhoto, 
                    type: 'rc', 
                    profileName: selectedProfile.name, 
                    profileId: selectedProfile.id,
                    documentNumber: selectedProfile.vehicleNumber
                  })}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-750 text-left">Vehicle RC Book</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono text-left">Plate: {selectedProfile.vehicleNumber}</p>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-100">
                    View
                  </span>
                </div>

                <div 
                  onClick={() => setViewingDoc({ 
                    title: 'Insurance Policy Certificate', 
                    filename: selectedProfile.insurancePhoto, 
                    type: 'insurance', 
                    profileName: selectedProfile.name, 
                    profileId: selectedProfile.id
                  })}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-750 text-left">Road Insurance</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono text-left">File: {selectedProfile.insurancePhoto}</p>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-100">
                    View
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modals for Actions */}
      <Modal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        title="Confirm Action"
        variant="modal"
      >
        {modalAction && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <p className="text-sm font-bold text-slate-800 capitalize">
                {modalAction.type} Transporter Partner?
              </p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed text-left">
              Are you sure you want to {modalAction.type} the profile details for **{modalAction.id}**?
              {modalAction.type === 'approve' && ' This will verify their vehicle registration, license documentation, and move them to active members.'}
              {modalAction.type === 'reject' && ' This will remove their signup request from the GMU Hub.'}
              {modalAction.type === 'deactivate' && ' Deactivating will temporarily restrict them from accepting routes or delivery assignments.'}
              {modalAction.type === 'activate' && ' Activating will restore their eligibility for route assignments.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleModalConfirm}
                className={`flex-1 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-colors cursor-pointer ${
                  modalAction.type === 'reject' || modalAction.type === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm {modalAction.type}
              </button>
              <button
                onClick={() => setModalAction(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Government DL / RC / Insurance Document Preview Modal */}
      {viewingDoc && (
        <Modal
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc.title}
          variant="modal"
          size="md"
        >
          <div className="flex flex-col items-center p-4">
            {viewingDoc.type === 'license' && (
              <div className="w-full max-w-sm bg-gradient-to-r from-blue-50 via-white to-blue-50 border-2 border-blue-400 rounded-2xl shadow-xl overflow-hidden text-xs">
                <div className="bg-blue-700 text-white font-extrabold text-[10px] tracking-wider text-center py-2 px-3">
                  MAHARASHTRA STATE MOTOR VEHICLES DEPARTMENT / UNION OF INDIA
                  <div className="text-[8px] text-blue-200 font-bold uppercase mt-0.5">Driving License</div>
                </div>
                <div className="p-4 flex gap-4 text-left">
                  <div className="h-24 w-20 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shrink-0">
                    <img 
                      src={selectedProfile?.photo || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'} 
                      alt="DL Photo" 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div>
                      <p className="text-[9px] text-slate-450 font-bold uppercase">Lic No.</p>
                      <p className="font-extrabold text-blue-700 font-mono">{viewingDoc.documentNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-450 font-bold uppercase">Name</p>
                      <p className="font-extrabold text-slate-800">{viewingDoc.profileName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-slate-450 font-bold uppercase">Valid Till</p>
                        <p className="font-bold text-slate-800 font-mono">2035-12-15</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-450 font-bold uppercase">COV</p>
                        <p className="font-bold text-slate-800">LMV-GV</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewingDoc.type === 'rc' && (
              <div className="w-full max-w-sm bg-slate-50 border-2 border-slate-350 rounded-2xl shadow-xl overflow-hidden text-xs p-4 space-y-3">
                <div className="text-center border-b border-slate-200 pb-2">
                  <h5 className="font-black text-slate-800 text-[11px] uppercase tracking-wider">FORM 23 - CERTIFICATE OF REGISTRATION</h5>
                  <p className="text-[9px] text-slate-450 uppercase font-bold tracking-wider">Government of Maharashtra</p>
                </div>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[10px] text-left">
                  <div>
                    <span className="text-slate-450 block uppercase text-[8px] font-bold">Regd No</span>
                    <span className="font-bold text-slate-800 font-mono">{viewingDoc.documentNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block uppercase text-[8px] font-bold">Owner Name</span>
                    <span className="font-bold text-slate-800">{viewingDoc.profileName}</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block uppercase text-[8px] font-bold">Chassis Number</span>
                    <span className="font-bold text-slate-700 font-mono">MA3FND2G6C8XXXXXX</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block uppercase text-[8px] font-bold">Engine Number</span>
                    <span className="font-bold text-slate-700 font-mono">4B12CXXXXXX</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block uppercase text-[8px] font-bold">Maker Class</span>
                    <span className="font-bold text-slate-800">{selectedProfile?.vehicleMake} / {selectedProfile?.vehicleType}</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block uppercase text-[8px] font-bold">Tax Paid Upto</span>
                    <span className="font-bold text-emerald-600">LIFETIME</span>
                  </div>
                </div>
              </div>
            )}

            {viewingDoc.type === 'insurance' && (
              <div className="w-full max-w-sm bg-white border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden text-xs p-4 space-y-3">
                <div className="text-center border-b border-slate-200 pb-2">
                  <h5 className="font-black text-slate-850 text-xs tracking-wider uppercase">COMMERCIAL VEHICLE PACKAGE POLICY</h5>
                  <p className="text-[9px] text-slate-450 uppercase font-bold tracking-wider">The United India Insurance Co. Ltd</p>
                </div>
                <div className="space-y-1.5 text-[10px] text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Policy Number:</span>
                    <span className="font-bold font-mono">0329003115P109283746</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Insured Name:</span>
                    <span className="font-bold">{viewingDoc.profileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Period of Insurance:</span>
                    <span className="font-bold font-mono">2025-06-12 to 2026-06-11</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-100 pt-2 mt-2 text-[#073318]">
                    <span>STATUS:</span>
                    <span>ACTIVE & FULLY PAID</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setViewingDoc(null)}
              className="mt-6 w-full max-w-xs py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Close Document
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
};
