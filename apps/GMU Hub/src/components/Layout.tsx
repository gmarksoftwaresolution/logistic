import React, { useState } from 'react';
import logoImg from '../assets/logo.png';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout = ({ children, currentPage, onNavigate }: LayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'order-management', label: 'Order Management', icon: ShoppingCart },
    { id: 'inventory-management', label: 'Inventory Management', icon: Package },
    { id: 'shg-management', label: 'Community Management', icon: Users },
    { id: 'transporter-management', label: 'Transporter Management', icon: Truck },
    { id: 'shg-demo-portal', label: 'SHG Demo Portal (Temporary)', icon: Users },
    { id: 'transporter-demo-portal', label: 'Transporter Demo Portal (Temporary)', icon: Truck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentLabel = navItems.find((i) => i.id === currentPage)?.label || 'GMU Hub';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-800">
      {/* Premium Dark Sidebar (Desktop) */}
      <aside className="hidden md:flex w-[300px] bg-[#073318] border-r border-[#073318] flex-col min-h-screen shadow-xl shrink-0 z-50 relative">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[40%] rounded-full bg-[#B2D534]/5 blur-[80px]" />
        </div>

        <div className="h-[72px] flex items-center px-6 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden p-1">
              <img src={logoImg} alt="GMU Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-white tracking-wide text-md">GMU Hub</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 relative z-10 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#B2D534] text-[#073318] shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-[#073318]' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="text-[13px] tracking-wide text-left whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 relative z-10">
          <button
            onClick={() => onNavigate('landing')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-400/10 hover:text-red-200 transition-all font-semibold text-[13px] tracking-wide cursor-pointer"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation (Slide out) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          {/* Drawer Panel */}
          <div className="relative w-64 bg-[#073318] h-full shadow-2xl flex flex-col p-5 border-r border-white/10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center p-1">
                  <img src={logoImg} alt="GMU Logo" className="h-full w-full object-contain" />
                </div>
                <span className="font-bold text-white tracking-wide text-sm">GMU Hub</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#B2D534] text-[#073318] shadow-sm font-semibold'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="text-[13px] tracking-wide text-left">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => onNavigate('landing')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-350 hover:bg-red-400/10 font-semibold text-[13px] tracking-wide cursor-pointer"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Secure Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-[#073318] capitalize">
              {currentLabel}
            </h1>
          </div>

          {/* Top Bar Search, Alerts, profile */}
          <div className="flex items-center gap-3 md:gap-5">
            {/* Topbar Search */}
            <div className="relative hidden sm:block max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Global search..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#073318]/50"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-50 rounded-full text-slate-600 relative transition-colors cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-150 flex items-center justify-between">
                    <span className="font-bold text-xs text-[#073318]">Notifications</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto text-xs text-slate-600">
                    <div className="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer">
                      <p className="font-bold text-[#073318] mb-0.5">New Order Placed</p>
                      <p className="text-slate-500">Order ORD-PICK-102 requires SHG approval.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">5 mins ago</span>
                    </div>
                    <div className="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer">
                      <p className="font-bold text-[#073318] mb-0.5">Barcode Generated</p>
                      <p className="text-slate-500">Item ORD-PICK-301 ready for storage shelving.</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">2 hours ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-[1px] bg-slate-200" />

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-[#B2D534]/20 border border-[#B2D534]/50 flex items-center justify-center text-[#073318] font-bold text-sm">
                U
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-[#073318] leading-tight">Admin User</p>
                <p className="text-[10px] text-slate-400">Warehouse Head</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
