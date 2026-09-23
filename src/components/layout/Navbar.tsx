import React, { useState } from 'react';
import {
  Compass,
  Search,
  PlusCircle,
  Bell,
  Sun,
  Moon,
  User as UserIcon,
  Shield,
  Menu,
  X,
  LogOut,
  FolderLock,
  Layers,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { APP_NAME, APP_TAGLINE } from '../../lib/constants';

interface NavbarProps {
  activeRoute: string;
  navigate: (route: string, params?: Record<string, any>) => void;
  unreadCount: number;
  openAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRoute,
  navigate,
  unreadCount,
  openAuthModal
}) => {
  const { currentUser, profile, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleNav = (route: string) => {
    navigate(route);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo - Top Bar Contract: Single text wordmark */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-main rounded-lg group"
          >
            <span className="w-8 h-8 rounded-lg gradient-theme-bg text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm group-hover:scale-105 transition-transform duration-200">
              CF
            </span>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-display">
              {APP_NAME}
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              id="nav-home-btn"
              onClick={() => handleNav('home')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeRoute === 'home'
                  ? 'text-theme-main bg-theme-subtle font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Home
            </button>
            <button
              id="nav-search-btn"
              onClick={() => handleNav('search')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeRoute === 'search'
                  ? 'text-theme-main bg-theme-subtle font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Browse Items</span>
            </button>
            <button
              id="nav-report-lost-btn"
              onClick={() => handleNav('report-lost')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
            >
              Report Lost
            </button>
            <button
              id="nav-report-found-btn"
              onClick={() => handleNav('report-found')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            >
              Report Found
            </button>
            {currentUser && !isAdmin && (
              <button
                id="nav-dashboard-btn"
                onClick={() => handleNav('student')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeRoute === 'student' || activeRoute === 'dashboard'
                    ? 'text-theme-main bg-theme-subtle font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Student Portal
              </button>
            )}
            {isAdmin && (
              <button
                id="nav-admin-btn"
                onClick={() => handleNav('admin')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center space-x-1.5 ${
                  activeRoute === 'admin'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 font-semibold shadow-xs'
                    : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Quick 1-Click Dark/Light Mode Switcher */}
            <button
              id="theme-quick-toggle-btn"
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 touch-manipulation"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Notifications */}
            {currentUser && (
              <button
                id="navbar-notifications-btn"
                onClick={() => handleNav('notifications')}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </button>
            )}

            {/* User Avatar / Auth */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-theme-subtle text-theme-main flex items-center justify-center font-semibold text-xs overflow-hidden">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      (profile?.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                    {profile?.name || 'User'}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{profile?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile?.email}</p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 bg-theme-subtle text-theme-main uppercase">
                        {profile?.role || 'student'}
                      </span>
                    </div>

                    {!isAdmin && (
                      <button
                        onClick={() => handleNav('student')}
                        className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Student Portal</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleNav('my-items')}
                      className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <FolderLock className="w-4 h-4" />
                      <span>My Reports & Items</span>
                    </button>
                    <button
                      onClick={() => handleNav('claims')}
                      className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Claim Requests</span>
                    </button>
                    <button
                      onClick={() => handleNav('profile')}
                      className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleNav('admin')}
                        className="w-full text-left px-3 py-2 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center space-x-2"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  id="nav-signin-btn"
                  onClick={() => handleNav('login')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Sign In
                </button>
                <button
                  id="nav-register-btn"
                  onClick={() => handleNav('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl gradient-theme-bg hover:opacity-90 text-white shadow-xs transition-all"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => handleNav('home')}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </button>
          <button
            onClick={() => handleNav('search')}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Browse All Items
          </button>
          <div className="grid grid-cols-2 gap-2 pt-1 pb-1">
            <button
              onClick={() => handleNav('report-lost')}
              className="py-2 px-3 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 text-center"
            >
              Report Lost Item
            </button>
            <button
              onClick={() => handleNav('report-found')}
              className="py-2 px-3 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-center"
            >
              Report Found Item
            </button>
          </div>
          {currentUser && (
            <>
              <button
                onClick={() => handleNav('dashboard')}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNav('my-items')}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                My Items & Reports
              </button>
              <button
                onClick={() => handleNav('claims')}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Claim Verification Requests
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => handleNav('admin')}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30"
            >
              Admin Dashboard
            </button>
          )}
          <button
            onClick={() => handleNav('about')}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            About CampusFind
          </button>

          {!currentUser && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={() => handleNav('login')}
                className="w-full text-center py-2 px-3 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNav('register')}
                className="w-full text-center py-2 px-3 rounded-lg text-sm font-semibold text-white gradient-theme-bg"
              >
                Create Student Account
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
