import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './lib/themeContext';
import { AuthProvider, useAuth } from './lib/authContext';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/common/AuthModal';

import { HomePage } from './components/pages/HomePage';
import { SearchPage } from './components/pages/SearchPage';
import { ReportItemPage } from './components/pages/ReportItemPage';
import { ItemDetailPage } from './components/pages/ItemDetailPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { MyItemsPage } from './components/pages/MyItemsPage';
import { ClaimsPage } from './components/pages/ClaimsPage';
import { MessagesPage } from './components/pages/MessagesPage';
import { NotificationsPage } from './components/pages/NotificationsPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { AdminDashboard } from './components/pages/AdminDashboard';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { ForgotPasswordPage } from './components/pages/ForgotPasswordPage';
import { VerifyEmailPage } from './components/pages/VerifyEmailPage';
import { UnauthorizedPage } from './components/pages/UnauthorizedPage';
import { AboutPage } from './components/pages/AboutPage';
import { PrivacyPage } from './components/pages/PrivacyPage';
import { TermsPage } from './components/pages/TermsPage';

import { AuthGatePage } from './components/pages/AuthGatePage';
import { getUserNotificationsFromFirestore } from './lib/firestoreService';
import { Plus, X, Search, CheckCircle2, GraduationCap } from 'lucide-react';

function AppContent() {
  const { currentUser, isAdmin, loading } = useAuth();
  const [route, setRoute] = useState<string>('home');
  const [routeParams, setRouteParams] = useState<Record<string, any>>({});
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportPickerOpen, setReportPickerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Fast loading safety: Ensure the interface unblocks immediately (within max 350ms)
  const [fastSessionReady, setFastSessionReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFastSessionReady(true);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Sync with hash
  useEffect(() => {
    const handleHashChange = () => {
      let hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) {
        const pathPart = window.location.pathname.replace(/^\//, '');
        if (pathPart === 'admin' || pathPart === 'student' || pathPart === 'dashboard') {
          hash = pathPart;
        }
      }
      if (!hash) {
        setRoute('home');
        setRouteParams({});
        return;
      }
      const [path, queryStr] = hash.split('?');
      const params: Record<string, string> = {};
      if (queryStr) {
        const searchParams = new URLSearchParams(queryStr);
        searchParams.forEach((v, k) => {
          params[k] = v;
        });
      }
      const cleanPath = (path || 'home').replace(/^\//, '');
      setRoute(cleanPath);
      setRouteParams(params);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newRoute: string, params?: Record<string, any>) => {
    const cleanRoute = newRoute.replace(/^\//, '');
    setRoute(cleanRoute);
    setRouteParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let hash = `#/${cleanRoute}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params as any).toString();
      hash += `?${qs}`;
    }
    window.location.hash = hash;
  };

  // Redirect logged-in user away from login/register, and ensure admin goes to /admin and not /dashboard or /student
  useEffect(() => {
    if (loading) return;
    if (currentUser) {
      if (isAdmin && (route === 'login' || route === 'register' || route === 'dashboard' || route === 'student')) {
        navigate('admin');
      } else if (!isAdmin && (route === 'login' || route === 'register')) {
        navigate('student');
      }
    }
  }, [currentUser, isAdmin, route, loading]);

  // Poll or load notifications for badge
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    async function checkNotifications() {
      if (!currentUser) return;
      try {
        const notifs = await getUserNotificationsFromFirestore(currentUser.uid);
        const unread = notifs.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (e) {
        // quiet fallback
      }
    }

    checkNotifications();
    const interval = setInterval(checkNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser, route]);

  // 1. Initial auth state loading screen - only shown during the brief initial moment (<350ms)
  if (loading && !fastSessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="text-xs font-semibold tracking-wide uppercase text-slate-400">
            Checking campus session...
          </div>
        </div>
      </div>
    );
  }

  // 2. Authentication Gate: Users MUST see login and signup options before accessing the interface
  if (!currentUser) {
    if (route === 'forgot-password') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
          <ForgotPasswordPage navigate={navigate} />
        </div>
      );
    }

    if (route === 'verify-email') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
          <VerifyEmailPage navigate={navigate} />
        </div>
      );
    }

    if (route === 'about') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
            <button
              onClick={() => navigate('login')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              &larr; Back to Login / Sign Up
            </button>
          </div>
          <AboutPage navigate={navigate} />
        </div>
      );
    }

    if (route === 'privacy') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
            <button
              onClick={() => navigate('login')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              &larr; Back to Login / Sign Up
            </button>
          </div>
          <PrivacyPage navigate={navigate} />
        </div>
      );
    }

    if (route === 'terms') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
            <button
              onClick={() => navigate('login')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              &larr; Back to Login / Sign Up
            </button>
          </div>
          <TermsPage navigate={navigate} />
        </div>
      );
    }

    // Default unauthenticated view: Present Login and Sign Up options
    return (
      <AuthGatePage
        navigate={navigate}
        initialMode={route === 'register' ? 'register' : 'login'}
        intendedRoute={route !== 'login' && route !== 'register' && route !== 'home' ? route : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors selection:bg-blue-600 selection:text-white relative">
      {/* Ambient dynamic theme lighting */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="absolute -top-36 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full blur-3xl opacity-20 dark:opacity-25 transition-all duration-700"
          style={{ background: 'var(--theme-primary)' }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[500px] h-[350px] rounded-full blur-3xl opacity-15 dark:opacity-15 transition-all duration-700"
          style={{ background: 'var(--theme-accent)' }}
        />
      </div>

      {/* Top Navbar */}
      <Navbar
        activeRoute={route}
        navigate={navigate}
        unreadCount={unreadCount}
        openAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Main Content View with mobile safe bottom clearance */}
      <main className="flex-1 pb-24 md:pb-8">
        {route === 'home' && (
          <HomePage navigate={navigate} openAuthModal={() => setAuthModalOpen(true)} />
        )}

        {route === 'search' && (
          <SearchPage
            navigate={navigate}
            initialQuery={routeParams.query || ''}
            initialType={routeParams.type || 'all'}
          />
        )}

        {route === 'report-lost' && (
          <ReportItemPage
            initialType="lost"
            navigate={navigate}
            openAuthModal={() => setAuthModalOpen(true)}
          />
        )}

        {route === 'report-found' && (
          <ReportItemPage
            initialType="found"
            navigate={navigate}
            openAuthModal={() => setAuthModalOpen(true)}
          />
        )}

        {route === 'item-detail' && (
          <ItemDetailPage
            itemId={routeParams.id || ''}
            navigate={navigate}
            openAuthModal={() => setAuthModalOpen(true)}
          />
        )}

        {(route === 'dashboard' || route === 'student') && <DashboardPage navigate={navigate} />}

        {route === 'my-items' && (
          <MyItemsPage navigate={navigate} initialFilter={routeParams.filter || 'all'} />
        )}

        {route === 'claims' && <ClaimsPage navigate={navigate} />}

        {route === 'messages' && (
          <MessagesPage claimId={routeParams.claimId || ''} navigate={navigate} />
        )}

        {route === 'notifications' && <NotificationsPage navigate={navigate} />}

        {route === 'profile' && <ProfilePage />}

        {route === 'login' && <LoginPage navigate={navigate} />}

        {route === 'register' && <RegisterPage navigate={navigate} />}

        {route === 'forgot-password' && <ForgotPasswordPage navigate={navigate} />}

        {route === 'verify-email' && <VerifyEmailPage navigate={navigate} />}

        {route === 'unauthorized' && <UnauthorizedPage navigate={navigate} />}

        {route === 'admin' && (
          isAdmin ? <AdminDashboard navigate={navigate} /> : <UnauthorizedPage navigate={navigate} />
        )}

        {route === 'about' && <AboutPage navigate={navigate} />}

        {route === 'privacy' && <PrivacyPage navigate={navigate} />}

        {route === 'terms' && <TermsPage navigate={navigate} />}
      </main>

      {/* Footer */}
      <Footer navigate={navigate} />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeRoute={route}
        navigate={navigate}
        unreadCount={unreadCount}
        openAuthModal={() => setAuthModalOpen(true)}
        openReportModal={() => setReportPickerOpen(true)}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Mobile Report Selection Bottom Sheet */}
      {reportPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          {/* Backdrop click to dismiss */}
          <div className="fixed inset-0" onClick={() => setReportPickerOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200">
            {/* Native Mobile Sheet Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white font-display">
                Report Campus Property
              </h3>
              <button
                onClick={() => setReportPickerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                id="mobile-sheet-report-lost"
                onClick={() => {
                  setReportPickerOpen(false);
                  navigate('report-lost');
                }}
                className="w-full p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 text-left hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-[0.98] group flex items-start space-x-3.5 touch-manipulation min-h-[64px]"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Search className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-rose-700 dark:text-rose-300 text-sm">
                    I Lost Something
                  </h4>
                  <p className="text-xs text-rose-600/90 dark:text-rose-400/90 mt-0.5 leading-snug">
                    Report missing belongings so peers can find and return them
                  </p>
                </div>
              </button>

              <button
                id="mobile-sheet-report-found"
                onClick={() => {
                  setReportPickerOpen(false);
                  navigate('report-found');
                }}
                className="w-full p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/70 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-[0.98] group flex items-start space-x-3.5 touch-manipulation min-h-[64px]"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    I Found Something
                  </h4>
                  <p className="text-xs text-emerald-600/90 dark:text-emerald-400/90 mt-0.5 leading-snug">
                    Report recovered property to match with the rightful owner
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
