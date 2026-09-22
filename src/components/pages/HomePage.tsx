import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Compass,
  Sparkles,
  MapPin,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileQuestion,
  TrendingUp,
  Inbox,
  Volume2
} from 'lucide-react';
import { Item, SystemSettings } from '../../types';
import { getAllItemsFromFirestore, getCampusStatisticsFromFirestore, getSystemSettingsFromFirestore } from '../../lib/firestoreService';
import { findPotentialMatches } from '../../lib/matchingEngine';
import { useAuth } from '../../lib/authContext';

interface HomePageProps {
  navigate: (route: string, params?: Record<string, any>) => void;
  openAuthModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate, openAuthModal }) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [stats, setStats] = useState({
    totalReported: 0,
    totalReturned: 0,
    activeListings: 0
  });
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [userPossibleMatches, setUserPossibleMatches] = useState<{
    lostItem: Item;
    match: Item;
    score: number;
    reasons: string[];
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);
      try {
        const [items, statsData, sysSettings] = await Promise.all([
          getAllItemsFromFirestore(),
          getCampusStatisticsFromFirestore(),
          getSystemSettingsFromFirestore()
        ]);

        setRecentItems(items.slice(0, 6));
        setStats({
          totalReported: statsData.totalReported,
          totalReturned: statsData.totalReturned,
          activeListings: statsData.activeListings
        });
        setSettings(sysSettings);

        // Calculate potential matches for current user
        if (currentUser) {
          const userLostItems = items.filter(
            i => i.reportedBy === currentUser.uid && i.type === 'lost' && i.status === 'open'
          );
          const matchesList: any[] = [];
          for (const lost of userLostItems) {
            const matches = findPotentialMatches(lost, items, 40);
            if (matches.length > 0) {
              matchesList.push({
                lostItem: lost,
                match: matches[0].candidateItem,
                score: matches[0].score,
                reasons: matches[0].reasons
              });
            }
          }
          setUserPossibleMatches(matchesList);
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, [currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('search', { query: searchQuery.trim() });
    } else {
      navigate('search');
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Official Admin Announcement Banner if configured */}
      {settings?.announcementActive && settings.announcementText && (
        <div className="bg-theme-main text-white px-4 py-2.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-xs md:text-sm font-medium">
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>{settings.announcementText}</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-8 md:pt-14 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-theme-main animate-pulse" />
          <span className="text-slate-700 dark:text-slate-200">AI-Assisted Lost & Found Network</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display leading-[1.15]">
          Lost it? <span className="text-theme-main">Find it.</span><br />
          Found it? <span className="text-emerald-600 dark:text-emerald-400">Return it.</span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          CampusFind connects students and staff with lost and found items across campus.
        </p>

        {/* Large Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-xl shadow-slate-300/30 dark:shadow-black/50 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-2 focus-within:ring-2 focus-within:ring-theme-main backdrop-blur-md transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
            <input
              id="hero-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an item... (e.g. black wallet, AirPods, keys)"
              className="w-full px-3 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button
              id="hero-search-submit-btn"
              type="submit"
              className="px-5 py-2.5 gradient-theme-bg hover:opacity-90 text-white text-sm font-semibold rounded-xl transition-all shadow-theme-glow shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="hero-lost-btn"
            onClick={() => navigate('report-lost')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 active:scale-98 transition-all flex items-center justify-center space-x-2.5"
          >
            <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <span>I Lost Something</span>
          </button>

          <button
            id="hero-found-btn"
            onClick={() => navigate('report-found')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center space-x-2.5"
          >
            <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <span>I Found Something</span>
          </button>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => navigate('report-lost')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900/50 shadow-sm hover:shadow transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Report Lost</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Let campus help locate your item</p>
          </button>

          <button
            onClick={() => navigate('report-found')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900/50 shadow-sm hover:shadow transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Report Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Turn in an item you recovered</p>
          </button>

          <button
            onClick={() => navigate('search', { type: 'lost' })}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-theme-main/50 shadow-sm hover:shadow transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-theme-subtle text-theme-main flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Browse Lost</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View items reported missing</p>
          </button>

          <button
            onClick={() => navigate('search', { type: 'found' })}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-theme-main/50 shadow-sm hover:shadow transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Browse Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">See unclaimed belongings</p>
          </button>
        </div>
      </section>

      {/* Possible Matches Banner (PRD Section 17 & 22-24) */}
      {currentUser && userPossibleMatches.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-theme-subtle shadow-md">
            <div className="flex items-center space-x-2 text-theme-main mb-3">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-base font-display">
                Possible matches for your lost items
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Our AI matching engine found potential recoveries corresponding to your reports:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPossibleMatches.map(({ lostItem, match, score, reasons }) => (
                <div
                  key={match.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-theme-subtle text-theme-main">
                        Possible Match — {score}%
                      </span>
                      <span className="text-[11px] text-slate-500">Found {match.dateOfIncident}</span>
                    </div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{match.title}</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {match.description}
                    </p>
                    <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {reasons[0]}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">For: {lostItem.title}</span>
                    <button
                      onClick={() => navigate('item-detail', { id: match.id })}
                      className="px-3 py-1 btn-theme rounded-lg text-xs font-semibold"
                    >
                      View Match
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 italic">
              AI-generated possible match. Verify ownership before claiming.
            </p>
          </div>
        </section>
      )}

      {/* Real Campus Statistics (PRD Section 18) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
          <div className="relative z-10">
            <div className="text-center sm:text-left mb-6">
              <span className="text-xs font-semibold tracking-wider uppercase text-theme-main">
                Campus Impact
              </span>
              <h3 className="text-2xl font-bold font-display mt-1">Live Campus Statistics</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time data powered by student and staff recoveries
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="block text-3xl sm:text-4xl font-extrabold text-white font-display">
                  {stats.totalReported.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1 block">
                  Items Reported
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="block text-3xl sm:text-4xl font-extrabold text-emerald-400 font-display">
                  {stats.totalReturned.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1 block">
                  Items Returned
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="block text-3xl sm:text-4xl font-extrabold text-theme-main font-display">
                  {stats.activeListings.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1 block">
                  Active Listings
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Items Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">Recent Items</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest lost and found reports across campus</p>
          </div>
          <button
            onClick={() => navigate('search')}
            className="text-xs font-semibold text-theme-main hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No items have been reported yet.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Be the first to report one.</p>
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={() => navigate('report-lost')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white"
              >
                Report Lost Item
              </button>
              <button
                onClick={() => navigate('report-found')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white"
              >
                Report Found Item
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('item-detail', { id: item.id })}
                className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all flex flex-col"
              >
                {/* Image / Placeholder */}
                <div className="h-44 bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <img
                      src={item.imageUrls[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <FileQuestion className="w-10 h-10 stroke-1" />
                      <span className="text-[11px] mt-1 font-medium">No photograph attached</span>
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 flex space-x-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-sm ${
                        item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                    >
                      {item.type}
                    </span>
                    {item.status === 'returned' && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-sm">
                        Returned
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 backdrop-blur-sm shadow-xs">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-theme-main transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-1 truncate max-w-[60%]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{item.locationName}</span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.dateOfIncident}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trust & Safety Section (PRD Section 56) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-theme-subtle text-theme-main flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Campus Trust & Safety
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guidelines for safe belongings recovery
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">Privacy by Default</h5>
              <p>
                Don't share sensitive personal info publicly. Never disclose full card numbers, cash balances, or student ID numbers on listings.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">Ownership Verification</h5>
              <p>
                Ask and answer specific identifying questions before agreeing to meet. Never hand over high-value electronics without verification.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">Official Handover Spots</h5>
              <p>
                Always arrange handovers in public, staffed campus locations such as the College Security Office or Central Reception Desk.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
