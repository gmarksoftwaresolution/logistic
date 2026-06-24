import React from 'react';

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'primary' | 'secondary';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'primary',
}) => {
  if (variant === 'primary') {
    return (
      <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200 w-full md:w-auto overflow-x-auto max-w-fit">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 capitalize whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#073318] text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Secondary sub-tab style
  return (
    <div className="flex border-b border-slate-200 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider transition-all duration-300 border-b-2 whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'border-[#073318] text-[#073318]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-[#073318]/10 text-[#073318]' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
