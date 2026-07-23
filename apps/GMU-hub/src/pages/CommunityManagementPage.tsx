import { useState, useMemo, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Tabs } from '../components/Tabs';
import { api } from '../utils/api';
import {
  Users, User, MapPin, Store, Building2, FileText, CheckCircle2,
  MoreVertical, Eye, ShieldAlert, ArrowLeft, Check, X, ShieldX, Power, CreditCard, Layers
} from 'lucide-react';


interface SHGProfileExt {
  id: string;
  memberCode?: string;
  type: 'SHG Group' | 'Individual';
  fullName: string;
  mobile: string;
  village: string;
  pincode: string;
  role: 'CRP' | 'Leader' | 'Member' | 'N/A';
  shgName: string;
  storageAvailable: string;
  vehicleAvailable: string;
  registrationDate: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
  sectionEnteredAt?: string;
  activeOrders: number;
  completedOrders: number;

  // Section 1: Personal Details
  photo: string;
  age: number;
  occupation?: string;

  // Section 2: SHG Details
  crpName?: string;
  crpMobile?: string;
  crpEmail?: string;
  shgActiveSince?: string;
  shgGroupSize?: number;
  groupLeaderName?: string;
  groupLeaderMobile?: string;

  // Section 3: Business Details
  producesProducts: string;
  businessTeamSize: number;
  productName: string;
  productCategory: string;
  dailyProduction: string;
  weeklyProduction: string;
  unit: string;
  pricePerUnit: number;

  // Section 4: Address Details
  houseNumber: string;
  address: string;
  taluka: string;
  district: string;
  state: string;

  // Section 5: Documents
  aadhaarNumber: string;
  panNumber: string;
  aadhaarFront: string;
  aadhaarBack: string;
  panCard: string;

  // Section 6: Bank Details
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  upiId: string;

  // Section 7: Storage & Logistics
  width: string;
  height: string;
  storageDescription: string;
  vehicleType?: string;
  registrationNumber?: string;
  drivingLicenseNumber?: string;
  drivingLicensePhoto?: string;
  vehiclePhoto?: string;
}

const initialSHGs: SHGProfileExt[] = [
  {
    id: 'SHG-GROUP-101',
    type: 'SHG Group',
    fullName: 'Savita S. Patil',
    mobile: '9876543201',
    village: 'Junnar',
    pincode: '410502',
    role: 'CRP',
    shgName: 'Manchar Mahila Bachat Gat',
    storageAvailable: '120 sq ft',
    vehicleAvailable: 'Yes',
    registrationDate: '2026-06-01',
    status: 'ACTIVE',
    sectionEnteredAt: new Date(Date.now() - 3600000 * 25).toISOString(), // 25 hours ago
    activeOrders: 2,
    completedOrders: 14,
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    age: 38,
    crpName: 'Savita S. Patil',
    crpMobile: '9876543201',
    crpEmail: 'savita.patil@gmuhub.org',
    shgActiveSince: '2021-04-12',
    shgGroupSize: 12,
    groupLeaderName: 'Surekha Jadhav',
    groupLeaderMobile: '9158098765',
    producesProducts: 'Yes',
    businessTeamSize: 6,
    productName: 'Organic Turmeric Powder',
    productCategory: 'Spices',
    dailyProduction: '20 kg',
    weeklyProduction: '120 kg',
    unit: 'Kilograms',
    pricePerUnit: 180,
    houseNumber: 'Gat No. 45',
    address: 'Near Gram Panchayat Office, Junnar Village',
    taluka: 'Junnar',
    district: 'Pune',
    state: 'Maharashtra',
    aadhaarNumber: '5432 9876 1201',
    panNumber: 'BPDPA1201K',
    aadhaarFront: 'aadhaar_front_savita.jpg',
    aadhaarBack: 'aadhaar_back_savita.jpg',
    panCard: 'pan_savita.jpg',
    accountHolderName: 'Manchar Mahila Bachat Gat',
    accountNumber: '321045987612',
    ifscCode: 'SBIN0001234',
    bankName: 'State Bank of India',
    branchName: 'Junnar Branch',
    upiId: 'mancharmahila@oksbi',
    width: '10 ft',
    height: '12 ft',
    storageDescription: 'Pucca clean room with dry wooden shelves for storing dry spices and groceries.',
    vehicleType: 'Mahindra Bolero Pickup',
    registrationNumber: 'MH-14-EU-4321',
    drivingLicenseNumber: 'MH14 20120039482',
    drivingLicensePhoto: 'dl_savita.jpg',
    vehiclePhoto: 'bolero_pickup.jpg'
  },
  {
    id: 'SHG-GROUP-102',
    type: 'SHG Group',
    fullName: 'Lata Ramchandra Shinde',
    mobile: '9876543202',
    village: 'Shirur',
    pincode: '412210',
    role: 'Leader',
    shgName: 'Savitribai Phule Bachat Gat',
    storageAvailable: '80 sq ft',
    vehicleAvailable: 'No',
    registrationDate: '2026-06-03',
    status: 'ACTIVE',
    sectionEnteredAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    activeOrders: 1,
    completedOrders: 8,
    photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150',
    age: 42,
    crpName: 'Surekha Deshmukh',
    crpMobile: '9850123456',
    crpEmail: 'surekha.d@gmuhub.org',
    shgActiveSince: '2022-09-18',
    shgGroupSize: 10,
    groupLeaderName: 'Lata Ramchandra Shinde',
    groupLeaderMobile: '9876543202',
    producesProducts: 'Yes',
    businessTeamSize: 4,
    productName: 'Handmade Jute Bags',
    productCategory: 'Handicrafts',
    dailyProduction: '10 pcs',
    weeklyProduction: '60 pcs',
    unit: 'Pieces',
    pricePerUnit: 120,
    houseNumber: 'Plot No. 12',
    address: 'Vikas Nagar, Shirur Block',
    taluka: 'Shirur',
    district: 'Pune',
    state: 'Maharashtra',
    aadhaarNumber: '9876 5432 1098',
    panNumber: 'CLKPS9876D',
    aadhaarFront: 'aadhaar_front_lata.jpg',
    aadhaarBack: 'aadhaar_back_lata.jpg',
    panCard: 'pan_lata.jpg',
    accountHolderName: 'Savitribai Phule Bachat Gat',
    accountNumber: '987654321045',
    ifscCode: 'MAHB0000456',
    bankName: 'Bank of Maharashtra',
    branchName: 'Shirur Town Branch',
    upiId: 'savitribaigat@okaxis',
    width: '8 ft',
    height: '10 ft',
    storageDescription: 'Small dry storage cupboard and clean racks, perfect for finished fabric and bag materials.',
    vehicleType: 'N/A',
    registrationNumber: 'N/A',
    drivingLicenseNumber: 'N/A',
    drivingLicensePhoto: 'N/A',
    vehiclePhoto: 'N/A'
  },
  {
    id: 'SHG-IND-103',
    type: 'Individual',
    fullName: 'Shankar Mahadev Kadam',
    mobile: '9876543203',
    village: 'Manchar',
    pincode: '410503',
    role: 'N/A',
    shgName: 'N/A',
    storageAvailable: '200 sq ft',
    vehicleAvailable: 'Yes',
    registrationDate: '2026-06-05',
    status: 'INACTIVE',
    sectionEnteredAt: new Date(Date.now() - 3600000 * 48).toISOString(), // 48 hours ago
    activeOrders: 0,
    completedOrders: 5,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    age: 49,
    occupation: 'Organic Farmer',
    producesProducts: 'Yes',
    businessTeamSize: 2,
    productName: 'Organic Indrayani Rice',
    productCategory: 'Grains',
    dailyProduction: '50 kg',
    weeklyProduction: '300 kg',
    unit: 'Kilograms',
    pricePerUnit: 95,
    houseNumber: 'Kadam Wasti, Gat 89',
    address: 'Near Old Maruti Temple, Manchar Rural',
    taluka: 'Ambegaon',
    district: 'Pune',
    state: 'Maharashtra',
    aadhaarNumber: '8765 4321 0987',
    panNumber: 'ASDPR8765F',
    aadhaarFront: 'aadhaar_front_shankar.jpg',
    aadhaarBack: 'aadhaar_back_shankar.jpg',
    panCard: 'pan_shankar.jpg',
    accountHolderName: 'Shankar Mahadev Kadam',
    accountNumber: '456789012345',
    ifscCode: 'BARB0MANCHA',
    bankName: 'Bank of Baroda',
    branchName: 'Manchar Branch',
    upiId: 'shankarkadam@okbaroda',
    width: '10 ft',
    height: '20 ft',
    storageDescription: 'Large dry shed with concrete flooring and moisture protection for farm produce storage.',
    vehicleType: 'Tata Ace (Chota Hathi)',
    registrationNumber: 'MH-14-BT-1122',
    drivingLicenseNumber: 'MH14 20080054321',
    drivingLicensePhoto: 'dl_shankar.jpg',
    vehiclePhoto: 'tata_ace.jpg'
  },
  {
    id: 'SHG-GROUP-104',
    type: 'SHG Group',
    fullName: 'Anisha Dilip Kamble',
    mobile: '9876543204',
    village: 'Indapur',
    pincode: '413106',
    role: 'Member',
    shgName: 'Ekta Mahila Bachat Gat',
    storageAvailable: '150 sq ft',
    vehicleAvailable: 'No',
    registrationDate: '2026-06-15',
    status: 'PENDING_APPROVAL',
    sectionEnteredAt: new Date(Date.now() - 15000).toISOString(), // 15 seconds ago
    activeOrders: 0,
    completedOrders: 0,
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    age: 31,
    crpName: 'Megha Kulkarni',
    crpMobile: '9988776655',
    crpEmail: 'megha.k@gmuhub.org',
    shgActiveSince: '2023-01-15',
    shgGroupSize: 11,
    groupLeaderName: 'Rekha Gaikwad',
    groupLeaderMobile: '9158012345',
    producesProducts: 'Yes',
    businessTeamSize: 5,
    productName: 'Millet Biscuits',
    productCategory: 'Processed Foods',
    dailyProduction: '15 kg',
    weeklyProduction: '90 kg',
    unit: 'Kilograms',
    pricePerUnit: 220,
    houseNumber: 'Room 5, Ward 3',
    address: 'Indapur Market Road, near High School',
    taluka: 'Indapur',
    district: 'Pune',
    state: 'Maharashtra',
    aadhaarNumber: '1234 5678 9012',
    panNumber: 'DFGHI1234F',
    aadhaarFront: 'aadhaar_front_anisha.jpg',
    aadhaarBack: 'aadhaar_back_anisha.jpg',
    panCard: 'pan_anisha.jpg',
    accountHolderName: 'Ekta Mahila Bachat Gat',
    accountNumber: '109876543210',
    ifscCode: 'ICIC0001020',
    bankName: 'ICICI Bank',
    branchName: 'Indapur Branch',
    upiId: 'ektamahila@okicici',
    width: '10 ft',
    height: '15 ft',
    storageDescription: 'Secured concrete room inside the leader residential compound. Dry and ventilated.',
    vehicleType: 'N/A',
    registrationNumber: 'N/A',
    drivingLicenseNumber: 'N/A',
    drivingLicensePhoto: 'N/A',
    vehiclePhoto: 'N/A'
  },
  {
    id: 'SHG-IND-105',
    type: 'Individual',
    fullName: 'Raju Vitthal Pawar',
    mobile: '9876543205',
    village: 'Karjat',
    pincode: '410201',
    role: 'N/A',
    shgName: 'N/A',
    storageAvailable: '100 sq ft',
    vehicleAvailable: 'Yes',
    registrationDate: '2026-06-16',
    status: 'PENDING_APPROVAL',
    sectionEnteredAt: new Date(Date.now() - 45000).toISOString(), // 45 seconds ago
    activeOrders: 0,
    completedOrders: 0,
    photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    age: 29,
    occupation: 'Dairy Producer',
    producesProducts: 'Yes',
    businessTeamSize: 1,
    productName: 'Pure Buffalo Ghee',
    productCategory: 'Dairy Products',
    dailyProduction: '5 liters',
    weeklyProduction: '30 liters',
    unit: 'Liters',
    pricePerUnit: 650,
    houseNumber: 'Gat No. 201',
    address: 'Pawar Wasti, Karjat Road',
    taluka: 'Karjat',
    district: 'Ahmednagar',
    state: 'Maharashtra',
    aadhaarNumber: '2345 6789 0123',
    panNumber: 'JKLMN2345P',
    aadhaarFront: 'aadhaar_front_raju.jpg',
    aadhaarBack: 'aadhaar_back_raju.jpg',
    panCard: 'pan_raju.jpg',
    accountHolderName: 'Raju Vitthal Pawar',
    accountNumber: '567890123456',
    ifscCode: 'HDFC0002040',
    bankName: 'HDFC Bank',
    branchName: 'Karjat Branch',
    upiId: 'rajupawar@okhdfc',
    width: '10 ft',
    height: '10 ft',
    storageDescription: 'Small dedicated dairy storage unit, maintained cool and clean for dairy products.',
    vehicleType: 'Mahindra Maximo',
    registrationNumber: 'MH-12-PQ-9876',
    drivingLicenseNumber: 'MH12 20190087654',
    drivingLicensePhoto: 'dl_raju.jpg',
    vehiclePhoto: 'maximo.jpg'
  }
];

const normalizeUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      parsed.hostname = 'localhost';
      parsed.port = '3000';
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }
  if (url.startsWith('/uploads')) {
    return `http://localhost:3001${url}`;
  }
  if (url.startsWith('uploads/')) {
    return `http://localhost:3001/${url}`;
  }
  return url;
};

const parseDimensions = (storageSpace?: string) => {
  if (!storageSpace) return { width: '', height: '' };
  const match = storageSpace.match(/(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    return { width: `${match[1]} ft`, height: `${match[2]} ft` };
  }
  const num = parseFloat(storageSpace);
  if (!isNaN(num) && num > 0) {
    const side = Math.round(Math.sqrt(num));
    return { width: `${side} ft`, height: `${side} ft` };
  }
  return { width: '', height: '' };
};

import { useAppContext } from '../context/AppContext';

export const CommunityManagementPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { communityMembersList: shgList, setCommunityMembersList: setShgList } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Navigation Tab states
  const [activeTopSection, setActiveTopSection] = useState<'shg' | 'individual'>('shg');
  const [activeTab, setActiveTab] = useState<'requests' | 'members' | 'rejected'>('requests');
  const [selectedProfile, setSelectedProfile] = useState<SHGProfileExt | null>(null);

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<{ type: 'approve' | 'reject' | 'activate' | 'deactivate'; id: string } | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  // Document Viewer State
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    filename: string;
    type: 'aadhaar' | 'pan';
    profileName: string;
    profileId: string;
    documentNumber?: string
  } | null>(null);

  const fetchData = async (isManualRefresh = false) => {
    if (shgList.length === 0 || isManualRefresh) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      let requests: any[] = [];
      let members: any[] = [];
      let rejected: any[] = [];

      if (activeTopSection === 'shg') {
        [requests, members, rejected] = await Promise.all([
          api.community.getShgRequests(),
          api.community.getShgMembers(),
          api.community.getShgRejected()
        ]);
      } else {
        [requests, members, rejected] = await Promise.all([
          api.community.getIndividualRequests(),
          api.community.getIndividualMembers(),
          api.community.getIndividualRejected()
        ]);
      }

      const mapItem = (item: any) => {
        const dims = parseDimensions(item.storageSpace);
        return {
          id: item.memberCode || String(item.id),
          memberCode: item.memberCode || String(item.id),
          type: (activeTopSection === 'shg' ? 'SHG Group' : 'Individual') as any,
          fullName: item.fullName || '',
          mobile: item.mobileNumber || '',
          village: item.village || '',
          pincode: item.pincode || '',
          role: (item.roleInShg || 'N/A') as any,
          shgName: item.shgName || 'N/A',
          storageAvailable: item.storageSpace ? item.storageSpace : 'N/A',
          vehicleAvailable: item.vehicleAvailable ? 'Yes' : 'No',
          registrationDate: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '',
          status: (item.status === 'PENDING' ? 'PENDING_APPROVAL' : item.status === 'APPROVED' ? 'ACTIVE' : item.status) as any,
          activeOrders: 0,
          completedOrders: 0,
          photo: item.profilePhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          age: item.age || 0,
          occupation: 'N/A',
          crpName: item.crpName || 'N/A',
          crpMobile: item.crpMobile || 'N/A',
          crpEmail: item.crpEmail || 'N/A',
          shgActiveSince: item.activeSince ? new Date(item.activeSince).toISOString().split('T')[0] : 'N/A',
          shgGroupSize: item.groupSize || 0,
          groupLeaderName: item.leaderName || 'N/A',
          groupLeaderMobile: item.leaderMobile || 'N/A',
          producesProducts: item.producesProducts ? 'Yes' : 'No',
          businessTeamSize: item.businessTeamSize || 0,
          productName: item.productName || 'N/A',
          productCategory: item.productCategory || 'N/A',
          dailyProduction: item.dailyProduction ? `${item.dailyProduction} ${item.productionUnit || ''}` : 'N/A',
          weeklyProduction: item.weeklyProduction ? `${item.weeklyProduction} ${item.productionUnit || ''}` : 'N/A',
          unit: item.productionUnit || 'N/A',
          pricePerUnit: item.pricePerUnit || 0,
          houseNumber: item.houseNo || 'N/A',
          address: item.deliveryAddress || 'N/A',
          taluka: item.taluka || '',
          district: item.district || '',
          state: item.state || '',
          aadhaarNumber: item.aadhaarNumber || 'N/A',
          panNumber: item.panNumber || 'N/A',
          aadhaarFront: normalizeUrl(item.aadhaarFrontPhoto) || 'N/A',
          aadhaarBack: normalizeUrl(item.aadhaarBackPhoto) || 'N/A',
          panCard: normalizeUrl(item.panCardPhoto) || 'N/A',
          accountHolderName: item.accountHolderName || 'N/A',
          accountNumber: item.accountNumber || 'N/A',
          ifscCode: item.ifscCode || 'N/A',
          bankName: item.bankName || 'N/A',
          branchName: item.branchName || 'N/A',
          upiId: item.upiId || 'N/A',
          width: dims.width,
          height: dims.height,
          storageDescription: item.storageSpace || 'N/A',
          vehicleType: item.vehicleType || 'N/A',
          registrationNumber: item.vehicleRegistrationNumber || 'N/A',
          drivingLicenseNumber: item.drivingLicenseNumber || 'N/A',
          drivingLicensePhoto: normalizeUrl(item.drivingLicensePhoto) || 'N/A',
          vehiclePhoto: normalizeUrl(item.vehiclePhoto) || 'N/A'
        };
      };

      const mappedRequests = requests.map(mapItem);
      const mappedMembers = members.map(mapItem);
      const mappedRejected = rejected.map(mapItem);

      setShgList([...mappedRequests, ...mappedMembers, ...mappedRejected]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch community data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTopSection]);

  // Section & Tab Filtering
  const tabData = useMemo(() => {
    return shgList.filter(s => {
      // Filter by Section: shg -> 'SHG Group', individual -> 'Individual'
      const matchesSection = s.type === (activeTopSection === 'shg' ? 'SHG Group' : 'Individual');
      if (!matchesSection) return false;

      // Filter by Sub-tab: requests -> 'PENDING_APPROVAL', members -> 'ACTIVE' / 'INACTIVE', rejected -> 'REJECTED'
      if (activeTab === 'requests') {
        return s.status === 'PENDING_APPROVAL';
      } else if (activeTab === 'rejected') {
        return s.status === 'REJECTED';
      } else {
        return s.status === 'ACTIVE' || s.status === 'INACTIVE';
      }
    });
  }, [shgList, activeTopSection, activeTab]);

  // Row Action confirmation handlers
  const handleModalConfirm = async () => {
    if (!modalAction || isActionProcessing) return;
    const { type, id } = modalAction;
    setIsActionProcessing(true);
    setErrorMsg('');

    try {
      if (type === 'approve' || type === 'activate') {
        await api.community.approve(id);
      } else if (type === 'reject' || type === 'deactivate') {
        await api.community.reject(id);
      }

      // If viewing the selected profile, refresh its details from backend
      if (selectedProfile && selectedProfile.id === id) {
        try {
          const item = await api.community.getDetails(id);
          const dims = parseDimensions(item.storageSpace);
          const mappedProfile: SHGProfileExt = {
            id: item.id,
            memberCode: item.memberCode || item.id,
            type: (item.type === 'SHG' ? 'SHG Group' : 'Individual') as any,
            fullName: item.fullName,
            mobile: item.mobileNumber,
            village: item.village || '',
            pincode: item.pincode || '',
            role: (item.roleInShg || 'N/A') as any,
            shgName: item.shgName || 'N/A',
            storageAvailable: item.storageSpace || (item.storageWidth && item.storageHeight ? `${item.storageWidth * item.storageHeight} sq ft` : 'N/A'),
            vehicleAvailable: item.vehicleAvailable ? 'Yes' : 'No',
            registrationDate: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '',
            status: (item.status === 'PENDING' ? 'PENDING_APPROVAL' : item.status === 'APPROVED' ? 'ACTIVE' : item.status) as any,
            activeOrders: 0,
            completedOrders: 0,
            photo: normalizeUrl(item.profilePhoto) || '',
            age: item.age || 0,
            occupation: item.occupation || '',
            crpName: item.crpName || '',
            crpMobile: item.crpMobile || '',
            crpEmail: item.crpEmail || '',
            shgActiveSince: item.activeSince || '',
            shgGroupSize: item.groupSize || 0,
            groupLeaderName: item.leaderName || '',
            groupLeaderMobile: item.leaderMobile || '',
            producesProducts: item.producesProducts ? 'Yes' : 'No',
            businessTeamSize: item.businessTeamSize || 0,
            productName: item.productName || '',
            productCategory: item.productCategory || '',
            dailyProduction: item.dailyProduction ? `${item.dailyProduction} ${item.productionUnit || 'Kg'}` : '',
            weeklyProduction: item.weeklyProduction ? `${item.weeklyProduction} ${item.productionUnit || 'Kg'}` : '',
            unit: item.productionUnit || '',
            pricePerUnit: item.pricePerUnit || 0,
            houseNumber: item.houseNo || '',
            address: item.deliveryAddress || '',
            taluka: item.taluka || '',
            district: item.district || '',
            state: item.state || '',
            aadhaarNumber: item.aadhaarNumber || '',
            panNumber: item.panNumber || '',
            aadhaarFront: normalizeUrl(item.aadhaarFrontPhoto) || '',
            aadhaarBack: normalizeUrl(item.aadhaarBackPhoto) || '',
            panCard: normalizeUrl(item.panCardPhoto) || '',
            accountHolderName: item.accountHolderName || '',
            accountNumber: item.accountNumber || '',
            ifscCode: item.ifscCode || '',
            bankName: item.bankName || '',
            branchName: item.branchName || '',
            upiId: item.upiId || '',
            width: item.storageWidth ? `${item.storageWidth} ft` : dims.width,
            height: item.storageHeight ? `${item.storageHeight} ft` : dims.height,
            storageDescription: item.storageDescription || 'Clean and dry ventilated room storage.',
            vehicleType: item.vehicleType || 'N/A',
            registrationNumber: item.vehicleRegistrationNumber || 'N/A',
            drivingLicenseNumber: item.drivingLicenseNumber || 'N/A',
            drivingLicensePhoto: normalizeUrl(item.drivingLicensePhoto) || 'N/A',
            vehiclePhoto: normalizeUrl(item.vehiclePhoto) || 'N/A'
          };
          setSelectedProfile(mappedProfile);
        } catch (e) {
          setSelectedProfile(null);
          setIsViewModalOpen(false);
        }
      }

      setModalAction(null);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed.');
    } finally {
      setIsActionProcessing(false);
    }
  };

  // Switch to Details Modal
  const navigateToDetails = (profile: SHGProfileExt) => {
    setSelectedProfile(profile);
    setIsViewModalOpen(true);
  };

  // 3-Dots Action button generator
  const getActionButtons = (row: SHGProfileExt, subTab: 'requests' | 'members' | 'rejected') => {
    return (
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const shouldOpenUpwards = rect.bottom > window.innerHeight * 0.65;
            setOpenUpwards(shouldOpenUpwards);
            setActiveActionMenu(activeActionMenu === row.id ? null : row.id);
          }}
          className="p-1.5 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-[#073318] rounded-full transition-colors cursor-pointer border border-slate-200/60 shadow-sm flex items-center justify-center"
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
              ) : subTab === 'rejected' ? (
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

  // Request Columns config
  const requestColumns = [
    {
      header: 'MEMBER CODE',
      accessor: (row: SHGProfileExt) => (
        <span className="font-bold font-mono text-slate-700">{row.memberCode || row.id}</span>
      )
    },
    { header: 'Type', accessor: 'type' as keyof SHGProfileExt },
    { header: 'Full Name', accessor: 'fullName' as keyof SHGProfileExt },
    { header: 'Mobile Number', accessor: 'mobile' as keyof SHGProfileExt },
    { header: 'Village', accessor: 'village' as keyof SHGProfileExt },
    { header: 'Pincode', accessor: 'pincode' as keyof SHGProfileExt },
    { header: 'Role', accessor: 'role' as keyof SHGProfileExt },
    { header: 'SHG Name', accessor: 'shgName' as keyof SHGProfileExt },
    { header: 'Storage Available', accessor: 'storageAvailable' as keyof SHGProfileExt },
    { header: 'Vehicle Available', accessor: 'vehicleAvailable' as keyof SHGProfileExt },
    { header: 'Registration Date', accessor: 'registrationDate' as keyof SHGProfileExt },
    { header: 'Status', accessor: (row: SHGProfileExt) => <StatusBadge status={row.status} /> },
    {
      header: 'Action',
      accessor: (row: SHGProfileExt) => getActionButtons(row, 'requests')
    }
  ];

  // Members Columns config
  const memberColumns = [
    {
      header: 'MEMBER CODE',
      accessor: (row: SHGProfileExt) => (
        <span className="font-bold font-mono text-slate-700">{row.memberCode || row.id}</span>
      )
    },
    { header: 'Type', accessor: 'type' as keyof SHGProfileExt },
    { header: 'Full Name', accessor: 'fullName' as keyof SHGProfileExt },
    { header: 'Mobile Number', accessor: 'mobile' as keyof SHGProfileExt },
    { header: 'Village', accessor: 'village' as keyof SHGProfileExt },
    { header: 'Pincode', accessor: 'pincode' as keyof SHGProfileExt },
    { header: 'Role', accessor: 'role' as keyof SHGProfileExt },
    { header: 'SHG Name', accessor: 'shgName' as keyof SHGProfileExt },
    { header: 'Storage Available', accessor: 'storageAvailable' as keyof SHGProfileExt },
    { header: 'Vehicle Available', accessor: 'vehicleAvailable' as keyof SHGProfileExt },
    { header: 'Active Orders', accessor: 'activeOrders' as keyof SHGProfileExt },
    { header: 'Completed Orders', accessor: 'completedOrders' as keyof SHGProfileExt },
    { header: 'Status', accessor: (row: SHGProfileExt) => <StatusBadge status={row.status} /> },
    {
      header: 'Action',
      accessor: (row: SHGProfileExt) => getActionButtons(row, 'members')
    }
  ];

  // Rejected Columns config
  const rejectedColumns = [
    {
      header: 'MEMBER CODE',
      accessor: (row: SHGProfileExt) => (
        <span className="font-bold font-mono text-slate-700">{row.memberCode || row.id}</span>
      )
    },
    { header: 'Type', accessor: 'type' as keyof SHGProfileExt },
    { header: 'Full Name', accessor: 'fullName' as keyof SHGProfileExt },
    { header: 'Mobile Number', accessor: 'mobile' as keyof SHGProfileExt },
    { header: 'Village', accessor: 'village' as keyof SHGProfileExt },
    { header: 'Pincode', accessor: 'pincode' as keyof SHGProfileExt },
    { header: 'Role', accessor: 'role' as keyof SHGProfileExt },
    { header: 'SHG Name', accessor: 'shgName' as keyof SHGProfileExt },
    { header: 'Storage Available', accessor: 'storageAvailable' as keyof SHGProfileExt },
    { header: 'Vehicle Available', accessor: 'vehicleAvailable' as keyof SHGProfileExt },
    { header: 'Registration Date', accessor: 'registrationDate' as keyof SHGProfileExt },
    { header: 'Status', accessor: (row: SHGProfileExt) => <StatusBadge status={row.status} /> },
    {
      header: 'Action',
      accessor: (row: SHGProfileExt) => getActionButtons(row, 'rejected')
    }
  ];

  return (
    <Layout currentPage="shg-management" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#B2D534]/30 to-[#B2D534]/10 p-3.5 rounded-2xl border border-[#B2D534]/40 shadow-sm">
              <Users className="h-7 w-7 text-[#073318]" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Community Management</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Manage Self-Help Groups and Individual signups, approvals, and active members list.</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary Tabs: SHG | Individual */}
        <Tabs
          activeTab={activeTopSection}
          onChange={(id) => {
            setActiveTopSection(id as 'shg' | 'individual');
          }}
          tabs={[
            { id: 'shg', label: 'SHG' },
            { id: 'individual', label: 'Individual' },
          ]}
        />

        {/* Secondary Sub-tabs */}
        <Tabs
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id as 'requests' | 'members' | 'rejected');
          }}
          variant="secondary"
          tabs={[
            {
              id: 'requests',
              label: 'New Approval Requests',
              count: shgList.filter(s => s.status === 'PENDING_APPROVAL' && s.type === (activeTopSection === 'shg' ? 'SHG Group' : 'Individual')).length
            },
            {
              id: 'members',
              label: 'Members',
              count: shgList.filter(s => (s.status === 'ACTIVE' || s.status === 'INACTIVE') && s.type === (activeTopSection === 'shg' ? 'SHG Group' : 'Individual')).length
            },
            {
              id: 'rejected',
              label: 'Rejected Requests',
              count: shgList.filter(s => s.status === 'REJECTED' && s.type === (activeTopSection === 'shg' ? 'SHG Group' : 'Individual')).length
            },
          ]}
        />

        {/* Data Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm min-h-[350px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#073318]"></div>
            <p className="mt-4 text-xs font-semibold text-slate-500">Loading community members from backend...</p>
          </div>
        ) : (
          <DataTable
            columns={activeTab === 'requests' ? requestColumns : activeTab === 'rejected' ? rejectedColumns : memberColumns}
            data={tabData}
            statusFilterField="status"
            onRowDoubleClick={navigateToDetails}
            onRefresh={fetchData}
          />
        )}
      </div>

      {/* View Details View inside Modal overlay matching Order Details Style */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Partner Profile: ${selectedProfile?.fullName || ''}`}
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
                      {selectedProfile.type} Signup Protocol
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {selectedProfile.status.replace(/[-_]/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-[#073318] flex items-baseline gap-2">
                    {selectedProfile.fullName}
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
              {(selectedProfile.status === 'PENDING_APPROVAL' || selectedProfile.status === 'REJECTED') && (
                <>
                  <button
                    onClick={() => setModalAction({ type: 'approve', id: selectedProfile.id })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    Approve Request
                  </button>
                  {selectedProfile.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => setModalAction({ type: 'reject', id: selectedProfile.id })}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      Reject Request
                    </button>
                  )}
                </>
              )}
              {selectedProfile.status === 'ACTIVE' && (
                <button
                  onClick={() => setModalAction({ type: 'deactivate', id: selectedProfile.id })}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Deactivate Member
                </button>
              )}
              {selectedProfile.status === 'INACTIVE' && (
                <button
                  onClick={() => setModalAction({ type: 'activate', id: selectedProfile.id })}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Activate Member
                </button>
              )}
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Section (Summary, Business, Address) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Summary Card */}
                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                  <div className="flex items-center justify-between border-b border-[#073318]/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Representative Summary</span>
                    </div>
                    <span className="bg-[#073318] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {selectedProfile.type}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start pt-2">
                    {selectedProfile.photo ? (
                      <img
                        src={selectedProfile.photo}
                        alt={selectedProfile.fullName}
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-[#073318]/10 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                        No Photo
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs flex-1 w-full">
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Mobile Contact</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.mobile}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Age</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.age} Years</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Role inside Group / Occupation</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.role || selectedProfile.occupation || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-extrabold uppercase text-[9px] mb-0.5">Registration Date</p>
                        <p className="font-extrabold text-slate-800">{selectedProfile.registrationDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SHG Details Card (Only for SHG Group) */}
                {selectedProfile.type === 'SHG Group' && (
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-3">
                      <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">SHG Group Details</span>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Basic Group Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/50 p-4 rounded-2xl border border-slate-200/40">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">SHG Group Name</p>
                          <p className="font-bold text-slate-800">{selectedProfile.shgName}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Role inside Group</p>
                          <p className="font-bold text-slate-800">{selectedProfile.role}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Active Since</p>
                          <p className="font-bold text-slate-800">{selectedProfile.shgActiveSince || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Group Size</p>
                          <p className="font-bold text-slate-800">{selectedProfile.shgGroupSize || 'N/A'} Members</p>
                        </div>
                      </div>

                      {/* Associated Leader/CRP Contact Info */}
                      <div className="bg-white/50 p-4 rounded-2xl border border-slate-200/40 space-y-3">
                        <p className="text-[#073318] font-extrabold uppercase text-[9px] tracking-widest border-b border-[#073318]/5 pb-1.5">
                          Key Contact Representatives
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Leader Details */}
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Group Leader Name</p>
                            <p className="font-bold text-slate-800">{selectedProfile.groupLeaderName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Leader Mobile Number</p>
                            <p className="font-bold text-slate-800">{selectedProfile.groupLeaderMobile || 'N/A'}</p>
                          </div>
                          <div className="hidden lg:block" />

                          {/* CRP Details */}
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">CRP Name</p>
                            <p className="font-bold text-slate-800">{selectedProfile.crpName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">CRP Contact</p>
                            <p className="font-bold text-slate-800">{selectedProfile.crpMobile || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">CRP Email</p>
                            <p className="font-bold text-slate-700 font-mono">{selectedProfile.crpEmail || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Details Card (Only for SHG Group) */}
                {selectedProfile.type === 'SHG Group' && (
                  <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-3">
                      <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                        <Store className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Business & Production details</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Produces Products</p>
                        <p className="font-bold text-slate-800">{selectedProfile.producesProducts}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Team Size</p>
                        <p className="font-bold text-slate-800">{selectedProfile.businessTeamSize} people</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Product Name</p>
                        <p className="font-bold text-slate-800">{selectedProfile.productName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Category</p>
                        <p className="font-bold text-slate-800">{selectedProfile.productCategory}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Daily Production</p>
                        <p className="font-bold text-slate-800">{selectedProfile.dailyProduction}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Weekly Production</p>
                        <p className="font-bold text-slate-800">{selectedProfile.weeklyProduction}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Production Unit</p>
                        <p className="font-bold text-slate-800">{selectedProfile.unit}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Price Per Unit</p>
                        <p className="font-bold text-emerald-700">₹{selectedProfile.pricePerUnit}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Storage & Logistics Card */}
                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                  <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-3">
                    <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                      <Layers className="h-4 w-4" />
                    </div>
                    <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Storage & Logistics</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Storage Space Available</p>
                      <p className="font-bold text-slate-800">{selectedProfile.storageAvailable || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Width</p>
                      <p className="font-bold text-slate-800">{selectedProfile.width || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Height</p>
                      <p className="font-bold text-slate-800">{selectedProfile.height || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Vehicle Available</p>
                      <p className="font-bold text-slate-800">{selectedProfile.vehicleAvailable || 'N/A'}</p>
                    </div>
                    {selectedProfile.vehicleAvailable === 'Yes' && (
                      <>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Vehicle Type</p>
                          <p className="font-bold text-slate-800">{selectedProfile.vehicleType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Registration Number</p>
                          <p className="font-bold text-slate-800 font-mono">{selectedProfile.registrationNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Driving License Number</p>
                          <p className="font-bold text-slate-800 font-mono">{selectedProfile.drivingLicenseNumber || 'N/A'}</p>
                        </div>
                        {selectedProfile.drivingLicensePhoto && selectedProfile.drivingLicensePhoto !== 'N/A' && (
                          <div
                            onClick={() => setViewingDoc({
                              title: "Driver's License",
                              filename: selectedProfile.drivingLicensePhoto!,
                              type: 'aadhaar',
                              profileName: selectedProfile.fullName,
                              profileId: selectedProfile.id,
                              documentNumber: selectedProfile.drivingLicenseNumber
                            })}
                            className="p-2.5 bg-white hover:bg-slate-50 border border-dashed border-slate-350 text-[10px] font-bold text-slate-500 cursor-pointer rounded-xl flex items-center justify-center gap-1.5 mt-1 transition-colors"
                          >
                            📂 View DL Photo
                          </div>
                        )}
                        {selectedProfile.vehiclePhoto && selectedProfile.vehiclePhoto !== 'N/A' && (
                          <div
                            onClick={() => setViewingDoc({
                              title: "Vehicle Photo",
                              filename: selectedProfile.vehiclePhoto!,
                              type: 'pan',
                              profileName: selectedProfile.fullName,
                              profileId: selectedProfile.id,
                              documentNumber: selectedProfile.registrationNumber
                            })}
                            className="p-2.5 bg-white hover:bg-slate-50 border border-dashed border-slate-350 text-[10px] font-bold text-slate-500 cursor-pointer rounded-xl flex items-center justify-center gap-1.5 mt-1 transition-colors"
                          >
                            📂 View Vehicle Photo
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Section (Bank & Timeline) */}
              <div className="space-y-6">
                {/* Address Details Card */}
                <div className="border border-emerald-500/20 bg-[#F4F9F6] rounded-3xl p-6 space-y-4 shadow-sm text-left">
                  <div className="flex items-center gap-2 border-b border-[#073318]/10 pb-3">
                    <div className="bg-[#073318] p-1.5 rounded-lg text-white">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Address Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">House Number</p>
                      <p className="font-bold text-slate-800">{selectedProfile.houseNumber || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Address</p>
                      <p className="font-bold text-slate-800">{selectedProfile.address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Village</p>
                      <p className="font-bold text-slate-800">{selectedProfile.village || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Taluka</p>
                      <p className="font-bold text-slate-800">{selectedProfile.taluka || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">District</p>
                      <p className="font-bold text-slate-800">{selectedProfile.district || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">State</p>
                      <p className="font-bold text-slate-800">{selectedProfile.state || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] mb-0.5">Pincode</p>
                      <p className="font-bold text-slate-800 font-mono">{selectedProfile.pincode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Bank Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-4">
                  <h4 className="text-sm font-extrabold text-[#073318] tracking-widest uppercase flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#073318]" />
                    Settlement Bank Details
                  </h4>
                  <div className="space-y-3 text-xs pt-1">
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">Account Holder:</span>
                      <span className="font-bold text-slate-700">{selectedProfile.accountHolderName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">Account Number:</span>
                      <span className="font-bold text-slate-700 font-mono">{selectedProfile.accountNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">Bank Name:</span>
                      <span className="font-bold text-slate-700">{selectedProfile.bankName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400">Branch Name:</span>
                      <span className="font-bold text-slate-700">{selectedProfile.branchName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">UPI ID:</span>
                      <span className="font-bold text-slate-700 font-mono">{selectedProfile.upiId}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Card */}
                <div className="bg-[#073318] rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-lg min-h-[300px] text-left">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white">
                      <Layers className="h-4 w-4 text-[#B2D534]" />
                      <span className="font-extrabold text-sm uppercase tracking-wider">Registration History</span>
                    </div>

                    <div className="relative border-l border-white/20 pl-4 space-y-4 ml-2.5 py-1">
                      <div className="relative">
                        <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                        <p className="text-xs font-black text-[#B2D534]">{selectedProfile.registrationDate}</p>
                        <p className="text-xs font-semibold text-slate-200 mt-0.5">Registration request received</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[22.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-[#B2D534] border-2 border-[#073318]" />
                        <p className="text-xs font-black text-[#B2D534]">Document verified</p>
                        <p className="text-xs font-semibold text-slate-200 mt-0.5">Aadhaar & PAN verification complete</p>
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
                  <p className="text-[10px] text-[#B2D534]/70 italic mt-auto pt-4 border-t border-white/10">
                    GMU community management partner registration timeline.
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
                <span className="font-extrabold text-sm text-[#073318] uppercase tracking-wider">Uploaded Documents Photocopies</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-center">
                <div
                  onClick={() => setViewingDoc({
                    title: 'Aadhaar Card Front',
                    filename: selectedProfile.aadhaarFront,
                    type: 'aadhaar',
                    profileName: selectedProfile.fullName,
                    profileId: selectedProfile.id,
                    documentNumber: selectedProfile.aadhaarNumber
                  })}
                  className="p-3 bg-slate-150/50 hover:bg-slate-200/50 rounded-xl border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 cursor-pointer transition-colors"
                >
                  📂 Aadhaar Front View
                </div>
                <div
                  onClick={() => setViewingDoc({
                    title: 'Aadhaar Card Back',
                    filename: selectedProfile.aadhaarBack,
                    type: 'aadhaar',
                    profileName: selectedProfile.fullName,
                    profileId: selectedProfile.id,
                    documentNumber: selectedProfile.aadhaarNumber
                  })}
                  className="p-3 bg-slate-150/50 hover:bg-slate-200/50 rounded-xl border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 cursor-pointer transition-colors"
                >
                  📂 Aadhaar Back View
                </div>
                <div
                  onClick={() => setViewingDoc({
                    title: 'PAN Card',
                    filename: selectedProfile.panCard,
                    type: 'pan',
                    profileName: selectedProfile.fullName,
                    profileId: selectedProfile.id,
                    documentNumber: selectedProfile.panNumber
                  })}
                  className="p-3 bg-slate-150/50 hover:bg-slate-200/50 rounded-xl border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 cursor-pointer transition-colors"
                >
                  📂 PAN Card Scan
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Actions Modal */}
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
                {modalAction.type} Community Partner?
              </p>
            </div>
            <p className="text-xs text-slate-550 leading-relaxed text-left">
              Are you sure you want to {modalAction.type} the profile details for **{modalAction.id}**?
              {modalAction.type === 'approve' && ' This will verify their documentation and move them to active members.'}
              {modalAction.type === 'reject' && ' This will remove their registration request from the GMU Hub.'}
              {modalAction.type === 'deactivate' && ' Deactivating will temporarily restrict them from receiving new orders.'}
              {modalAction.type === 'activate' && ' Activating will restore their eligibility for receiving new orders.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                disabled={isActionProcessing}
                onClick={handleModalConfirm}
                className={`flex-1 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-colors cursor-pointer ${isActionProcessing ? 'bg-slate-400 cursor-not-allowed text-slate-200' :
                    modalAction.type === 'reject' || modalAction.type === 'deactivate'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
              >
                {isActionProcessing ? 'Processing...' : `Confirm ${modalAction.type}`}
              </button>
              <button
                disabled={isActionProcessing}
                onClick={() => setModalAction(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Government ID / Document Preview Modal */}
      {viewingDoc && (
        <Modal
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc.title}
          variant="modal"
          size="md"
        >
          <div className="flex flex-col items-center p-4">
            {viewingDoc.filename && viewingDoc.filename !== 'N/A' ? (
              <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden p-2 flex flex-col items-center justify-center">
                <img
                  src={viewingDoc.filename}
                  alt={viewingDoc.title}
                  className="max-w-full max-h-[350px] object-contain rounded-xl"
                  onError={(e) => {
                    console.log("Failed to load uploaded document image");
                  }}
                />
                <div className="mt-3 text-center">
                  <p className="text-xs font-bold text-slate-800">{viewingDoc.title}</p>
                  {viewingDoc.documentNumber && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">No: {viewingDoc.documentNumber}</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {viewingDoc.type === 'aadhaar' && (
                  <div className="w-full max-w-sm bg-gradient-to-r from-orange-50 via-white to-emerald-50 border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden text-xs">
                    <div className="bg-gradient-to-r from-orange-400 to-emerald-600 text-white font-extrabold text-[10px] tracking-wider text-center py-2 px-3 flex items-center justify-between">
                      <span>भारत सरकार / GOVERNMENT OF INDIA</span>
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px]">Aadhaar</span>
                    </div>
                    <div className="p-4 flex gap-4 text-left">
                      <div className="h-24 w-20 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1">
                        {selectedProfile?.photo ? (
                          <img
                            src={selectedProfile.photo}
                            alt="Aadhaar Photo"
                            className="h-full w-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">No Photo</span>
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Name / नाम</p>
                          <p className="font-extrabold text-slate-800 text-xs">{viewingDoc.profileName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-450 font-bold uppercase">Date of Birth / जन्म तिथि</p>
                          <p className="font-extrabold text-slate-800">12/08/1988</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-450 font-bold uppercase">Gender / लिंग</p>
                          <p className="font-extrabold text-slate-800">Female / महिला</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex flex-col items-center justify-center">
                      <p className="font-black text-slate-800 text-base tracking-widest font-mono">
                        {viewingDoc.documentNumber || '5432 9876 1201'}
                      </p>
                      <p className="text-[9px] text-slate-450 font-extrabold tracking-wider mt-0.5">मेरा आधार, मेरी पहचान</p>
                    </div>
                  </div>
                )}

                {viewingDoc.type === 'pan' && (
                  <div className="w-full max-w-sm bg-gradient-to-b from-teal-50 to-white border-2 border-teal-600 rounded-2xl shadow-xl overflow-hidden text-xs">
                    <div className="bg-teal-700 text-white font-extrabold text-[10px] tracking-wider text-center py-2.5 px-3 flex flex-col gap-0.5">
                      <div className="flex justify-between">
                        <span>आयकर विभाग / INCOME TAX DEPARTMENT</span>
                        <span>GOVT. OF INDIA</span>
                      </div>
                      <div className="text-[8px] text-slate-200 tracking-widest text-left uppercase font-mono mt-1">Permanent Account Number Card</div>
                    </div>
                    <div className="p-4 flex gap-4 text-left">
                      <div className="space-y-3 flex-1">
                        <div>
                          <p className="text-[9px] text-teal-750 font-bold uppercase">Name / नाम</p>
                          <p className="font-extrabold text-slate-800 text-xs">{viewingDoc.profileName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-teal-750 font-bold uppercase">Father's Name</p>
                          <p className="font-extrabold text-slate-700 text-xs">Late V. Patil</p>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[9px] text-teal-750 font-bold uppercase">DOB / जन्म तिथि</p>
                            <p className="font-extrabold text-slate-800">12/08/1988</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-between shrink-0">
                        <div className="h-20 w-16 bg-slate-100 border border-slate-200 rounded overflow-hidden p-0.5">
                          {selectedProfile?.photo ? (
                            <img
                              src={selectedProfile.photo}
                              alt="PAN Photo"
                              className="h-full w-full object-cover rounded"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">No Photo</span>
                          )}
                        </div>
                        <div className="text-[10px] bg-slate-50 border border-slate-200 p-1 font-mono font-bold tracking-wider rounded mt-2">
                          {viewingDoc.documentNumber || 'BPDPA1201K'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
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
