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
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[max(0.4rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around h-16 px-1.5 max-w-lg mx-auto">
        {/* Home */}
        <button
          id="mobile-nav-home"
          onClick={() => navigate('home')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] px-1 transition-all active:scale-95 touch-manipulation ${
            activeRoute === 'home'
              ? 'text-theme-main font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Home"
        >
          <div className="relative flex flex-col items-center">
            <Home className={`w-5 h-5 transition-transform ${activeRoute === 'home' ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-medium tracking-tight mt-0.5">Home</span>
            {activeRoute === 'home' && (
              <span className="w-1.5 h-1.5 rounded-full bg-theme-main mt-0.5" />
            )}
          </div>
        </button>

        {/* Search */}
        <button
          id="mobile-nav-search"
          onClick={() => navigate('search')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] px-1 transition-all active:scale-95 touch-manipulation ${
            activeRoute === 'search'
              ? 'text-theme-main font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Search items"
        >
          <div className="relative flex flex-col items-center">
            <Search className={`w-5 h-5 transition-transform ${activeRoute === 'search' ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-medium tracking-tight mt-0.5">Directory</span>
            {activeRoute === 'search' && (
              <span className="w-1.5 h-1.5 rounded-full bg-theme-main mt-0.5" />
            )}
          </div>
        </button>

        {/* Central Action: Report Button */}
        <div className="flex flex-col items-center justify-center flex-1 px-1">
          <button
            id="mobile-nav-report"
            onClick={openReportModal}
            className="w-12 h-12 rounded-full gradient-theme-bg text-white flex items-center justify-center shadow-lg shadow-theme-glow transform -translate-y-3 active:scale-90 transition-transform touch-manipulation ring-4 ring-white dark:ring-slate-900"
            title="Report Item"
            aria-label="Report lost or found item"
          >
            <Plus className="w-6 h-6 stroke-[2.75]" />
          </button>
          <span className="text-[10px] -mt-2 text-slate-600 dark:text-slate-300 font-bold tracking-tight">Report</span>
        </div>

        {/* Notifications */}
        <button
          id="mobile-nav-notifications"
          onClick={() => {
            if (!currentUser) openAuthModal();
            else navigate('notifications');
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] px-1 transition-all active:scale-95 touch-manipulation ${
            activeRoute === 'notifications'
              ? 'text-theme-main font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Notifications"
        >
          <div className="relative flex flex-col items-center">
            <div className="relative">
              <Bell className={`w-5 h-5 transition-transform ${activeRoute === 'notifications' ? 'scale-110' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </div>
            <span className="text-[11px] font-medium tracking-tight mt-0.5">Alerts</span>
            {activeRoute === 'notifications' && (
              <span className="w-1.5 h-1.5 rounded-full bg-theme-main mt-0.5" />
            )}
          </div>
        </button>

        {/* Profile / Account */}
        <button
          id="mobile-nav-profile"
          onClick={() => {
            if (!currentUser) openAuthModal();
            else navigate('profile');
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] px-1 transition-all active:scale-95 touch-manipulation ${
            activeRoute === 'profile' || activeRoute === 'dashboard'
              ? 'text-theme-main font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label={currentUser ? 'User profile' : 'Sign in'}
        >
          <div className="relative flex flex-col items-center">
            <User className={`w-5 h-5 transition-transform ${activeRoute === 'profile' || activeRoute === 'dashboard' ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-medium tracking-tight mt-0.5">{currentUser ? 'Account' : 'Sign In'}</span>
            {(activeRoute === 'profile' || activeRoute === 'dashboard') && (
              <span className="w-1.5 h-1.5 rounded-full bg-theme-main mt-0.5" />
            )}
          </div>
        </button>
      </div>
    </nav>
  );
};
