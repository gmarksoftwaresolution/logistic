import React, { lazy, Suspense } from 'react';
import { useAppContext } from './context/AppContext';

const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const OrderManagementPage = lazy(() => import('./pages/OrderManagementPage').then(m => ({ default: m.OrderManagementPage })));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage').then(m => ({ default: m.OrderHistoryPage })));
const InventoryManagementPage = lazy(() => import('./pages/InventoryManagementPage').then(m => ({ default: m.InventoryManagementPage })));
const CommunityManagementPage = lazy(() => import('./pages/CommunityManagementPage').then(m => ({ default: m.CommunityManagementPage })));
const TransporterManagementPage = lazy(() => import('./pages/TransporterManagementPage').then(m => ({ default: m.TransporterManagementPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SHGDemoPortalPage = lazy(() => import('./pages/SHGDemoPortalPage').then(m => ({ default: m.SHGDemoPortalPage })));
const TransporterDemoPortalPage = lazy(() => import('./pages/TransporterDemoPortalPage').then(m => ({ default: m.TransporterDemoPortalPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="w-8 h-8 border-4 border-[#073318] border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const { currentPage, setCurrentPage } = useAppContext();

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
        {currentPage === 'shg-demo-portal' && (
          <SHGDemoPortalPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'transporter-demo-portal' && (
          <TransporterDemoPortalPage onNavigate={handleNavigate} />
        )}
        {currentPage === 'settings' && (
          <SettingsPage onNavigate={handleNavigate} />
        )}
      </Suspense>
    </div>
  );
}

export default App;
