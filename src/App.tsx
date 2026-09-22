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
import { AboutPage } from './components/pages/AboutPage';
import { PrivacyPage } from './components/pages/PrivacyPage';
import { TermsPage } from './components/pages/TermsPage';

import { getUserNotificationsFromFirestore } from './lib/firestoreService';
import { Plus, X } from 'lucide-react';

function AppContent() {
  const { currentUser } = useAuth();
  const [route, setRoute] = useState<string>('home');
  const [routeParams, setRouteParams] = useState<Record<string, any>>({});
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportPickerOpen, setReportPickerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Sync with hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
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
      setRoute(path || 'home');
      setRouteParams(params);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newRoute: string, params?: Record<string, any>) => {
    setRoute(newRoute);
    setRouteParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let hash = `#${newRoute}`;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params as any).toString();
      hash += `?${qs}`;
    }
    window.location.hash = hash;
  };

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

      {/* Main Content View */}
      <main className="flex-1">
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

        {route === 'dashboard' && <DashboardPage navigate={navigate} />}

        {route === 'my-items' && (
          <MyItemsPage navigate={navigate} initialFilter={routeParams.filter || 'all'} />
        )}

        {route === 'claims' && <ClaimsPage navigate={navigate} />}

        {route === 'messages' && (
          <MessagesPage claimId={routeParams.claimId || ''} navigate={navigate} />
        )}

        {route === 'notifications' && <NotificationsPage navigate={navigate} />}

        {route === 'profile' && <ProfilePage />}

        {route === 'admin' && <AdminDashboard navigate={navigate} />}

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

      {/* Mobile Report Selection Modal */}
      {reportPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white font-display">
                Report Campus Property
              </h3>
              <button
                onClick={() => setReportPickerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setReportPickerOpen(false);
                  navigate('report-lost');
                }}
                className="w-full p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-left hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors group"
              >
                <h4 className="font-bold text-rose-700 dark:text-rose-300 text-sm">
                  I Lost Something
                </h4>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                  Report missing belongings so peers can find and return them
                </p>
              </button>

              <button
                onClick={() => {
                  setReportPickerOpen(false);
                  navigate('report-found');
                }}
                className="w-full p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors group"
              >
                <h4 className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                  I Found Something
                </h4>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  Report recovered property to match with the rightful owner
                </p>
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
