
import { Home, Flame, MessagesSquare, User, ScanBarcode } from 'lucide-react';

export const Navbar = ({ activeTab, onTabChange }) => {
  const leftTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'hype', label: 'Hype', icon: Flame },
  ];
  const rightTabs = [
    { id: 'community', label: 'Feed', icon: MessagesSquare },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderTab = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-300 ${
          isActive
            ? 'text-emerald-600 bg-emerald-50/50 scale-105'
            : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/30'
        }`}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
        <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe z-50">
      <div className="max-w-md mx-auto relative px-4">
        {/* FAB Button */}
        <div className="absolute left-1/2 -top-6 transform -translate-x-1/2 z-50">
          <button
            onClick={() => onTabChange('scanner')}
            className={`flex items-center justify-center w-14 h-14 bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(5,150,105,0.4)] hover:bg-emerald-500 hover:scale-105 animate-pulse-gentle squircle ${
              activeTab === 'scanner' ? 'ring-4 ring-emerald-100 scale-105' : ''
            }`}
          >
            <ScanBarcode size={26} strokeWidth={2} />
          </button>
        </div>

        <div className="flex justify-between items-center h-16 pt-1">
          <div className="flex gap-2">
            {leftTabs.map(renderTab)}
          </div>
          {/* Center spacer for FAB */}
          <div className="w-16"></div>
          <div className="flex gap-2">
            {rightTabs.map(renderTab)}
          </div>
        </div>
      </div>
    </nav>
  );
};
