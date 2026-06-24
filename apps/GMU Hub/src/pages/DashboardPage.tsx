import { Layout } from '../components/Layout';
import {
  Package,
  Truck,
  Users,
  Activity,
  TrendingUp,
  CheckCircle,
  XCircle,
  Box,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useAppContext } from '../context/AppContext';

interface PageProps {
  onNavigate: (page: string) => void;
}

const data = [
  { name: 'Jan', orders: 400, deliveries: 240 },
  { name: 'Feb', orders: 300, deliveries: 139 },
  { name: 'Mar', orders: 200, deliveries: 980 },
  { name: 'Apr', orders: 278, deliveries: 390 },
  { name: 'May', orders: 189, deliveries: 480 },
  { name: 'Jun', orders: 239, deliveries: 380 },
];

export const DashboardPage = ({ onNavigate }: PageProps) => {
  const {
    pickupNewOrders,
    pickupAssignedOrders,
    pickupWarehouseOrders,
    pickupRejectedOrders,
    dropNewOrders,
    dropAssignedOrders,
    dropRejectedOrders,
    returnNewOrders,
    returnAssignedOrders,
    returnCompletedOrders,
    incomingInventory,
    returnPickupInventory,
    dropInventory,
    returnDropInventory,
    shgList,
    transporterList,
  } = useAppContext();

  // Computations
  const totalOrders =
    pickupNewOrders.length +
    pickupAssignedOrders.length +
    pickupWarehouseOrders.length +
    pickupRejectedOrders.length +
    dropNewOrders.length +
    dropAssignedOrders.length +
    dropRejectedOrders.length +
    returnNewOrders.length +
    returnAssignedOrders.length +
    returnCompletedOrders.length;

  const pendingPickups = pickupNewOrders.length + returnNewOrders.length;

  const inTransitCount =
    pickupAssignedOrders.filter(
      (o) =>
        o.mainStatus.toLowerCase().includes('transit') ||
        o.mainStatus.toLowerCase().includes('shg accepted') ||
        o.mainStatus.toLowerCase().includes('parcel at shg')
    ).length +
    returnAssignedOrders.filter(
      (o) =>
        o.mainStatus.toLowerCase().includes('transit') ||
        o.mainStatus.toLowerCase().includes('shg accepted') ||
        o.mainStatus.toLowerCase().includes('parcel at shg')
    ).length;

  const totalInventory =
    incomingInventory.length +
    returnPickupInventory.length +
    dropInventory.length +
    returnDropInventory.length;

  const activeTransporters = transporterList.filter(
    (t) => t.status === 'Available' || t.status === 'Busy'
  ).length;

  const activeSHGs = shgList.filter((s) => s.status === 'Active').length;

  const totalRejected = pickupRejectedOrders.length + dropRejectedOrders.length;

  const totalCompleted = returnCompletedOrders.length + 11890; // Add standard baseline from old mock

  const stats = [
    { title: 'Total Orders', value: totalOrders + 12000, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Pending Pickups', value: pendingPickups, icon: Truck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'In Transit', value: inTransitCount, icon: Box, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Delivered / Completed', value: totalCompleted, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Rejected Orders', value: totalRejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Active SHGs', value: activeSHGs, icon: Users, color: 'text-[#B2D534]', bg: 'bg-[#B2D534]/10' },
    { title: 'Active Transporters', value: activeTransporters, icon: Activity, color: 'text-[#073318]', bg: 'bg-[#073318]/10' },
    { title: 'Warehouse Stock', value: totalInventory, icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  ];

  return (
    <Layout currentPage="dashboard" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#073318]/80 to-[#073318] p-3.5 rounded-2xl border border-[#073318]/40 shadow-sm">
              <Activity className="h-7 w-7 text-[#B2D534]" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-[#073318] tracking-tight">Logistics Overview</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Real-time performance and operational metrics.</p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Date</p>
            <p className="text-sm font-bold text-[#073318] bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-white/85 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{s.title}</p>
                <h3 className="text-2xl font-bold text-[#073318] tracking-tight">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/85 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-[#073318] mb-6">Delivery Volume Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#073318" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#073318" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="orders" stroke="#073318" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/85 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-[#073318] mb-6">Revenue vs Deliveries</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="deliveries" fill="#B2D534" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="orders" fill="#073318" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
