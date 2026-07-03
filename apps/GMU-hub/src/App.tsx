import { LandingPage } from './pages/LandingPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrderManagementPage } from './pages/OrderManagementPage';
import { InventoryManagementPage } from './pages/InventoryManagementPage';
import { CommunityManagementPage } from './pages/CommunityManagementPage';
import { TransporterManagementPage } from './pages/TransporterManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { SHGDemoPortalPage } from './pages/SHGDemoPortalPage';
import { TransporterDemoPortalPage } from './pages/TransporterDemoPortalPage';
import { useAppContext } from './context/AppContext';

function App() {
  const { currentPage, setCurrentPage } = useAppContext();

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem('gmu_hub_current_page', page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-full">
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
    </div>
  );
}

export default App;
