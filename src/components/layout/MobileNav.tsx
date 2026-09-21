import React from 'react';
import { Home, Search, Plus, Bell, User } from 'lucide-react';
import { useAuth } from '../../lib/authContext';

interface MobileNavProps {
  activeRoute: string;
  navigate: (route: string) => void;
  unreadCount: number;
  openAuthModal: () => void;
  openReportModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeRoute,
  navigate,
  unreadCount,
  openAuthModal,
  openReportModal
}) => {
  const { currentUser } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <button
          id="mobile-nav-home"
          onClick={() => navigate('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeRoute === 'home'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-1">Home</span>
        </button>

        {/* Search */}
        <button
          id="mobile-nav-search"
          onClick={() => navigate('search')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeRoute === 'search'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-1">Search</span>
        </button>

        {/* Central Action: Report */}
        <div className="flex flex-col items-center justify-center flex-1">
          <button
            id="mobile-nav-report"
            onClick={openReportModal}
            className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transform -translate-y-2 active:scale-95 transition-all"
            title="Report Item"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] -mt-1 text-slate-500 dark:text-slate-400 font-medium">Report</span>
        </div>

        {/* Notifications */}
        <button
          id="mobile-nav-notifications"
          onClick={() => {
            if (!currentUser) openAuthModal();
            else navigate('notifications');
          }}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeRoute === 'notifications'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1">Alerts</span>
        </button>

        {/* Profile / Account */}
        <button
          id="mobile-nav-profile"
          onClick={() => {
            if (!currentUser) openAuthModal();
            else navigate('profile');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeRoute === 'profile' || activeRoute === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1">{currentUser ? 'Profile' : 'Sign In'}</span>
        </button>
      </div>
    </nav>
  );
};
