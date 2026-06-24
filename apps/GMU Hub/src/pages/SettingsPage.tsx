import { Layout } from '../components/Layout';
import { User, Shield, Bell, Map, Settings as SettingsIcon, Package, Target, Key } from 'lucide-react';

interface PageProps {
  onNavigate: (page: string) => void;
}

export const SettingsPage = ({ onNavigate }: PageProps) => {
  const sections = [
    { title: 'Profile Settings', icon: User, desc: 'Update admin personal information and avatar.' },
    { title: 'System Settings', icon: SettingsIcon, desc: 'Configure global variables and operational modes.' },
    { title: 'Notification Settings', icon: Bell, desc: 'Manage email, SMS, and push notification triggers.' },
    { title: 'Route Management', icon: Map, desc: 'Define and optimize transport routes and zones.' },
    { title: 'Roles & Permissions', icon: Shield, desc: 'Manage access control for warehouse staff.' },
    { title: 'Warehouse Settings', icon: Package, desc: 'Configure bin locations and capacity alerts.' },
    { title: 'Delivery Rules', icon: Target, desc: 'Set pricing, SLAs, and assignment auto-rules.' },
    { title: 'Security Settings', icon: Key, desc: 'Manage 2FA, API keys, and session timeouts.' },
  ];

  return (
    <Layout currentPage="settings" onNavigate={onNavigate}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#073318]">Global Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure and manage complete system preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {sections.map((sec, i) => (
          <div key={i} className="bg-white/85 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#B2D534]/50">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#073318] mb-5 group-hover:bg-[#B2D534] transition-colors">
              <sec.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-[#073318] mb-2">{sec.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{sec.desc}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
};
