import React, { lazy, Suspense, useEffect } from 'react';
import { useAppContext } from './context/AppContext';

const pageLoaders = {
  landing: () => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })),
  'forgot-password': () => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })),
  dashboard: () => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })),
  'order-management': () => import('./pages/OrderManagementPage').then(m => ({ default: m.OrderManagementPage })),
  'order-history': () => import('./pages/OrderHistoryPage').then(m => ({ default: m.OrderHistoryPage })),
  'inventory-management': () => import('./pages/InventoryManagementPage').then(m => ({ default: m.InventoryManagementPage })),
  'shg-management': () => import('./pages/CommunityManagementPage').then(m => ({ default: m.CommunityManagementPage })),
  'transporter-management': () => import('./pages/TransporterManagementPage').then(m => ({ default: m.TransporterManagementPage })),
  settings: () => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })),
};

const LandingPage = lazy(pageLoaders['landing']);
const ForgotPasswordPage = lazy(pageLoaders['forgot-password']);
const DashboardPage = lazy(pageLoaders['dashboard']);
const OrderManagementPage = lazy(pageLoaders['order-management']);
const OrderHistoryPage = lazy(pageLoaders['order-history']);
const InventoryManagementPage = lazy(pageLoaders['inventory-management']);
const CommunityManagementPage = lazy(pageLoaders['shg-management']);
const TransporterManagementPage = lazy(pageLoaders['transporter-management']);
const SettingsPage = lazy(pageLoaders['settings']);

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="w-8 h-8 border-4 border-[#073318] border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const { currentPage, setCurrentPage } = useAppContext();

  useEffect(() => {
    // Pre-fetch all page chunks in background when browser is idle for 0ms instant tab switching
    const prefetchPages = () => {
      Object.values(pageLoaders).forEach(loader => {
        try {
          loader();
        } catch (e) {
          // Silent catch for network hiccups
        }
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetchPages);
    } else {
      setTimeout(prefetchPages, 1000);
    }
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem('gmu_hub_current_page', page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-full">
      <Suspense fallback={<PageLoader />}>
        {currentPage === 'landing' && (
          <LandingPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'forgot-password' && (
          <ForgotPasswordPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'dashboard' && (
          <DashboardPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'order-management' && (
          <OrderManagementPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'order-history' && (
          <OrderHistoryPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'inventory-management' && (
          <InventoryManagementPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'shg-management' && (
          <CommunityManagementPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'transporter-management' && (
          <TransporterManagementPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'settings' && (
          <SettingsPage onNavigate={handleNavigate} />
        )}
      </Suspense>
    </div>
  );
}

export default App;
